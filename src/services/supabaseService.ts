
import { supabase } from "@/integrations/supabase/client";
import { PickupRequest } from '@/types';
import { PickupRequestRow, PickupRequestWithDetails } from '@/types/supabase';
import { getActivePickupRequests as getMockActivePickupRequests } from './mockData';

// Function to get active pickup requests
export const getActivePickupRequests = async (): Promise<PickupRequest[]> => {
  try {
    const { data, error } = await supabase
      .from('pickup_requests')
      .select('*')
      .in('status', ['pending', 'called']);
    
    if (error) {
      console.error('Error fetching active pickup requests:', error);
      return getMockActivePickupRequests(); // Fallback to mock data
    }
    
    return (data as PickupRequestRow[]).map(item => ({
      id: item.id,
      childId: item.student_id, // Map from student_id to childId for internal consistency
      parentId: item.parent_id,
      requestTime: new Date(item.request_time),
      status: item.status as 'pending' | 'called' | 'completed' | 'cancelled'
    })) as PickupRequest[];
  } catch (error) {
    console.error('Error in getActivePickupRequests:', error);
    return getMockActivePickupRequests(); // Fallback to mock data
  }
};

// Function to get currently called children with details
export const getCurrentlyCalled = async (
  classId?: string
): Promise<PickupRequestWithDetails[]> => {
  try {
    const { data, error } = await supabase
      .from('pickup_requests')
      .select(
        `id, parent_id, request_time, status, student:students(id, name, class_id, avatar, class:classes(id, name, grade, teacher))`
      )
      .eq('status', 'called');

    if (error) {
      console.error('Error fetching called pickup requests:', error);
      throw new Error(error.message);
    }

    let results: PickupRequestWithDetails[] = (data as any[]).map(row => ({
      request: {
        id: row.id,
        childId: row.student?.id,
        parentId: row.parent_id,
        requestTime: new Date(row.request_time),
        status: row.status as 'pending' | 'called' | 'completed' | 'cancelled'
      },
      child: row.student
        ? {
            id: row.student.id,
            name: row.student.name,
            classId: row.student.class_id || '',
            parentIds: [],
            avatar: row.student.avatar || undefined
          }
        : undefined,
      class:
        row.student && row.student.class
          ? {
              id: row.student.class.id,
              name: row.student.class.name,
              grade: row.student.class.grade,
              teacher: row.student.class.teacher
            }
          : undefined
    }));

    if (classId && classId !== 'all') {
      results = results.filter(item => item.class && item.class.id === classId);
    }

    return results;
  } catch (error) {
    console.error('Error in getCurrentlyCalled:', error);
    return [];
  }
};

// Migrate pickup requests from mock data to Supabase
export const migratePickupRequestsToSupabase = async (requests: PickupRequest[]): Promise<void> => {
  for (const request of requests) {
    const { error } = await supabase
      .from('pickup_requests')
      .upsert({
        id: request.id,
        student_id: request.childId,
        parent_id: request.parentId,
        request_time: request.requestTime.toISOString(),
        status: request.status
      });
    
    if (error) {
      console.error('Error migrating pickup request:', error);
    }
  }
};
