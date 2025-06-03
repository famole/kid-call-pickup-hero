
import { supabase } from "@/integrations/supabase/client";
import { PickupRequest } from '@/types';

// Get all active pickup requests (both pending and called)
export const getActivePickupRequests = async (): Promise<PickupRequest[]> => {
  try {
    console.log('Fetching active pickup requests...');
    
    const { data, error } = await supabase
      .from('pickup_requests')
      .select('*')
      .in('status', ['pending', 'called']);
    
    if (error) {
      console.error('Supabase error fetching active pickup requests:', error);
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!data) {
      console.log('No active pickup requests found');
      return [];
    }
    
    console.log(`Found ${data.length} active pickup requests`);
    
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
export const getActivePickupRequestsForParent = async (parentId: string): Promise<PickupRequest[]> => {
  try {
    console.log(`Fetching active pickup requests for parent: ${parentId}`);
    
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
      console.log(`No active pickup requests found for parent: ${parentId}`);
      return [];
    }
    
    console.log(`Found ${data.length} active pickup requests for parent: ${parentId}`);
    
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
