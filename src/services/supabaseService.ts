
import { supabase } from "@/integrations/supabase/client";
import { Child, Class, PickupRequest, User } from '@/types';
import { PickupRequestRow, PickupRequestWithDetails } from '@/types/supabase';
import { 
  getChildById, 
  getClassById, 
  getActivePickupRequests as getMockActivePickupRequests,
  getCurrentlyCalled as getMockCurrentlyCalled
} from './mockData';

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
    const result: PickupRequestWithDetails[] = [];
    
    for (const req of requestsData as PickupRequestRow[]) {
      // IMPORTANT: For non-UUID child_ids, we'll use mock data directly
      // This handles legacy/numeric IDs that aren't valid UUIDs
      const childId = req.child_id;
      
      // Always use mock data for child lookup since we can't query with non-UUID values
      const child = getChildById(childId);
      let classInfo: Class | null = null;
      
      // If we have a child with a valid classId that's a UUID, try to get real class data
      if (child && child.classId) {
        if (isValidUUID(child.classId)) {
          try {
            // Get class data from database if classId is a valid UUID
            const { data: classData, error: classError } = await supabase
              .from('classes')
              .select('*')
              .eq('id', child.classId)
              .single();
            
            if (!classError && classData) {
              classInfo = {
                id: classData.id,
                name: classData.name,
                grade: classData.grade,
                teacher: classData.teacher
              };
            } else {
              // Fallback to mock for class data
              classInfo = getClassById(child.classId);
            }
          } catch (error) {
            console.error(`Error fetching class with id ${child.classId}:`, error);
            classInfo = getClassById(child.classId); // Fallback to mock data
          }
        } else {
          // If classId isn't a valid UUID, use mock data
          classInfo = getClassById(child.classId);
        }
      }
      
      result.push({
        request: {
          id: req.id,
          childId: req.child_id,
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
      console.log(`Filtering results by classId: ${classId}`);
      
      return result.filter(item => {
        if (!item.child || !item.class) {
          return false;
        }
        
        // Convert both IDs to strings for comparison to ensure consistent type matching
        const itemClassId = item.child.classId ? String(item.child.classId) : '';
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
