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
    if (!parentId) {
      logger.error('Parent ID is required');
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
          const currentDayOfWeek = new Date().getDay();
          
          const { data, error } = await supabase.from('pickup_authorizations')
            .select(`
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
            `)
            .eq('authorizing_parent_id', parentId)
            .eq('is_active', true)
            .is('students.deleted_at', null)
            .gte('end_date', new Date().toISOString().split('T')[0])
            .contains('allowed_days_of_week', [currentDayOfWeek])
            .order('created_at', { ascending: false });
            
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
          } catch (error) {
            logger.error('Failed to decrypt request data:', error);
            throw new Error('Invalid request data format');
          }
          const targetParentId = decryptedData.parentId || parentId;
          logger.log('Getting pickup authorizations for authorized parent:', targetParentId);
          const { data, error } = await supabase.from('pickup_authorizations').select(`
            *,
            authorizing_parent:parents!authorizing_parent_id (id, name, email),
            students (id, name)
          `).eq('authorized_parent_id', targetParentId).order('created_at', {
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
      case 'createPickupAuthorization': {
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
          const { data, error } = await supabase
            .from('pickup_authorizations')
            .insert({
              authorizing_parent_id: parentId,
              authorized_parent_id: parsedData.authorizedParentId,
              student_id: parsedData.studentId,
              start_date: parsedData.startDate,
              end_date: parsedData.endDate,
              allowed_days_of_week: parsedData.allowedDaysOfWeek || [0,1,2,3,4,5,6],
              is_active: true
            })
            .select()
            .single();

          if (error) throw error;
          
          logger.log('Successfully created pickup authorization:', data);
          return new Response(JSON.stringify({ 
            data: { encrypted_data: await encryptObject(data) }, 
            error: null 
          }), {
            status: 200,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            },
          });
        } catch (error) {
          logger.error('Database error creating pickup authorization:', error);
          throw error;
        }
      }
      case 'updatePickupAuthorization':
        {
          let decryptedData;
          try {
            decryptedData = await decryptObject(requestData);
          } catch (error) {
            logger.error('Failed to decrypt request data:', error);
            throw new Error('Invalid request data format');
          }
          logger.log('Updating pickup authorization:', decryptedData.id);
          const updateData = {};
          if (decryptedData.authorizedParentId) updateData.authorized_parent_id = decryptedData.authorizedParentId;
          if (decryptedData.studentId) updateData.student_id = decryptedData.studentId;
          if (decryptedData.startDate) updateData.start_date = decryptedData.startDate;
          if (decryptedData.endDate) updateData.end_date = decryptedData.endDate;
          if (decryptedData.allowedDaysOfWeek) updateData.allowed_days_of_week = decryptedData.allowedDaysOfWeek;
          if (decryptedData.isActive !== undefined) updateData.is_active = decryptedData.isActive;
          updateData.updated_at = new Date().toISOString();
          const { data, error } = await supabase.from('pickup_authorizations').update(updateData).eq('id', decryptedData.id).eq('authorizing_parent_id', parentId) // Ensure only authorizing parent can update
          .select().single();
          if (error) {
            logger.error('Error updating pickup authorization:', error);
            throw new Error(error.message);
          }
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
            const { error: deleteError, count } = await supabase.from('pickup_authorizations').delete().eq('id', parsedData.id).eq('authorizing_parent_id', parentId); // Ensure only authorizing parent can delete
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
