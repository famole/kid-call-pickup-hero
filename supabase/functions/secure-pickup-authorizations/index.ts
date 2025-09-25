import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Encryption utilities - fallback to default key if env var not set
const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY') ?? 'U9.#s!_So2*';

async function getEncryptionKey() {
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

async function encryptData(data: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);
    
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
    return data; // Return original data if encryption fails
  }
}

async function decryptData(encryptedData: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
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

    return new TextDecoder().decode(decryptedData);
  } catch (error) {
    console.error('Decryption failed:', error);
    return encryptedData; // Return original if decryption fails
  }
}

async function encryptObject(obj: any): Promise<string> {
  try {
    const jsonString = JSON.stringify(obj);
    return await encryptData(jsonString);
  } catch (error) {
    console.error('Object encryption failed:', error);
    return JSON.stringify(obj); // Return original if encryption fails
  }
}

async function decryptObject(encryptedString: string): Promise<any> {
  try {
    const decryptedString = await decryptData(encryptedString);
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Object decryption failed:', error);
    return JSON.parse(encryptedString); // Return original if decryption fails
  }
}

// Validate user authentication
async function validateAuthentication(req: Request): Promise<boolean> {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('No authorization header found');
      return false;
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      console.error('No token found in authorization header');
      return false;
    }

    // Create a new supabase client with the service role key and user's token
    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: {
            authorization: `Bearer ${token}`,
          },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        }
      }
    );
    
    // Verify the token is valid
    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Failed to authenticate user:', userError);
      return false;
    }

    console.log('Authenticated user:', user.id);
    return true;
  } catch (error) {
    console.error('Error in validateAuthentication:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Secure pickup authorizations function started - v2.1');
    
    const { operation, data: requestData, parentId } = await req.json();
    console.log('Operation:', operation, 'Parent ID:', parentId);
    console.log('Full request body:', { operation, parentId, hasData: !!requestData });

    // Validate authentication
    const isAuthenticated = await validateAuthentication(req);
    if (!isAuthenticated) {
      console.error('Authentication failed');
      return new Response(JSON.stringify({ 
        data: null, 
        error: 'Authentication required' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!parentId) {
      console.error('Parent ID is required');
      return new Response(JSON.stringify({ 
        data: null, 
        error: 'Parent ID is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    switch (operation) {
      case 'getPickupAuthorizationsForParent': {
        console.log('Getting pickup authorizations for parent:', parentId);
        
        const { data, error } = await supabase
          .from('pickup_authorizations')
          .select(`
            *,
            authorizing_parent:parents!authorizing_parent_id (id, name, email, role),
            authorized_parent:parents!authorized_parent_id (id, name, email, role)
          `)
          .eq('authorizing_parent_id', parentId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching pickup authorizations:', error);
          throw new Error(error.message);
        }

        // Get student details for each authorization
        const authorizations = await Promise.all(
          data.map(async (auth) => {
            const { data: studentData } = await supabase
              .from('students')
              .select('id, name')
              .eq('id', auth.student_id)
              .single();

            return {
              ...auth,
              student: studentData
            };
          })
        );

        const encryptedData = await encryptObject(authorizations);
        console.log('Successfully fetched and encrypted pickup authorizations');
        
        return new Response(JSON.stringify({ 
          data: { encrypted_data: encryptedData }, 
          error: null 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getPickupAuthorizationsForAuthorizedParent': {
        let decryptedData;
        try {
          decryptedData = await decryptObject(requestData);
        } catch (error) {
          console.error('Failed to decrypt request data:', error);
          throw new Error('Invalid request data format');
        }
        
        const targetParentId = decryptedData.parentId || parentId;
        console.log('Getting pickup authorizations for authorized parent:', targetParentId);

        const { data, error } = await supabase
          .from('pickup_authorizations')
          .select(`
            *,
            authorizing_parent:parents!authorizing_parent_id (id, name, email),
            students (id, name)
          `)
          .eq('authorized_parent_id', targetParentId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching pickup authorizations for authorized parent:', error);
          throw new Error(error.message);
        }

        const encryptedData = await encryptObject(data);
        console.log('Successfully fetched and encrypted authorized pickup authorizations');
        
        return new Response(JSON.stringify({ 
          data: { encrypted_data: encryptedData }, 
          error: null 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'createPickupAuthorization': {
        let decryptedData;
        try {
          decryptedData = await decryptObject(requestData);
        } catch (error) {
          console.error('Failed to decrypt request data:', error);
          throw new Error('Invalid request data format');
        }

        console.log('Creating pickup authorization');

        const { data, error } = await supabase
          .from('pickup_authorizations')
          .insert({
            authorizing_parent_id: parentId,
            authorized_parent_id: decryptedData.authorizedParentId,
            student_id: decryptedData.studentId,
            start_date: decryptedData.startDate,
            end_date: decryptedData.endDate,
            allowed_days_of_week: decryptedData.allowedDaysOfWeek,
            is_active: true
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating pickup authorization:', error);
          throw new Error(error.message);
        }

        const encryptedData = await encryptObject(data);
        console.log('Successfully created and encrypted pickup authorization');
        
        return new Response(JSON.stringify({ 
          data: { encrypted_data: encryptedData }, 
          error: null 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'updatePickupAuthorization': {
        let decryptedData;
        try {
          decryptedData = await decryptObject(requestData);
        } catch (error) {
          console.error('Failed to decrypt request data:', error);
          throw new Error('Invalid request data format');
        }

        console.log('Updating pickup authorization:', decryptedData.id);

        const updateData: any = {};
        if (decryptedData.authorizedParentId) updateData.authorized_parent_id = decryptedData.authorizedParentId;
        if (decryptedData.studentId) updateData.student_id = decryptedData.studentId;
        if (decryptedData.startDate) updateData.start_date = decryptedData.startDate;
        if (decryptedData.endDate) updateData.end_date = decryptedData.endDate;
        if (decryptedData.allowedDaysOfWeek) updateData.allowed_days_of_week = decryptedData.allowedDaysOfWeek;
        if (decryptedData.isActive !== undefined) updateData.is_active = decryptedData.isActive;
        
        updateData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
          .from('pickup_authorizations')
          .update(updateData)
          .eq('id', decryptedData.id)
          .eq('authorizing_parent_id', parentId) // Ensure only authorizing parent can update
          .select()
          .single();

        if (error) {
          console.error('Error updating pickup authorization:', error);
          throw new Error(error.message);
        }

        const encryptedData = await encryptObject(data);
        console.log('Successfully updated and encrypted pickup authorization');
        
        return new Response(JSON.stringify({ 
          data: { encrypted_data: encryptedData }, 
          error: null 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'deletePickupAuthorization': {
        let decryptedData;
        try {
          decryptedData = await decryptObject(requestData);
        } catch (error) {
          console.error('Failed to decrypt request data:', error);
          throw new Error('Invalid request data format');
        }

        console.log('Deleting pickup authorization:', decryptedData.id);

        const { error } = await supabase
          .from('pickup_authorizations')
          .delete()
          .eq('id', decryptedData.id)
          .eq('authorizing_parent_id', parentId); // Ensure only authorizing parent can delete

        if (error) {
          console.error('Error deleting pickup authorization:', error);
          throw new Error(error.message);
        }

        console.log('Successfully deleted pickup authorization');
        
        return new Response(JSON.stringify({ 
          data: { success: true }, 
          error: null 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getAvailableParentsForAuthorization': {
        console.log('Getting available parents for authorization');

        // Get all students associated with the current parent
        const { data: currentParentStudents, error: studentsError } = await supabase
          .from('student_parents')
          .select('student_id')
          .eq('parent_id', parentId);

        if (studentsError) {
          console.error('Error fetching current parent students:', studentsError);
          throw new Error(studentsError.message);
        }

        const studentIds = currentParentStudents?.map(sp => sp.student_id) || [];

        // Get ALL parents in the school (excluding current parent)
        const { data: allParents, error: parentsError } = await supabase
          .from('parents')
          .select('id, name, email, role')
          .neq('id', parentId);

        if (parentsError) {
          console.error('Error fetching all parents:', parentsError);
          throw new Error(parentsError.message);
        }

        // Get shared student relationships for display purposes
        const sharedStudents: Record<string, string[]> = {};
        
        if (studentIds.length > 0) {
          const { data: sharedParentRelations, error: sharedError } = await supabase
            .from('student_parents')
            .select('parent_id, student_id')
            .in('student_id', studentIds)
            .neq('parent_id', parentId);

          if (!sharedError && sharedParentRelations) {
            // Group shared students by parent
            for (const relation of sharedParentRelations) {
              const parentId = relation.parent_id;
              if (!sharedStudents[parentId]) {
                sharedStudents[parentId] = [];
              }
              sharedStudents[parentId].push(relation.student_id);
            }
          }
        }

        const result = {
          parents: allParents || [],
          sharedStudents
        };

        const encryptedData = await encryptObject(result);
        console.log('Successfully fetched and encrypted available parents');
        
        return new Response(JSON.stringify({ 
          data: { encrypted_data: encryptedData }, 
          error: null 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

  } catch (error) {
    console.error('Error in secure-pickup-authorizations function:', error);
    return new Response(JSON.stringify({ data: null, error: error instanceof Error ? error.message : 'An error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});