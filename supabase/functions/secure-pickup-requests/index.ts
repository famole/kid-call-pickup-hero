import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Encryption configuration
const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY') || 'U9.#s!_So2*';
const SENSITIVE_FIELDS = ['id', 'student_id', 'parent_id'];

// Generate encryption key using PBKDF2 (same method as client)
async function getEncryptionKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(ENCRYPTION_KEY),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('upsy-secure-salt-2024'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// Encrypt data
async function encryptData(data: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encodedData = encoder.encode(data);
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedData), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

// Decrypt data
async function decryptData(encryptedData: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const decoder = new TextDecoder();
    
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );
    
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

// Encrypt object
async function encryptObject(obj: any): Promise<string> {
  return await encryptData(JSON.stringify(obj));
}

// Decrypt object
async function decryptObject(encryptedString: string): Promise<any> {
  try {
    const decryptedString = await decryptData(encryptedString);
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Decryption or parsing failed:', error);
    // Return as-is if decryption fails (for backwards compatibility)
    try {
      return JSON.parse(encryptedString);
    } catch {
      return encryptedString; // Return string if JSON parsing fails
    }
  }
}

// Define types for the request body
interface CancelPickupRequestPayload {
  requestId: string;
  parentId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header for user authentication
    const authHeader = req.headers.get('Authorization');
    
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return new Response(
        JSON.stringify({ data: null, error: 'Invalid request body' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { operation, data } = requestBody;
    console.log('Secure pickup requests operation:', operation);

    switch (operation) {
      case 'getPickupRequests': {
        const { parentId } = data || {};
        
        let pickupRequests;
        if (parentId) {
          // Get pickup requests for specific parent - direct query instead of RPC
          const { data: requests, error } = await supabase
            .from('pickup_requests')
            .select('*')
            .eq('parent_id', parentId)
            .in('status', ['pending', 'called']);
          
          if (error) {
            throw error;
          }
          pickupRequests = requests || [];
        } else {
          // Get all active pickup requests
          const { data: requests, error } = await supabase
            .from('pickup_requests')
            .select('*')
            .in('status', ['pending', 'called']);
          
          if (error) {
            throw error;
          }
          pickupRequests = requests || [];
        }

        // Encrypt the pickup requests data
        const encryptedData = await encryptObject(pickupRequests);
        
        return new Response(
          JSON.stringify({ data: { encrypted_data: encryptedData }, error: null }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      case 'cancelPickupRequest': {
        // Decrypt the request data
        let decryptedData;
        try {
          decryptedData = await decryptObject(data);
          console.log('Decrypted cancel request data:', decryptedData);
          console.log('Type of decryptedData:', typeof decryptedData);
          
          // Ensure it's parsed as object if it came through as string
          if (typeof decryptedData === 'string') {
            console.log('Decrypted data is string, parsing...');
            decryptedData = JSON.parse(decryptedData);
          }
        } catch (error) {
          console.error('Error decrypting request data:', error);
          throw new Error('Invalid request data');
        }

        const { requestId, parentId } = decryptedData;
        console.log('Extracted requestId:', requestId, 'parentId:', parentId);
        
        if (!requestId) {
          throw new Error('Request ID is required');
        }
        
        console.log(`Canceling pickup request ${requestId} for parent ${parentId || 'authenticated user'}`);
        
        // First, verify the parent has permission to cancel this request
        const { data: request, error: fetchError } = await supabase
          .from('pickup_requests')
          .select('*')
          .eq('id', requestId)
          .single();
          
        if (fetchError) {
          console.error('Error fetching pickup request:', fetchError);
          throw new Error('Failed to fetch pickup request');
        }
        
        // Verify ownership - either match the parent_id or be an admin/superadmin
        // Create a client with the user's JWT to get user info
        let isAdmin = false;
        
        if (authHeader) {
          const token = authHeader.replace('Bearer ', '');
          const userClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
              global: {
                headers: {
                  Authorization: authHeader
                }
              }
            }
          );
          
          const { data: { user } } = await userClient.auth.getUser(token);
          
          // Check if user has admin or superadmin role from parents table
          if (user?.email) {
            const { data: parentData } = await supabase
              .from('parents')
              .select('role')
              .eq('email', user.email)
              .single();
            
            isAdmin = parentData?.role === 'admin' || parentData?.role === 'superadmin';
            console.log(`User ${user.email} admin status: ${isAdmin}`);
          }
        }
        
        if (!isAdmin && parentId && request.parent_id !== parentId) {
          console.error(`Parent ${parentId} is not authorized to cancel request ${requestId}`);
          throw new Error('Not authorized to cancel this pickup request');
        }
        
        // Cancel the request
        const { data: updatedRequest, error: updateError } = await supabase
          .from('pickup_requests')
          .update({ 
            status: 'cancelled'
          })
          .eq('id', requestId)
          .select('*')
          .single();
          
        if (updateError) {
          console.error('Error canceling pickup request:', updateError);
          throw new Error('Failed to cancel pickup request');
        }
        
        console.log(`Successfully canceled pickup request ${requestId}`);
        
        return new Response(
          JSON.stringify({ 
            data: { 
              success: true,
              request: updatedRequest
            }, 
            error: null 
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      case 'createPickupRequest': {
        let decryptedData = await decryptObject(data);
        console.log('Decrypted create request data:', decryptedData);
        console.log('Type of decryptedData:', typeof decryptedData);
        
        // Ensure it's parsed as object if it came through as string
        if (typeof decryptedData === 'string') {
          console.log('Decrypted data is string, parsing...');
          decryptedData = JSON.parse(decryptedData);
        }
        
        const { studentId, parentId } = decryptedData;
        console.log('Extracted studentId:', studentId, 'parentId:', parentId);
        
        if (!parentId) {
          throw new Error('Parent ID is required');
        }
        
        // Create pickup request directly
        const { data: requestData, error } = await supabase
          .from('pickup_requests')
          .insert({
            student_id: studentId,
            parent_id: parentId,
            status: 'pending',
            request_time: new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) {
          throw error;
        }

        // Encrypt the response data
        const encryptedResult = await encryptObject(requestData);
        
        return new Response(
          JSON.stringify({ data: { encrypted_data: encryptedResult }, error: null }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      case 'getParentAffectedRequests': {
        // Decrypt the request data
        let decryptedData;
        try {
          decryptedData = await decryptObject(data);
          console.log('Decrypted parent affected requests data:', decryptedData);
          console.log('Type of decryptedData:', typeof decryptedData);
          
          // Ensure it's parsed as object if it came through as string
          if (typeof decryptedData === 'string') {
            console.log('Decrypted data is string, parsing...');
            decryptedData = JSON.parse(decryptedData);
          }
        } catch (error) {
          console.error('Error decrypting request data:', error);
          throw new Error('Invalid request data');
        }

        const { parentId } = decryptedData;
        console.log('Extracted parentId:', parentId);
        
        if (!parentId) {
          throw new Error('Parent ID is required');
        }

        // Get all children this parent can see (own children + authorized children)
        const [ownChildren, authorizedChildren] = await Promise.all([
          // Own children
          supabase
            .from('student_parents')
            .select('student_id')
            .eq('parent_id', parentId),
          
          // Children they're authorized to pick up
          supabase
            .from('pickup_authorizations')
            .select('student_id')
            .eq('authorized_parent_id', parentId)
            .eq('is_active', true)
            .lte('start_date', new Date().toISOString().split('T')[0])
            .gte('end_date', new Date().toISOString().split('T')[0])
        ]);

        if (ownChildren.error || authorizedChildren.error) {
          throw ownChildren.error || authorizedChildren.error;
        }

        // Combine all student IDs
        const allStudentIds = [
          ...(ownChildren.data?.map(sp => sp.student_id) || []),
          ...(authorizedChildren.data?.map(auth => auth.student_id) || [])
        ];

        // Remove duplicates
        const uniqueStudentIds = [...new Set(allStudentIds)];

        if (uniqueStudentIds.length === 0) {
          return new Response(
            JSON.stringify({ data: { encrypted_data: await encryptObject([]) }, error: null }),
            { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        // Get all active pickup requests for these children with parent info
        const { data: requests, error: requestsError } = await supabase
          .from('pickup_requests')
          .select(`
            *,
            parents (
              id,
              name,
              email
            )
          `)
          .in('student_id', uniqueStudentIds)
          .in('status', ['pending', 'called']);

        if (requestsError) {
          throw requestsError;
        }

        // Encrypt the response data
        const encryptedResult = await encryptObject(requests || []);
        
        return new Response(
          JSON.stringify({ data: { encrypted_data: encryptedResult }, error: null }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      default:
        return new Response(
          JSON.stringify({ data: null, error: 'Invalid operation' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
    }
  } catch (error) {
    console.error('Error in secure pickup requests function:', error);
    return new Response(
      JSON.stringify({ 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});