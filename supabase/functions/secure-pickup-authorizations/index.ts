import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';
// Simple logger for edge functions
const logger = {
  log: (...args)=>console.log(...args),
  error: (...args)=>console.error(...args),
  warn: (...args)=>console.warn(...args),
  info: (...args)=>console.info(...args)
};
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Initialize Supabase client
const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
// Encryption utilities - fallback to default key if env var not set
const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY') ?? 'U9.#s!_So2*';
async function getEncryptionKey() {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(ENCRYPTION_KEY), {
    name: 'PBKDF2'
  }, false, [
    'deriveBits',
    'deriveKey'
  ]);
  return crypto.subtle.deriveKey({
    name: 'PBKDF2',
    salt: encoder.encode('upsy-secure-salt-2024'),
    iterations: 100000,
    hash: 'SHA-256'
  }, keyMaterial, {
    name: 'AES-GCM',
    length: 256
  }, true, [
    'encrypt',
    'decrypt'
  ]);
}
async function encryptData(data) {
  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);
    const encryptedData = await crypto.subtle.encrypt({
      name: 'AES-GCM',
      iv
    }, key, encodedData);
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedData), iv.length);
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    logger.error('Encryption failed:', error);
    return data; // Return original data if encryption fails
  }
}
async function decryptData(encryptedData) {
  try {
    const key = await getEncryptionKey();
    const combined = new Uint8Array(atob(encryptedData).split('').map((char)=>char.charCodeAt(0)));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const decryptedData = await crypto.subtle.decrypt({
      name: 'AES-GCM',
      iv
    }, key, data);
    return new TextDecoder().decode(decryptedData);
  } catch (error) {
    logger.error('Decryption failed:', error);
    return encryptedData; // Return original if decryption fails
  }
}
async function encryptObject(obj) {
  try {
    const jsonString = JSON.stringify(obj);
    return await encryptData(jsonString);
  } catch (error) {
    logger.error('Object encryption failed:', error);
    return JSON.stringify(obj); // Return original if encryption fails
  }
}
async function decryptObject(encryptedString) {
  try {
    const decryptedString = await decryptData(encryptedString);
    return JSON.parse(decryptedString);
  } catch (error) {
    logger.error('Object decryption failed:', error);
    return JSON.parse(encryptedString); // Return original if decryption fails
  }
}
// This function is kept for backward compatibility but is no longer used
// as we now rely on the parentId provided in the request body
async function validateAuthentication() {
  return true;
}
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    logger.log('Secure pickup authorizations function started - v2.2');
    const { operation, data: requestData, parentId } = await req.json();
    logger.log('Operation:', operation, 'Parent ID:', parentId);
    logger.log('Full request body:', {
      operation,
      parentId,
      hasData: !!requestData
    });
    
    // parentId validation - skip for operations that don't need a specific parent
    const operationsWithoutParentId = ['getAuthorizedParentsByDate'];
    if (!parentId && !operationsWithoutParentId.includes(operation)) {
      logger.error('Parent ID is required for operation:', operation);
      return new Response(JSON.stringify({
        data: null,
        error: 'Parent ID is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    switch(operation){
      case 'getPickupAuthorizationsForParent':
        {
          logger.log('Getting pickup authorizations for parent:', parentId);
          
          // Get today's date in YYYY-MM-DD format (UTC)
          // Use UTC date to avoid timezone issues
          const now = new Date();
          const todayStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
          
          const { data, error } = await supabase.from('pickup_authorizations').select(`
              *,
              authorizing_parent:parents!authorizing_parent_id (id, name, email, role),
              authorized_parent:parents!authorized_parent_id (id, name, email, role),
              students!inner (
                id,
                name,
                class_id,
                avatar,
                classes (
                  id,
                  name,
                  grade
                )
              )
            `).eq('authorizing_parent_id', parentId).eq('is_active', true).is('students.deleted_at', null).gte('end_date', todayStr).order('created_at', {
            ascending: false
          });
          if (error) {
            logger.error('Error fetching pickup authorizations:', error);
            throw new Error(error.message);
          }
          const authorizations = data || [];
          const encryptedData = await encryptObject(authorizations);
          logger.log('Successfully fetched and encrypted pickup authorizations');
          return new Response(JSON.stringify({
            data: {
              encrypted_data: encryptedData
            },
            error: null
          }), {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }
      case 'getPickupAuthorizationsForAuthorizedParent':
        {
          let decryptedData;
          try {
            decryptedData = await decryptObject(requestData);
            decryptedData = JSON.parse(decryptedData);
          } catch (error) {
            logger.error('Failed to decrypt request data:', error);
            throw new Error('Invalid request data format');
          }
          const targetParentId = decryptedData.parentId || parentId;
          logger.log('Getting pickup authorizations for authorized parent:', targetParentId);

          // Get today's date in YYYY-MM-DD format (UTC)
          // Use UTC date to avoid timezone issues
          const now = new Date();
          const todayStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;

          const { data, error } = await supabase.from('pickup_authorizations').select(`
            *,
            authorizing_parent:parents!authorizing_parent_id (id, name, email),
            students!inner (
              id,
              name,
              class_id,
              avatar,
              classes (
                id,
                name,
                grade
              )
            )
          `).eq('authorized_parent_id', targetParentId).eq('is_active', true).is('students.deleted_at', null).gte('end_date', todayStr).order('created_at', {
            ascending: false
          });

          if (error) {
            logger.error('Error fetching pickup authorizations for authorized parent:', error);
            throw new Error(error.message);
          }
          const encryptedData = await encryptObject(data);
          logger.log('Successfully fetched and encrypted authorized pickup authorizations');
          return new Response(JSON.stringify({
            data: {
              encrypted_data: encryptedData
            },
            error: null
          }), {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }
      case 'createPickupAuthorization':
        {
          let decryptedData;
          try {
            decryptedData = await decryptObject(requestData);
            logger.log('Decrypted data for create:', decryptedData);
          } catch (error) {
            logger.error('Failed to decrypt request data:', error);
            throw new Error('Invalid request data format');
          }
          const parsedData = JSON.parse(decryptedData);
          // Validate required fields
          if (!parsedData.authorizedParentId) {
            throw new Error('Authorized parent ID is required');
          }
          if (!parsedData.studentId) {
            throw new Error('Student ID is required');
          }
          if (!parsedData.startDate || !parsedData.endDate) {
            throw new Error('Start date and end date are required');
          }
          logger.log('Creating pickup authorization with data:', {
            authorizing_parent_id: parentId,
            ...parsedData
          });
          try {
            const { data, error } = await supabase.from('pickup_authorizations').insert({
              authorizing_parent_id: parentId,
              authorized_parent_id: parsedData.authorizedParentId,
              student_id: parsedData.studentId,
              start_date: parsedData.startDate,
              end_date: parsedData.endDate,
              allowed_days_of_week: parsedData.allowedDaysOfWeek || [
                0,
                1,
                2,
                3,
                4,
                5,
                6
              ],
              is_active: true
            }).select().single();
            if (error) throw error;
            logger.log('Successfully created pickup authorization:', data);
            return new Response(JSON.stringify({
              data: {
                encrypted_data: await encryptObject(data)
              },
              error: null
            }), {
              status: 200,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            });
          } catch (error) {
            logger.error('Database error creating pickup authorization:', error);
            throw error;
          }
        }
      case 'updatePickupAuthorization':
        {
          logger.log('Update operation received');
          let decryptedData;
          let parsedData;
          try {
            logger.log('Decrypting request data...');
            decryptedData = await decryptObject(requestData);
            parsedData = typeof decryptedData === 'string' ? JSON.parse(decryptedData) : decryptedData;
            logger.log('Parsed data:', parsedData);
          } catch (error) {
            logger.error('Failed to decrypt request data:', error);
            throw new Error('Invalid request data format');
          }
          logger.log('Updating pickup authorization:', parsedData.id);
          const updateData = {};
          if (parsedData.authorizedParentId) updateData.authorized_parent_id = parsedData.authorizedParentId;
          if (parsedData.studentId) updateData.student_id = parsedData.studentId;
          if (parsedData.studentIds) updateData.student_ids = parsedData.studentIds;
          if (parsedData.startDate) updateData.start_date = parsedData.startDate;
          if (parsedData.endDate) updateData.end_date = parsedData.endDate;
          if (parsedData.allowedDaysOfWeek) updateData.allowed_days_of_week = parsedData.allowedDaysOfWeek;
          if (parsedData.isActive !== undefined) updateData.is_active = parsedData.isActive;
          updateData.updated_at = new Date().toISOString();
          const { data, error } = await supabase.from('pickup_authorizations').update(updateData).eq('id', parsedData.id).eq('authorizing_parent_id', parentId) // Ensure only authorizing parent can update
          .select().single();
          if (error) {
            logger.error('Error updating pickup authorization:', error);
            throw new Error(error.message);
          }
          
          if (!data) {
            logger.error('No data returned from update');
            throw new Error('Failed to update authorization - no data returned');
          }
          
          logger.log('Successfully updated authorization:', data.id);
          const encryptedData = await encryptObject(data);
          logger.log('Successfully updated and encrypted pickup authorization');
          return new Response(JSON.stringify({
            data: {
              encrypted_data: encryptedData
            },
            error: null
          }), {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }
      case 'deletePickupAuthorization':
        {
          try {
            // Decrypt and validate the request data
            const decryptedData = await decryptObject(requestData);
            const parsedData = JSON.parse(decryptedData);
            // Validate that we have a valid ID
            if (!parsedData || !parsedData.id) {
              const errorMsg = 'Authorization ID is required for deletion';
              logger.error(errorMsg);
              throw new Error(errorMsg);
            }
            console.log("DELETE 2");
            // Basic UUID validation (v4 format)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(parsedData.id)) {
              const errorMsg = `Invalid UUID format for ID: ${parsedData.id}`;
              logger.error(errorMsg);
              throw new Error('Invalid authorization ID format');
            }
            console.log("DELETE 3");
            logger.log('Deleting pickup authorization:', parsedData.id);
            // Perform the deletion
            const { error: deleteError, count } = await supabase.from('pickup_authorizations').delete().eq('id', parsedData.id);
            console.log("DELETE 4");
            if (deleteError) {
              logger.error('Database error deleting pickup authorization:', deleteError);
              throw new Error(deleteError.message);
            }
            if (count === 0) {
              const errorMsg = `No authorization found with ID: ${parsedData.id}`;
              logger.error(errorMsg);
              throw new Error('Authorization not found or you do not have permission to delete it');
            }
            logger.log('Successfully deleted pickup authorization:', parsedData.id);
            return new Response(JSON.stringify({
              data: {
                success: true
              },
              error: null
            }), {
              status: 200,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            });
          } catch (error) {
            console.log("DELETE 5");
            logger.error('Error in deletePickupAuthorization:', error);
            throw error; // Re-throw to be caught by the outer try-catch
          }
        }
      case 'getAvailableParentsForAuthorization':
        {
          logger.log('Getting available parents for authorization');
          // Get all students associated with the current parent
          const { data: currentParentStudents, error: studentsError } = await supabase.from('student_parents').select('student_id').eq('parent_id', parentId);
          if (studentsError) {
            logger.error('Error fetching current parent students:', studentsError);
            throw new Error(studentsError.message);
          }
          const studentIds = currentParentStudents?.map((sp)=>sp.student_id) || [];
          // Get ALL parents in the school (excluding current parent)
          const { data: allParents, error: parentsError } = await supabase.from('parents').select('id, name, email, role').neq('id', parentId);
          if (parentsError) {
            logger.error('Error fetching all parents:', parentsError);
            throw new Error(parentsError.message);
          }
          // Get shared student relationships for display purposes
          const sharedStudents = {};
          if (studentIds.length > 0) {
            const { data: sharedParentRelations, error: sharedError } = await supabase.from('student_parents').select('parent_id, student_id').in('student_id', studentIds).neq('parent_id', parentId);
            if (!sharedError && sharedParentRelations) {
              // Group shared students by parent
              for (const relation of sharedParentRelations){
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
          logger.log('Successfully fetched and encrypted available parents');
          return new Response(JSON.stringify({
            data: {
              encrypted_data: encryptedData
            },
            error: null
          }), {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }
      case 'getAuthorizedParentsByDate':
        {
          try {
            // Decrypt request data to get date and optional classId
            const decryptedData = await decryptObject(requestData);
            const parsedData = JSON.parse(decryptedData);
            
            const selectedDate = parsedData.date;
            const dayOfWeek = parsedData.dayOfWeek;
            const classId = parsedData.classId;
            
            logger.log('Getting authorized parents for date:', selectedDate, 'day:', dayOfWeek, 'classId:', classId);

            // Fetch all active authorizations for the selected date and day of week
            const { data: authorizations, error } = await supabase
              .from('pickup_authorizations')
              .select(`
                id,
                authorized_parent_id,
                student_ids,
                allowed_days_of_week,
                authorized_parent:parents!authorized_parent_id (
                  id,
                  name,
                  email,
                  role
                )
              `)
              .eq('is_active', true)
              .lte('start_date', selectedDate)
              .gte('end_date', selectedDate)
              .contains('allowed_days_of_week', [dayOfWeek]);

            if (error) {
              logger.error('Error fetching authorized parents:', error);
              throw new Error(error.message);
            }

            if (!authorizations || authorizations.length === 0) {
              logger.log('No authorizations found for date:', selectedDate);
              return new Response(JSON.stringify({
                data: { encrypted_data: await encryptObject([]) },
                error: null
              }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }

            // Get all unique student IDs
            const allStudentIds = new Set();
            authorizations.forEach(auth => {
              if (auth.student_ids && Array.isArray(auth.student_ids)) {
                auth.student_ids.forEach(id => allStudentIds.add(id));
              }
            });

            // Fetch student details with optional class filter
            let studentsQuery = supabase
              .from('students')
              .select('id, name, class_id')
              .in('id', Array.from(allStudentIds))
              .is('deleted_at', null);

            if (classId && classId !== 'all') {
              studentsQuery = studentsQuery.eq('class_id', classId);
            }

            const { data: students, error: studentsError } = await studentsQuery;

            if (studentsError) {
              logger.error('Error fetching students:', studentsError);
            }

            // Create a map for quick student lookup
            const studentsMap = new Map();
            (students || []).forEach(s => studentsMap.set(s.id, s));

            // Group authorizations by parent
            const parentMap = new Map();

            authorizations.forEach(auth => {
              const parent = auth.authorized_parent;
              if (!parent) return;

              if (!parentMap.has(parent.id)) {
                parentMap.set(parent.id, {
                  parentId: parent.id,
                  parentName: parent.name,
                  parentEmail: parent.email || '',
                  parentRole: parent.role,
                  students: []
                });
              }

              const parentData = parentMap.get(parent.id);
              
              // Add students for this authorization
              if (auth.student_ids && Array.isArray(auth.student_ids)) {
                auth.student_ids.forEach(studentId => {
                  const student = studentsMap.get(studentId);
                  if (student && !parentData.students.some(s => s.id === studentId)) {
                    parentData.students.push({
                      id: student.id,
                      name: student.name
                    });
                  }
                });
              }
            });

            // Filter out parents with no students (when class filter removes all their students)
            const result = Array.from(parentMap.values())
              .filter(parent => parent.students.length > 0)
              .sort((a, b) => a.parentName.localeCompare(b.parentName));

            logger.log(`Found ${result.length} authorized parents for ${selectedDate} with class filter: ${classId || 'all'}`);
            
            const encryptedData = await encryptObject(result);
            return new Response(JSON.stringify({
              data: { encrypted_data: encryptedData },
              error: null
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } catch (error) {
            logger.error('Error in getAuthorizedParentsByDate:', error);
            throw error;
          }
        }
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  } catch (error) {
    logger.error('Error in secure-pickup-authorizations function:', error);
    return new Response(JSON.stringify({
      data: null,
      error: error instanceof Error ? error.message : 'An error occurred'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
