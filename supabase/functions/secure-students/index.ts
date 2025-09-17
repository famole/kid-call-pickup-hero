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
const SENSITIVE_STUDENT_FIELDS = ['name'];

async function getEncryptionKey() {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
  return key;
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
    try {
      return JSON.parse(encryptedString); // Try parsing original if decryption fails
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
    const { operation, data, includeDeleted = false } = await req.json();
    console.log('Secure students operation:', operation);

    switch (operation) {
      case 'getStudents': {
        let query = supabase
          .from('students')
          .select(`
            id,
            name,
            class_id,
            avatar,
            created_at,
            updated_at,
            deleted_at
          `);
        
        if (!includeDeleted) {
          query = query.is('deleted_at', null);
        }
        
        const { data: studentsData, error } = await query.order('name');
        
        if (error) {
          console.error('Error fetching students:', error);
          throw error;
        }

        // Return encrypted data to client
        const encryptedStudentsData = await encryptObject(studentsData || []);
        return new Response(JSON.stringify({ data: { encrypted_data: encryptedStudentsData }, error: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'createStudent': {
        // Decrypt entire object received from client
        const decryptedData = await decryptObject(data.encrypted_data);
        
        const { data: studentData, error } = await supabase
          .from('students')
          .insert(decryptedData)
          .select();
        
        if (error) {
          console.error('Error creating student:', error);
          throw error;
        }

        // Return encrypted data to client
        const encryptedCreateData = await encryptObject(studentData || []);
        return new Response(JSON.stringify({ data: { encrypted_data: encryptedCreateData }, error: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'updateStudent': {
        const { studentId, encrypted_data } = data;
        
        // Decrypt entire object received from client
        const decryptedData = await decryptObject(encrypted_data);
        
        const { data: studentData, error } = await supabase
          .from('students')
          .update(decryptedData)
          .eq('id', studentId)
          .select();
        
        if (error) {
          console.error('Error updating student:', error);
          throw error;
        }

        // Return encrypted data to client
        const encryptedUpdateData = await encryptObject(studentData || []);
        return new Response(JSON.stringify({ data: { encrypted_data: encryptedUpdateData }, error: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

  } catch (error) {
    console.error('Error in secure-students function:', error);
    return new Response(JSON.stringify({ data: null, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});