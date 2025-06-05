
import { supabase } from "@/integrations/supabase/client";
import { PickupRequest } from '@/types';
import { PickupRequestRow, PickupRequestWithDetails } from '@/types/supabase';
import { getStudentById } from './studentService';
import { getClassById } from './classService';

// Function to check if a string is a valid UUID
const isValidUUID = (id: string): boolean => {
  if (!id) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

// Function to get active pickup requests
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
    
    return (data as PickupRequestRow[]).map(item => ({
      id: item.id,
      studentId: item.student_id,
      parentId: item.parent_id,
      requestTime: new Date(item.request_time),
      status: item.status as 'pending' | 'called' | 'completed' | 'cancelled'
    })) as PickupRequest[];
  } catch (error) {
    console.error('Error in getActivePickupRequests:', error);
    throw error;
  }
};

// Function to get currently called children with details
export const getCurrentlyCalled = async (classId?: string): Promise<PickupRequestWithDetails[]> => {
  try {
    
    // Start with the base query
    const { data: requestsData, error: requestsError } = await supabase
      .from('pickup_requests')
      .select('*')
      .eq('status', 'called');
    
    if (requestsError) {
      console.error('Error fetching called pickup requests:', requestsError);
      throw new Error(requestsError.message);
    }
    
    // Map the data to the expected format with child and class details
    const result: PickupRequestWithDetails[] = [];
    
    for (const req of requestsData as PickupRequestRow[]) {
      // Get student details
      const studentId = req.student_id;
      const child = await getStudentById(studentId);
      let classInfo = null;
      
      // If we have a child with a valid classId that's a UUID, get class data
      if (child && child.classId && isValidUUID(child.classId)) {
        try {
          classInfo = await getClassById(child.classId);
        } catch (error) {
          console.error(`Error fetching class with id ${child.classId}:`, error);
        }
      }
      
      result.push({
        request: {
          id: req.id,
          studentId: req.student_id,
          parentId: req.parent_id,
          requestTime: new Date(req.request_time),
          status: req.status as 'pending' | 'called' | 'completed' | 'cancelled'
        },
        child,
        class: classInfo
      });
    }
    
    // If classId is specified and not 'all', filter the results
    if (classId && classId !== 'all') {
      
      return result.filter(item => {
        if (!item.child || !item.class) {
          return false;
        }
        
        // Convert both IDs to strings for consistent comparison
        const childClassId = String(item.child.classId);
        const filterClassId = String(classId);
        
        const match = childClassId === filterClassId;
        
        return match;
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error in getCurrentlyCalled:', error);
    throw error;
  }
};

// Migrate pickup requests from mock data to Supabase
export const migratePickupRequestsToSupabase = async (requests: PickupRequest[]): Promise<void> => {
  for (const request of requests) {
    const { error } = await supabase
      .from('pickup_requests')
      .upsert({
        id: request.id,
        student_id: request.studentId,
        parent_id: request.parentId,
        request_time: request.requestTime.toISOString(),
        status: request.status
      });
    
    if (error) {
      console.error('Error migrating pickup request:', error);
    }
  }
};
