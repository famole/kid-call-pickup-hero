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

    // Convert to base64 without spreading large arrays (avoids stack overflow)
    let binary = '';
    const len = combined.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return btoa(binary);
  } catch (error) {
    console.error('Encryption failed:', error);
    throw error;
  }
}

async function decryptData(encryptedData: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const binaryString = atob(encryptedData);
    const len = binaryString.length;
    const combined = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      combined[i] = binaryString.charCodeAt(i);
    }
    
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
    throw error;
  }
}

async function encryptObject(obj: Record<string, unknown>): Promise<string> {
  try {
    const jsonString = JSON.stringify(obj);
    return await encryptData(jsonString);
  } catch (error) {
    console.error('Object encryption failed:', error);
    throw error;
  }
}

async function decryptObject(encryptedString: string): Promise<Record<string, unknown> | string> {
  try {
    const decryptedString = await decryptData(encryptedString);
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Object decryption failed:', error);
    throw error;
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
        const { includedRoles, includeDeleted, page = 1, pageSize = 50, searchTerm } = data || {};
        
        // Calculate offset for pagination
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        
        // Optimized query that joins parents with their students in one request
        // Using left joins (no !inner) so parents without students are still returned
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
            student_parents (
              id,
              student_id,
              is_primary,
              relationship,
              students (
                id,
                name,
                class_id,
                classes (
                  id,
                  name,
                  grade
                )
              )
            )
          `, { count: 'exact' });
        
        // Apply deleted filter unless we want to include deleted
        if (!includeDeleted) {
          query = query.is('deleted_at', null);
        }
        
        // Apply role filter if provided
        if (includedRoles && Array.isArray(includedRoles) && includedRoles.length > 0) {
          query = query.in('role', includedRoles);
        }
        
        // Apply search filter if provided (minimum 3 characters)
        if (searchTerm && searchTerm.trim().length >= 3) {
          const search = searchTerm.trim().toLowerCase();
          // Search across name, email, and username
          query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,username.ilike.%${search}%`);
        }
        
        // Apply pagination and ordering
        query = query.order('name').range(from, to);
        
        const { data: parentsWithStudentsData, error, count } = await query;

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
          students: (parent.student_parents || []).map((sp: any) => ({
            id: sp.student_id,
            name: sp.students?.name || '',
            isPrimary: sp.is_primary,
            relationship: sp.relationship || undefined,
            parentRelationshipId: sp.id,
            classId: sp.students?.class_id || null,
            className: sp.students?.classes?.name || '',
            grade: sp.students?.classes?.grade || ''
          }))
        }));

        // Return encrypted data to client with pagination metadata
        const encryptedParentsWithStudentsData = await encryptObject({
          parents: transformedParents,
          totalCount: count || 0,
          page,
          pageSize
        });
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
        const email = data?.email;

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

      case 'searchParents': {
        const { searchTerm, currentParentId } = data;

        if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim().length < 3) {
          throw new Error('searchTerm must be at least 3 characters for searchParents operation');
        }

        if (!currentParentId) {
          throw new Error('currentParentId is required for searchParents operation');
        }

        console.log(`Searching parents with term: ${searchTerm} for parent: ${currentParentId}`);

        // Get all students associated with the current parent
        const { data: currentParentStudents, error: studentsError } = await supabase
          .from('student_parents')
          .select('student_id')
          .eq('parent_id', currentParentId);

        if (studentsError) {
          console.error('Error fetching current parent students:', studentsError);
          throw new Error(`Failed to fetch students: ${studentsError.message}`);
        }

        const studentIds = currentParentStudents?.map((sp: any) => sp.student_id) || [];

        // Use database-level search with ILIKE for case-insensitive pattern matching
        // This leverages the indexes we created and is much faster than application-level filtering
        const searchPattern = `%${searchTerm.trim()}%`;
        
        const { data: matchedParents, error: parentsError } = await supabase
          .from('parents')
          .select('id, name, email, role, phone')
          .neq('id', currentParentId)
          .is('deleted_at', null)
          .or(`name.ilike.${searchPattern},email.ilike.${searchPattern},username.ilike.${searchPattern}`)
          .order('name')
          .limit(20);

        if (parentsError) {
          console.error('Error fetching parents:', parentsError);
          throw new Error(`Failed to fetch parents: ${parentsError.message}`);
        }

        // Decrypt the matched results
        const decryptedParents: any[] = [];
        const matchedParentIds: string[] = [];

        for (const parent of (matchedParents || [])) {
          try {
            const decryptedName = await decryptData(parent.name);
            const decryptedEmail = await decryptData(parent.email);
            const decryptedPhone = parent.phone ? await decryptData(parent.phone) : null;
            
            decryptedParents.push({
              id: parent.id,
              name: decryptedName,
              email: decryptedEmail,
              phone: decryptedPhone,
              role: parent.role,
            });
            matchedParentIds.push(parent.id);
          } catch (decryptError) {
            console.error(`Error decrypting parent ${parent.id}:`, decryptError);
          }
        }

        // Fetch shared students for the matched parents
        const sharedStudents: Record<string, string[]> = {};
        if (studentIds.length > 0 && matchedParentIds.length > 0) {
          const { data: sharedParentRelations, error: sharedError } = await supabase
            .from('student_parents')
            .select('parent_id, student_id')
            .in('student_id', studentIds)
            .in('parent_id', matchedParentIds);

          if (!sharedError && sharedParentRelations) {
            for (const relation of sharedParentRelations) {
              const parentId = relation.parent_id;
              if (!sharedStudents[parentId]) {
                sharedStudents[parentId] = [];
              }
              sharedStudents[parentId].push(relation.student_id);
            }
          }
        }

        // Add shared student information to matched parents
        const results = decryptedParents.map((parent: any) => ({
          ...parent,
          sharedStudentIds: sharedStudents[parent.id] || [],
        }));

        console.log(`Found ${results.length} matching parents`);

        // Return encrypted data to client
        const encryptedResults = await encryptObject(results);
        return new Response(
          JSON.stringify({
            data: { encrypted_data: encryptedResults },
            error: null
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      case 'getParentsByIds': {
        // Handle both data.parentIds and parentIds at root level for backward compatibility
        const parentIds = data?.parentIds;

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

      case 'getParentByIdentifier': {
        const { identifier } = data;

        if (!identifier) {
          throw new Error('identifier is required for getParentByIdentifier operation');
        }

        // Check if identifier is a UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

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
          .is('deleted_at', null);

        if (isUUID) {
          query = query.eq('id', identifier);
        } else {
          // Try to match email or username
          query = query.or(`email.eq.${identifier},username.eq.${identifier}`);
        }

        const { data: parentData, error } = await query.maybeSingle();

        if (error) {
          console.error('Error fetching parent by identifier:', error);
          throw error;
        }

        // Return encrypted data to client
        const encryptedResult = await encryptObject(parentData || null);
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