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

        // Fetch parent IDs for all students
        const studentIds = (studentsData || []).map(s => s.id);
        console.log(`Fetching parent relationships for ${studentIds.length} students`);
        
        const { data: parentRelations, error: parentError } = await supabase
          .from('student_parents')
          .select('student_id, parent_id')
          .in('student_id', studentIds);
        
        if (parentError) {
          console.error('Error fetching parent relationships:', parentError);
        }
        
        console.log(`Found ${(parentRelations || []).length} parent-student relationships`);
        
        // Group parent IDs by student ID
        const parentsByStudent = (parentRelations || []).reduce((acc, rel) => {
          if (!acc[rel.student_id]) {
            acc[rel.student_id] = [];
          }
          acc[rel.student_id].push(rel.parent_id);
          return acc;
        }, {} as Record<string, string[]>);
        
        // Log sample of parent data
        const sampleStudentId = studentIds[0];
        if (sampleStudentId) {
          console.log(`Sample: Student ${sampleStudentId} has ${(parentsByStudent[sampleStudentId] || []).length} parent(s)`);
        }
        
        // Add parent_ids to each student
        const studentsWithParents = (studentsData || []).map(student => ({
          ...student,
          parent_ids: parentsByStudent[student.id] || []
        }));
        
        console.log(`Returning ${studentsWithParents.length} students with parent data`);

        // Return encrypted data to client
        const encryptedStudentsData = await encryptObject(studentsWithParents);
        return new Response(JSON.stringify({ data: { encrypted_data: encryptedStudentsData }, error: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getStudentById': {
        const { id } = data || {};
        if (!id) {
          throw new Error('Missing required parameter: id');
        }

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
          `)
          .eq('id', id);

        if (!includeDeleted) {
          query = query.is('deleted_at', null);
        }

        const { data: studentData, error } = await query.maybeSingle();

        if (error) {
          console.error('Error fetching student by id:', error);
          throw error;
        }

        const encryptedStudentData = await encryptObject(studentData || null);
        return new Response(JSON.stringify({ data: { encrypted_data: encryptedStudentData }, error: null }), {
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
    return new Response(JSON.stringify({ data: null, error: error instanceof Error ? error.message : 'An error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});