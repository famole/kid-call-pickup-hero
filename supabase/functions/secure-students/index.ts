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

// ── Cached PBKDF2 key ──────────────────────────────────────────────
let _cachedKey: CryptoKey | null = null;

async function getEncryptionKey(): Promise<CryptoKey> {
  if (_cachedKey) return _cachedKey;

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(ENCRYPTION_KEY),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  _cachedKey = await crypto.subtle.deriveKey(
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

  return _cachedKey;
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

    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedData), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    return data;
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
    return encryptedData;
  }
}

async function encryptObject(obj: any): Promise<string> {
  try {
    const jsonString = JSON.stringify(obj);
    return await encryptData(jsonString);
  } catch (error) {
    console.error('Object encryption failed:', error);
    return JSON.stringify(obj);
  }
}

async function decryptObject(encryptedString: string): Promise<any> {
  try {
    const decryptedString = await decryptData(encryptedString);
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Object decryption failed:', error);
    try {
      return JSON.parse(encryptedString);
    } catch {
      return encryptedString;
    }
  }
}

serve(async (req) => {
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
          .select('id, name, class_id, avatar, status, graduation_year, created_at, updated_at, deleted_at');
        
        if (!includeDeleted) {
          query = query.is('deleted_at', null);
        }
        
        const { data: studentsData, error } = await query.order('name');
        
        if (error) {
          console.error('Error fetching students:', error);
          throw error;
        }

        const studentIds = (studentsData || []).map(s => s.id);
        
        const { data: parentRelations, error: parentError } = await supabase
          .from('student_parents')
          .select('student_id, parent_id')
          .in('student_id', studentIds);
        
        if (parentError) {
          console.error('Error fetching parent relationships:', parentError);
        }
        
        const parentsByStudent = (parentRelations || []).reduce((acc, rel) => {
          if (!acc[rel.student_id]) acc[rel.student_id] = [];
          acc[rel.student_id].push(rel.parent_id);
          return acc;
        }, {} as Record<string, string[]>);
        
        const studentsWithParents = (studentsData || []).map(student => ({
          ...student,
          parent_ids: parentsByStudent[student.id] || []
        }));

        const encryptedStudentsData = await encryptObject({ data: studentsWithParents, error: null });
        return new Response(JSON.stringify({ encryptedData: encryptedStudentsData }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getStudentsForParent': {
        const { studentIds: requestedIds } = data || {};
        if (!requestedIds || !Array.isArray(requestedIds) || requestedIds.length === 0) {
          const encryptedEmpty = await encryptObject({ data: [], error: null });
          return new Response(JSON.stringify({ encryptedData: encryptedEmpty }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        let query = supabase
          .from('students')
          .select('id, name, class_id, avatar, status, graduation_year, deleted_at')
          .in('id', requestedIds);

        if (!includeDeleted) {
          query = query.is('deleted_at', null);
        }

        const { data: studentsData, error } = await query.order('name');

        if (error) {
          console.error('Error fetching students for parent:', error);
          throw error;
        }

        const fetchedIds = (studentsData || []).map(s => s.id);

        const { data: parentRelations } = await supabase
          .from('student_parents')
          .select('student_id, parent_id')
          .in('student_id', fetchedIds);

        const parentsByStudent = (parentRelations || []).reduce((acc: Record<string, string[]>, rel: any) => {
          if (!acc[rel.student_id]) acc[rel.student_id] = [];
          acc[rel.student_id].push(rel.parent_id);
          return acc;
        }, {});

        const studentsWithParents = (studentsData || []).map(student => ({
          ...student,
          parent_ids: parentsByStudent[student.id] || [],
        }));

        const encryptedData = await encryptObject({ data: studentsWithParents, error: null });
        return new Response(JSON.stringify({ encryptedData }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ── Unified parent dashboard endpoint ──────────────────────────
      // Returns: students (direct + authorized) with class names + active pickup requests
      // in a SINGLE round-trip. Replaces 4-5 separate calls.
      case 'getParentDashboard': {
        const { parentId } = data || {};
        if (!parentId) throw new Error('Missing required parameter: parentId');

        console.log(`getParentDashboard: resolving everything for parent ${parentId}`);
        const todayStr = new Date().toISOString().split('T')[0];
        const currentDayOfWeek = new Date().getDay();

        // ── Phase 1: parallel — relationships + classes + pickup requests
        const [directResult, authResult, classesResult, ownPickupResult, affectedPickupResult] = await Promise.all([
          supabase
            .from('student_parents')
            .select('student_id, is_primary')
            .eq('parent_id', parentId),
          supabase
            .from('pickup_authorizations')
            .select('student_id, student_ids, allowed_days_of_week')
            .eq('authorized_parent_id', parentId)
            .eq('is_active', true)
            .lte('start_date', todayStr)
            .gte('end_date', todayStr),
          supabase
            .from('classes')
            .select('id, name'),
          supabase
            .from('pickup_requests')
            .select('id, student_id, parent_id, request_time, status')
            .eq('parent_id', parentId)
            .in('status', ['pending', 'called']),
          // Pickup requests from OTHER parents for THIS parent's children
          // We'll filter after we know the student IDs
          supabase
            .from('pickup_requests')
            .select('id, student_id, parent_id, request_time, status')
            .in('status', ['pending', 'called']),
        ]);

        if (directResult.error) {
          console.error('Error fetching student_parents:', directResult.error);
          throw directResult.error;
        }

        const directStudentIds = (directResult.data || []).map(r => r.student_id);

        // Collect authorized student IDs, filtering by day of week
        let authorizedStudentIds: string[] = [];
        if (!authResult.error && authResult.data) {
          authResult.data.forEach(auth => {
            const allowedDays = auth.allowed_days_of_week;
            if (allowedDays && Array.isArray(allowedDays) && !allowedDays.includes(currentDayOfWeek)) {
              return;
            }
            if (auth.student_ids && Array.isArray(auth.student_ids)) {
              authorizedStudentIds.push(...auth.student_ids);
            }
            if (auth.student_id) authorizedStudentIds.push(auth.student_id);
          });
        }
        authorizedStudentIds = [...new Set(authorizedStudentIds)];

        const allNeededIds = [...new Set([...directStudentIds, ...authorizedStudentIds])];
        console.log(`Parent ${parentId}: ${directStudentIds.length} direct, ${authorizedStudentIds.length} authorized, ${allNeededIds.length} unique`);

        // Build class name map
        const classMap: Record<string, string> = {};
        (classesResult.data || []).forEach(c => { classMap[c.id] = c.name; });

        if (allNeededIds.length === 0) {
          const encryptedEmpty = await encryptObject({
            data: {
              directChildren: [],
              authorizedChildren: [],
              activeRequests: [],
            },
            error: null,
          });
          return new Response(JSON.stringify({ encryptedData: encryptedEmpty }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // ── Phase 2: fetch students
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id, name, class_id, avatar, status, graduation_year, deleted_at')
          .in('id', allNeededIds)
          .is('deleted_at', null)
          .order('name');

        if (studentsError) {
          console.error('Error fetching students:', studentsError);
          throw studentsError;
        }

        // Add class_name to each student
        const addClassName = (s: any) => ({
          ...s,
          class_name: s.class_id ? (classMap[s.class_id] || 'Unknown Class') : 'Unknown Class',
        });

        const directChildren = (studentsData || [])
          .filter(s => directStudentIds.includes(s.id))
          .map(addClassName);
        const authorizedChildren = (studentsData || [])
          .filter(s => authorizedStudentIds.includes(s.id) && !directStudentIds.includes(s.id))
          .map(addClassName);

        // ── Pickup requests: own + those affecting this parent's children
        const ownRequests = ownPickupResult.data || [];
        const allAffected = (affectedPickupResult.data || [])
          .filter(r => allNeededIds.includes(r.student_id) && r.parent_id !== parentId);
        
        // Combine, dedup by id
        const requestMap = new Map<string, any>();
        [...ownRequests, ...allAffected].forEach(r => { requestMap.set(r.id, r); });
        const activeRequests = Array.from(requestMap.values());

        console.log(`Returning ${directChildren.length} direct + ${authorizedChildren.length} authorized children, ${activeRequests.length} active requests`);

        const payload = {
          directChildren,
          authorizedChildren,
          activeRequests,
        };

        const encryptedPayload = await encryptObject({ data: payload, error: null });
        return new Response(JSON.stringify({ encryptedData: encryptedPayload }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Legacy — kept for backwards compat with usernameParentQueries
      case 'getStudentsForParentDashboard': {
        const { parentId } = data || {};
        if (!parentId) throw new Error('Missing required parameter: parentId');

        console.log(`getStudentsForParentDashboard: redirecting to getParentDashboard for parent ${parentId}`);
        const todayStr = new Date().toISOString().split('T')[0];
        const currentDayOfWeek = new Date().getDay();

        const [directResult, authResult] = await Promise.all([
          supabase
            .from('student_parents')
            .select('student_id, is_primary')
            .eq('parent_id', parentId),
          supabase
            .from('pickup_authorizations')
            .select('student_id, student_ids, allowed_days_of_week')
            .eq('authorized_parent_id', parentId)
            .eq('is_active', true)
            .lte('start_date', todayStr)
            .gte('end_date', todayStr),
        ]);

        if (directResult.error) throw directResult.error;

        const directStudentIds = (directResult.data || []).map(r => r.student_id);

        let authorizedStudentIds: string[] = [];
        if (!authResult.error && authResult.data) {
          authResult.data.forEach(auth => {
            const allowedDays = auth.allowed_days_of_week;
            if (allowedDays && Array.isArray(allowedDays) && !allowedDays.includes(currentDayOfWeek)) return;
            if (auth.student_ids && Array.isArray(auth.student_ids)) authorizedStudentIds.push(...auth.student_ids);
            if (auth.student_id) authorizedStudentIds.push(auth.student_id);
          });
        }
        authorizedStudentIds = [...new Set(authorizedStudentIds)];

        const allNeededIds = [...new Set([...directStudentIds, ...authorizedStudentIds])];

        if (allNeededIds.length === 0) {
          const encryptedEmpty = await encryptObject({
            data: { directChildren: [], authorizedChildren: [], directStudentIds: [], authorizedStudentIds: [] },
            error: null,
          });
          return new Response(JSON.stringify({ encryptedData: encryptedEmpty }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id, name, class_id, avatar, status, graduation_year, deleted_at')
          .in('id', allNeededIds)
          .is('deleted_at', null)
          .order('name');

        if (studentsError) throw studentsError;

        const directChildren = (studentsData || []).filter(s => directStudentIds.includes(s.id));
        const authorizedChildren = (studentsData || [])
          .filter(s => authorizedStudentIds.includes(s.id) && !directStudentIds.includes(s.id));

        const encryptedPayload = await encryptObject({
          data: { directChildren, authorizedChildren, directStudentIds, authorizedStudentIds },
          error: null,
        });
        return new Response(JSON.stringify({ encryptedData: encryptedPayload }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getStudentById': {
        const { id } = data || {};
        if (!id) throw new Error('Missing required parameter: id');

        let query = supabase
          .from('students')
          .select('id, name, class_id, avatar, status, graduation_year, created_at, updated_at, deleted_at')
          .eq('id', id);

        if (!includeDeleted) {
          query = query.is('deleted_at', null);
        }

        const { data: studentData, error } = await query.maybeSingle();

        if (error) throw error;

        if (!studentData) {
          const encryptedEmptyData = await encryptObject({ data: null, error: null });
          return new Response(JSON.stringify({ encryptedData: encryptedEmptyData }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: parentRelations } = await supabase
          .from('student_parents')
          .select('student_id, parent_id')
          .eq('student_id', id);

        const studentWithParents = {
          ...studentData,
          parent_ids: parentRelations ? parentRelations.map(rel => rel.parent_id) : []
        };

        const encryptedStudentData = await encryptObject({ data: studentWithParents, error: null });
        return new Response(JSON.stringify({ encryptedData: encryptedStudentData }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getStudentsWithParents': {
        const { studentIds } = data || {};
        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
          throw new Error('studentIds array is required for getStudentsWithParents operation');
        }

        let query = supabase
          .from('students')
          .select('id, name, class_id, avatar, status, graduation_year, created_at, updated_at, deleted_at')
          .in('id', studentIds);

        if (!includeDeleted) {
          query = query.is('deleted_at', null);
        }

        const { data: studentsData, error } = await query;

        if (error) throw error;

        if (!studentsData || studentsData.length === 0) {
          const encryptedEmptyData = await encryptObject({ data: [], error: null });
          return new Response(JSON.stringify({ encryptedData: encryptedEmptyData }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: parentRelations, error: parentError } = await supabase
          .from('student_parents')
          .select(`
            student_id,
            parent_id,
            is_primary,
            relationship,
            parents!inner (
              id, name, email, username, phone, role, created_at, updated_at, deleted_at
            )
          `)
          .in('student_id', studentIds);

        if (parentError) {
          console.error('Error fetching parent relationships:', parentError);
        }

        const parentsByStudent = (parentRelations || []).reduce((acc: Record<string, any[]>, rel: any) => {
          if (!acc[rel.student_id]) acc[rel.student_id] = [];
          const parentData = Array.isArray(rel.parents) ? rel.parents[0] : rel.parents;
          if (parentData) {
            acc[rel.student_id].push({
              id: parentData.id,
              name: parentData.name,
              email: parentData.email,
              username: parentData.username,
              phone: parentData.phone,
              role: parentData.role,
              created_at: parentData.created_at,
              updated_at: parentData.updated_at,
              deleted_at: parentData.deleted_at,
              isPrimary: rel.is_primary,
              relationship: rel.relationship
            });
          }
          return acc;
        }, {} as Record<string, any[]>);

        const studentsWithParents = studentsData.map(student => ({
          ...student,
          parentIds: parentsByStudent[student.id]?.map(p => p.id) || [],
          parents: parentsByStudent[student.id] || []
        }));

        const encryptedStudentsData = await encryptObject({ data: studentsWithParents, error: null });
        return new Response(JSON.stringify({ encryptedData: encryptedStudentsData }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'createStudent': {
        const decryptedData = await decryptObject(data.encrypted_data);
        
        const { data: studentData, error } = await supabase
          .from('students')
          .insert(decryptedData)
          .select();
        
        if (error) throw error;

        const encryptedCreateData = await encryptObject({ data: studentData || [], error: null });
        return new Response(JSON.stringify({ encryptedData: encryptedCreateData }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'updateStudent': {
        const { studentId, encrypted_data } = data;
        const decryptedData = await decryptObject(encrypted_data);
        
        const { data: studentData, error } = await supabase
          .from('students')
          .update(decryptedData)
          .eq('id', studentId)
          .select();
        
        if (error) throw error;

        const encryptedUpdateData = await encryptObject({ data: studentData || [], error: null });
        return new Response(JSON.stringify({ encryptedData: encryptedUpdateData }), {
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
