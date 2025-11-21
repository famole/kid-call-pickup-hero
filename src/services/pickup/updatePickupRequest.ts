
import { supabase } from "@/integrations/supabase/client";
import { PickupRequest } from '@/types';
import { logger } from "@/utils/logger";

// Update the status of a pickup request
export const updatePickupRequestStatus = async (
  id: string,
  status: PickupRequest['status']
): Promise<PickupRequest | null> => {
  try {

    const updateData: Record<string, unknown> = { status };

    // When marking a request as called, store the time it was called
    if (status === 'called') {
      updateData.called_time = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('pickup_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      logger.error('Supabase error updating pickup request status:', error);
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!data) {
      logger.warn(`No pickup request found with id: ${id}`);
      return null;
    }
    
    
    return {
      id: data.id,
      studentId: data.student_id,
      parentId: data.parent_id,
      requestTime: new Date(data.request_time),
      status: data.status as 'pending' | 'called' | 'completed' | 'cancelled'
    };
  } catch (error) {
    logger.error('Error in updatePickupRequestStatus:', error);
    throw error;
  }
};
