
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
    
    // Since we've fixed the data types, all should be valid UUIDs now
    
    return data.map(item => ({
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
export const getActivePickupRequestsForParent = async (
  providedParentId?: string
): Promise<PickupRequest[]> => {
  try {
    let parentId = providedParentId;

    // Resolve parent ID only if not provided by caller
    if (!parentId) {
      const { data: rpcParentId, error: parentError } = await supabase.rpc('get_current_parent_id');
      if (rpcParentId) {
        parentId = rpcParentId;
      } else {
        console.error('Unable to determine current parent ID:', parentError);
        return [];
      }
    }

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
    
    
    return data.map(item => ({
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
