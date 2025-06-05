
import { supabase } from "@/integrations/supabase/client";
import { PickupRequest } from '@/types';

// Function to check if a string is a valid UUID
const isValidUUID = (id: string): boolean => {
  if (!id) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

// Get all active pickup requests (both pending and called)
export const getActivePickupRequests = async (): Promise<PickupRequest[]> => {
  try {
    
    const { data, error } = await supabase
      .from('pickup_requests')
      .select('*')
      .in('status', ['pending', 'called']);
    
    if (error) {
      console.error('Supabase error fetching active pickup requests:', error);
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!data) {
      return [];
    }
    
    
    // Filter out requests with invalid student IDs
    const validRequests = data.filter(item => {
      const isValid = isValidUUID(item.student_id) && isValidUUID(item.parent_id);
      if (!isValid) {
        console.warn(`Filtering out request ${item.id} with invalid IDs: student_id=${item.student_id}, parent_id=${item.parent_id}`);
      }
      return isValid;
    });
    
    
    return validRequests.map(item => ({
      id: item.id,
      studentId: item.student_id,
      parentId: item.parent_id,
      requestTime: new Date(item.request_time),
      status: item.status as 'pending' | 'called' | 'completed' | 'cancelled'
    }));
  } catch (error) {
    console.error('Error in getActivePickupRequests:', error);
    // Return empty array instead of throwing to prevent app crashes
    return [];
  }
};

// Get active pickup requests for a specific parent (both pending and called)
export const getActivePickupRequestsForParent = async (parentId: string): Promise<PickupRequest[]> => {
  try {
    
    const { data, error } = await supabase
      .from('pickup_requests')
      .select('*')
      .eq('parent_id', parentId)
      .in('status', ['pending', 'called']);
    
    if (error) {
      console.error('Supabase error fetching pickup requests for parent:', error);
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!data) {
      return [];
    }
    
    // Filter out requests with invalid student IDs
    const validRequests = data.filter(item => {
      const isValid = isValidUUID(item.student_id);
      if (!isValid) {
        console.warn(`Filtering out request ${item.id} with invalid student_id: ${item.student_id}`);
      }
      return isValid;
    });
    
    
    return validRequests.map(item => ({
      id: item.id,
      studentId: item.student_id,
      parentId: item.parent_id,
      requestTime: new Date(item.request_time),
      status: item.status as 'pending' | 'called' | 'completed' | 'cancelled'
    }));
  } catch (error) {
    console.error('Error in getActivePickupRequestsForParent:', error);
    // Return empty array instead of throwing to prevent app crashes
    return [];
  }
};
