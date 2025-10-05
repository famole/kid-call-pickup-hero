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
const SENSITIVE_FIELDS = ['email', 'phone', 'name', 'username'];

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

async function encryptObject(obj: Record<string, unknown>): Promise<string> {
  try {
    const jsonString = JSON.stringify(obj);
    return await encryptData(jsonString);
  } catch (error) {
    console.error('Object encryption failed:', error);
    return JSON.stringify(obj); // Return original if encryption fails
  }
}

async function decryptObject(encryptedString: string): Promise<Record<string, unknown> | string> {
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
    console.log('Secure parents operation:', operation);

    switch (operation) {
      case 'getParents': {
        let query = supabase
          .from('parents')
          .select(`
            id,
            name,
            email,
            username,
            phone,
            role,
            created_at,
            updated_at,
            deleted_at
          `);
        
        if (!includeDeleted) {
          query = query.is('deleted_at', null);
        }
        
        const { data: parentsData, error } = await query.order('name');
        
        if (error) {
          console.error('Error fetching parents:', error);
          throw error;
        }

        // Return encrypted data to client
        const encryptedParentsData = await encryptObject(parentsData || []);
        return new Response(JSON.stringify({ data: { encrypted_data: encryptedParentsData }, error: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getParentById': {
        const { id } = data || {};
        if (!id) {
          throw new Error('Missing required parameter: id');
        }

        let query = supabase
          .from('parents')
          .select(`
            id,
            name,
            email,
            username,
            phone,
            role,
            created_at,
            updated_at,
            deleted_at
          `)
          .eq('id', id);

        if (!includeDeleted) {
          query = query.is('deleted_at', null);
        }

        const { data: parentData, error } = await query.maybeSingle();

        if (error) {
          console.error('Error fetching parent by id:', error);
          throw error;
        }

        const encryptedParentData = await encryptObject(parentData || null);
        return new Response(JSON.stringify({ data: { encrypted_data: encryptedParentData }, error: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'createParent': {
        // Decrypt entire object received from client
        const decryptedData = await decryptObject(data.encrypted_data);
        
        const { data: parentData, error } = await supabase
          .from('parents')
          .insert(decryptedData)
          .select();
        
        if (error) {
          console.error('Error creating parent:', error);
          throw error;
        }

        // Return encrypted data to client
        const encryptedCreateData = await encryptObject(parentData || []);
        return new Response(JSON.stringify({ data: { encrypted_data: encryptedCreateData }, error: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'updateParent': {
        const { parentId, encrypted_data } = data;
        
        // Decrypt entire object received from client
        const decryptedData = await decryptObject(encrypted_data);
        
        const { data: parentData, error } = await supabase
          .from('parents')
          .update(decryptedData)
          .eq('id', parentId)
          .select();
        
        if (error) {
          console.error('Error updating parent:', error);
          throw error;
        }

        // Return encrypted data to client
        const encryptedUpdateData = await encryptObject(parentData || []);
        return new Response(JSON.stringify({ data: { encrypted_data: encryptedUpdateData }, error: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getParentsWithStudents': {
        const { includedRoles } = data || {};
        
        // Optimized query that joins parents with their students in one request
        let query = supabase
          .from('parents')
          .select(`
            id,
            name,
            email,
            username,
            phone,
            role,
            created_at,
            updated_at,
            deleted_at,
            student_parents!inner (
              id,
              student_id,
              is_primary,
              relationship,
              students!inner (
                id,
                name,
                class_id,
                classes!inner (
                  id,
                  name,
                  grade
                )
              )
            )
          `)
          .is('deleted_at', null);
        
        // Apply role filter if provided
        if (includedRoles && Array.isArray(includedRoles) && includedRoles.length > 0) {
          query = query.in('role', includedRoles);
        }
        
        const { data: parentsWithStudentsData, error } = await query.order('name');

        if (error) {
          console.error('Error fetching parents with students:', error);
          throw error;
        }

        // Transform the data to match the expected ParentWithStudents structure
        const transformedParents = (parentsWithStudentsData || []).map(parent => ({
          id: parent.id,
          name: parent.name,
          email: parent.email,
          username: parent.username,
          phone: parent.phone,
          role: parent.role,
          created_at: parent.created_at,
          updated_at: parent.updated_at,
          deleted_at: parent.deleted_at,
          students: parent.student_parents.map((sp: any) => ({
            id: sp.student_id,
            name: sp.students.name,
            isPrimary: sp.is_primary,
            relationship: sp.relationship || undefined,
            parentRelationshipId: sp.id,
            classId: sp.students.class_id,
            className: sp.students.classes?.name || '',
            grade: sp.students.classes?.grade || ''
          }))
        }));

        // Return encrypted data to client
        const encryptedParentsWithStudentsData = await encryptObject(transformedParents);
        return new Response(JSON.stringify({ data: { encrypted_data: encryptedParentsWithStudentsData }, error: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getParentsWhoShareStudents': {
        const { currentParentId } = data;

        if (!currentParentId) {
          throw new Error('currentParentId is required for getParentsWhoShareStudents operation');
        }

        // Get all students associated with the current parent
        const { data: currentParentStudents, error: studentsError } = await supabase
          .from('student_parents')
          .select('student_id')
          .eq('parent_id', currentParentId);

        if (studentsError) {
          console.error('Error fetching current parent students:', studentsError);
          throw studentsError;
        }

        if (!currentParentStudents || currentParentStudents.length === 0) {
          // Return empty result if no students found
          const encryptedEmptyResult = await encryptObject({ parents: [], sharedStudents: {} });
          return new Response(JSON.stringify({ data: { encrypted_data: encryptedEmptyResult }, error: null }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const studentIds = currentParentStudents.map(sp => sp.student_id);

        // Get all other parents who are associated with these students
        const { data: sharedParentRelations, error: sharedError } = await supabase
          .from('student_parents')
          .select(`
            parent_id,
            student_id,
            parents!inner (
              id,
              name,
              email,
              role,
              created_at,
              updated_at,
              deleted_at
            )
          `)
          .in('student_id', studentIds)
          .neq('parent_id', currentParentId)
          .is('parents.deleted_at', null);

        if (sharedError) {
          console.error('Error fetching shared parents:', sharedError);
          throw sharedError;
        }

        // Group by parent and track shared students
        const parentMap = new Map();
        const sharedStudents: Record<string, string[]> = {};

        for (const relation of sharedParentRelations || []) {
          const parentId = relation.parent_id;
          const parentData = relation.parents;

          // Skip if parent data is null (due to RLS restrictions or not found)
          if (!parentData || !parentData.id) {
            continue;
          }

          if (!parentMap.has(parentId)) {
            parentMap.set(parentId, {
              id: parentData.id,
              name: parentData.name,
              email: parentData.email,
              role: parentData.role
            });
            sharedStudents[parentId] = [];
          }

          sharedStudents[parentId].push(relation.student_id);
        }

        const result = {
          parents: Array.from(parentMap.values()),
          sharedStudents
        };

        // Return encrypted data to client
        const encryptedResult = await encryptObject(result);
        return new Response(JSON.stringify({ data: { encrypted_data: encryptedResult }, error: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getParentByEmail': {
        const { email } = data;

        if (!email) {
          throw new Error('email is required for getParentByEmail operation');
        }

        // Get parent by email
        const { data: parentData, error } = await supabase
          .from('parents')
          .select(`
            id,
            name,
            email,
            role,
            created_at,
            updated_at,
            deleted_at
          `)
          .eq('email', email)
          .is('deleted_at', null)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No parent found - return empty result
            const encryptedEmptyResult = await encryptObject({});
            return new Response(JSON.stringify({ data: { encrypted_data: encryptedEmptyResult }, error: null }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          console.error('Error fetching parent by email:', error);
          throw error;
        }

        // Transform to expected format
        const result = {
          id: parentData.id,
          name: parentData.name,
          email: parentData.email,
          role: parentData.role
        };

        // Return encrypted data to client
        const encryptedResult = await encryptObject(result);
        return new Response(JSON.stringify({ data: { encrypted_data: encryptedResult }, error: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getParentsByIds': {
        const { parentIds } = data;

        if (!parentIds || !Array.isArray(parentIds) || parentIds.length === 0) {
          throw new Error('parentIds array is required for getParentsByIds operation');
        }

        // Get parents by IDs
        const { data: parentsData, error } = await supabase
          .from('parents')
          .select(`
            id,
            name,
            email,
            role,
            created_at,
            updated_at,
            deleted_at
          `)
          .in('id', parentIds)
          .is('deleted_at', null);

        if (error) {
          console.error('Error fetching parents by IDs:', error);
          throw error;
        }

        // Transform to expected format
        const result = (parentsData || []).map(parent => ({
          id: parent.id,
          name: parent.name,
          email: parent.email,
          role: parent.role
        }));

        // Return encrypted data to client
        const encryptedResult = await encryptObject(result);
        return new Response(JSON.stringify({ data: { encrypted_data: encryptedResult }, error: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

  } catch (error) {
    console.error('Error in secure-parents function:', error);
    return new Response(JSON.stringify({ data: null, error: error instanceof Error ? error.message : 'An error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});