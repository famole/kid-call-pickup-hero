
import { supabase } from "@/integrations/supabase/client";
import { PickupRequest } from '@/types';
import { PickupRequestWithDetails } from '@/types/supabase';
import { getStudentById } from './studentService';
import { getClassById } from './classService';
import { randomUUID } from 'crypto';
import { isValidUUID } from '@/utils/validators';
// Mapping of old student IDs to new UUIDs generated during migration
import { studentIdMap } from './student/migrationUtils';
import { parentIdMap } from './parentMigrationUtils';

// Create a new pickup request
export const createPickupRequest = async (studentId: string, parentId: string): Promise<PickupRequest> => {
  try {
    // Ensure we're sending proper UUID format IDs to Supabase
    console.log(`Creating pickup request for student: ${studentId}, parent: ${parentId}`);
    
    const { data, error } = await supabase
      .from('pickup_requests')
      .insert({
        student_id: studentId,
        parent_id: parentId,
        status: 'called' // Changed from 'pending' to 'called' to skip approval
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating pickup request:', error);
      throw new Error(error.message);
    }
    
    return {
      id: data.id,
      childId: data.student_id,
      parentId: data.parent_id,
      requestTime: new Date(data.request_time),
      status: data.status as 'pending' | 'called' | 'completed' | 'cancelled'
    };
  } catch (error) {
    console.error('Error in createPickupRequest:', error);
    throw error;
  }
};

// Update the status of a pickup request
export const updatePickupRequestStatus = async (id: string, status: PickupRequest['status']): Promise<PickupRequest | null> => {
  try {
    if (!isValidUUID(id)) {
      throw new Error(`Invalid pickup request ID: ${id}`);
    }
    const { data, error } = await supabase
      .from('pickup_requests')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating pickup request status:', error);
      throw new Error(error.message);
    }
    
    return {
      id: data.id,
      childId: data.student_id,
      parentId: data.parent_id,
      requestTime: new Date(data.request_time),
      status: data.status as 'pending' | 'called' | 'completed' | 'cancelled'
    };
  } catch (error) {
    console.error('Error in updatePickupRequestStatus:', error);
    throw error;
  }
};

// Get all active pickup requests
export const getActivePickupRequests = async (): Promise<PickupRequest[]> => {
  try {
    const { data, error } = await supabase
      .from('pickup_requests')
      .select('*')
      .in('status', ['pending', 'called']);
    
    if (error) {
      console.error('Error fetching active pickup requests:', error);
      throw new Error(error.message);
    }
    
    return data.map(item => ({
      id: item.id,
      childId: item.student_id,
      parentId: item.parent_id,
      requestTime: new Date(item.request_time),
      status: item.status as 'pending' | 'called' | 'completed' | 'cancelled'
    }));
  } catch (error) {
    console.error('Error in getActivePickupRequests:', error);
    throw error;
  }
};

// Get active pickup requests for a specific parent
export const getActivePickupRequestsForParent = async (parentId: string): Promise<PickupRequest[]> => {
  try {
    if (!isValidUUID(parentId)) {
      console.error(`Invalid parent ID: ${parentId}`);
      return [];
    }
    const { data, error } = await supabase
      .from('pickup_requests')
      .select('*')
      .eq('parent_id', parentId)
      .in('status', ['pending', 'called']);
    
    if (error) {
      console.error('Error fetching active pickup requests for parent:', error);
      throw new Error(error.message);
    }
    
    return data.map(item => ({
      id: item.id,
      childId: item.student_id,
      parentId: item.parent_id,
      requestTime: new Date(item.request_time),
      status: item.status as 'pending' | 'called' | 'completed' | 'cancelled'
    }));
  } catch (error) {
    console.error('Error in getActivePickupRequestsForParent:', error);
    throw error;
  }
};

// Get currently called pickup requests with details, optionally filtered by class
export const getCurrentlyCalled = async (classId?: string): Promise<PickupRequestWithDetails[]> => {
  try {
    console.log(`Fetching currently called with classId filter: ${classId || 'all'}`);
    
    // Base query to get called pickup requests
    const { data, error } = await supabase
      .from('pickup_requests')
      .select('*')
      .eq('status', 'called');
    
    if (error) {
      console.error('Error fetching called pickup requests:', error);
      throw new Error(error.message);
    }
    
    // Get student and class details for each request
    const requestsWithDetails = await Promise.all(data.map(async (req) => {
      const student = await getStudentById(req.student_id);
      const classInfo = student ? await getClassById(student.classId) : null;
      
      return {
        request: {
          id: req.id,
          childId: req.student_id,
          parentId: req.parent_id,
          requestTime: new Date(req.request_time),
          status: req.status as 'pending' | 'called' | 'completed' | 'cancelled'
        },
        child: student,
        class: classInfo
      };
    }));
    
    // Filter by class if a classId is provided and it's not 'all'
    if (classId && classId !== 'all') {
      console.log(`Filtering by classId: ${classId}`);
      const filtered = requestsWithDetails.filter(item => {
        if (!item.child || !item.class) {
          return false;
        }
        
        // Convert both IDs to strings for consistent comparison
        const childClassId = String(item.child.classId);
        const filterClassId = String(classId);
        
        const match = childClassId === filterClassId;
        console.log(`Comparing IDs: ${childClassId} vs ${filterClassId}, match: ${match}`);
        
        return match;
      });
      
      return filtered;
    }
    
    return requestsWithDetails;
  } catch (error) {
    console.error('Error in getCurrentlyCalled:', error);
    throw error;
  }
};

// Migrate pickup request data from mock to Supabase
export const migratePickupRequestsToSupabase = async (
  requests: PickupRequest[]
): Promise<void> => {
  try {
    // Generate new UUIDs for each pickup request and replace the old student ID
    // with the UUID generated during the student migration step.
    const rows = requests.map(request => ({
      id: randomUUID(),
      student_id: studentIdMap[request.childId] ?? request.childId,
      parent_id: request.parentId,
      request_time: request.requestTime.toISOString(),
      status: request.status
    }));

    const { error } = await supabase.from('pickup_requests').upsert(rows);
    
    if (error) {
      console.error('Error migrating pickup requests:', error);
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Error in migratePickupRequestsToSupabase:', error);
    throw error;
  }
};

// Ensure existing pickup request records reference valid UUIDs
export const fixInvalidPickupRequestIds = async (): Promise<void> => {
  const { data, error } = await supabase
    .from('pickup_requests')
    .select('*');

  if (error) {
    console.error('Error fetching pickup requests:', error);
    throw new Error(error.message);
  }

  if (!data) return;

  for (const row of data) {
    let studentId = row.student_id as string;
    let parentId = row.parent_id as string;
    let needsUpdate = false;

    if (!isValidUUID(studentId) && studentIdMap[studentId]) {
      studentId = studentIdMap[studentId];
      needsUpdate = true;
    }

    if (!isValidUUID(parentId) && parentIdMap[parentId]) {
      parentId = parentIdMap[parentId];
      needsUpdate = true;
    }

    if (needsUpdate) {
      const { error: updateError } = await supabase
        .from('pickup_requests')
        .update({ student_id: studentId, parent_id: parentId })
        .eq('id', row.id);

      if (updateError) {
        console.error('Failed to update pickup request', row.id, updateError);
      }
    }
  }
};
