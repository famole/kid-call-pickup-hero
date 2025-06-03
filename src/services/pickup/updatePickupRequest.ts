
import { supabase } from "@/integrations/supabase/client";
import { PickupRequest } from '@/types';

// Update the status of a pickup request
export const updatePickupRequestStatus = async (id: string, status: PickupRequest['status']): Promise<PickupRequest | null> => {
  try {
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
