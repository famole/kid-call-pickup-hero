
import { supabase } from "@/integrations/supabase/client";
import { PickupRequest } from '@/types';

// Get all active pickup requests (both pending and called)
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
      studentId: item.student_id,
      parentId: item.parent_id,
      requestTime: new Date(item.request_time),
      status: item.status as 'pending' | 'called' | 'completed' | 'cancelled'
    }));
  } catch (error) {
    console.error('Error in getActivePickupRequests:', error);
    throw error;
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
      console.error('Error fetching active pickup requests for parent:', error);
      throw new Error(error.message);
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
    throw error;
  }
};
