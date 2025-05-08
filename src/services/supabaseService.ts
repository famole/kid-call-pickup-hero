
import { supabase } from "@/integrations/supabase/client";
import { Child, Class, PickupRequest, User } from '@/types';
import { PickupRequestRow, PickupRequestWithDetails } from '@/types/supabase';
import { 
  getChildById, 
  getClassById, 
  getActivePickupRequests as getMockActivePickupRequests,
  getCurrentlyCalled as getMockCurrentlyCalled
} from './mockData';

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
      childId: item.child_id,
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
export const getCurrentlyCalled = async (classId?: string): Promise<PickupRequestWithDetails[]> => {
  try {
    console.log(`Fetching called students with classId filter: ${classId || 'all'}`);
    
    // Start with the base query
    let query = supabase
      .from('pickup_requests')
      .select('*')
      .eq('status', 'called');
    
    const { data: requestsData, error: requestsError } = await query;
    
    if (requestsError) {
      console.error('Error fetching called pickup requests:', requestsError);
      return getMockCurrentlyCalled(); // Fallback to mock data
    }
    
    // Map the data to the expected format with child and class details
    let result = (requestsData as PickupRequestRow[]).map(req => {
      const child = getChildById(req.child_id);
      const classInfo = child ? getClassById(child.classId) : null;
      
      return {
        request: {
          id: req.id,
          childId: req.child_id,
          parentId: req.parent_id,
          requestTime: new Date(req.request_time),
          status: req.status as 'pending' | 'called' | 'completed' | 'cancelled'
        },
        child,
        class: classInfo
      };
    });
    
    // If classId is specified and not 'all', filter the results
    if (classId && classId !== 'all') {
      console.log(`Filtering results by classId: ${classId}`);
      result = result.filter(item => {
        // Convert both IDs to strings for comparison to ensure consistent type matching
        const itemClassId = item.child?.classId ? String(item.child.classId) : '';
        const filterClassId = String(classId);
        
        const match = itemClassId === filterClassId;
        console.log(`Comparing class IDs: ${itemClassId} vs ${filterClassId}, match: ${match}`);
        
        return match;
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error in getCurrentlyCalled:', error);
    return getMockCurrentlyCalled(); // Fallback to mock data
  }
};

// Migrate pickup requests from mock data to Supabase
export const migratePickupRequestsToSupabase = async (requests: PickupRequest[]): Promise<void> => {
  for (const request of requests) {
    const { error } = await supabase
      .from('pickup_requests')
      .upsert({
        id: request.id,
        child_id: request.childId,
        parent_id: request.parentId,
        request_time: request.requestTime.toISOString(),
        status: request.status
      });
    
    if (error) {
      console.error('Error migrating pickup request:', error);
    }
  }
};
