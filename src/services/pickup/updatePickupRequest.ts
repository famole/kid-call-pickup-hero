
import { supabase } from "@/integrations/supabase/client";
import { PickupRequest } from '@/types';

// Update the status of a pickup request
export const updatePickupRequestStatus = async (
  id: string,
  status: PickupRequest['status']
): Promise<PickupRequest | null> => {
  try {
    console.log(`Updating pickup request ${id} to status: ${status}`);

    const updateData: Record<string, unknown> = { status };

    // When marking a request as called, also store the time it was called
    if (status === 'called') {
      updateData.request_time = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('pickup_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error updating pickup request status:', error);
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!data) {
      console.warn(`No pickup request found with id: ${id}`);
      return null;
    }
    
    console.log(`Successfully updated pickup request ${id} to status: ${status}`);
    
    return {
      id: data.id,
      studentId: data.student_id,
      parentId: data.parent_id,
      requestTime: new Date(data.request_time),
      status: data.status as 'pending' | 'called' | 'completed' | 'cancelled'
    };
  } catch (error) {
    console.error('Error in updatePickupRequestStatus:', error);
    throw error;
  }
};
