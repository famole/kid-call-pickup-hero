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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
          // Get pickup requests for specific parent
          const { data: requests, error } = await supabase.rpc('get_pickup_requests_for_parent', {
            p_parent_id: parentId
          });
          
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

      case 'createPickupRequest': {
        const decryptedData = await decryptObject(data);
        const { studentId } = decryptedData;
        
        // Create pickup request using secure function
        const { data: requestId, error } = await supabase.rpc('create_pickup_request_secure', {
          p_student_id: studentId
        });
        
        if (error) {
          throw error;
        }
        
        // Fetch the created request
        const { data: requestData, error: fetchError } = await supabase
          .from('pickup_requests')
          .select('*')
          .eq('id', requestId)
          .single();
        
        if (fetchError) {
          throw fetchError;
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
        // Get all pickup requests that affect the current parent's children
        const { data: parentId, error: parentError } = await supabase.rpc('get_current_parent_id');

        if (parentError || !parentId) {
          return new Response(
            JSON.stringify({ data: { encrypted_data: await encryptObject([]) }, error: null }),
            { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
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

        // Get all active pickup requests for these children  
        const { data: requests, error: requestsError } = await supabase
          .from('pickup_requests')
          .select('*')
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