
import { supabase } from "@/integrations/supabase/client";
import { PickupRequest } from '@/types';
import { logger } from '@/utils/logger';

// Create a new pickup request - now defaults to 'pending' status
export const createPickupRequest = async (studentId: string): Promise<PickupRequest> => {
  try {
    logger.info('Creating pickup request for student:', studentId);

    // Use secure function that handles all authorization and creation logic
    const { data: requestId, error } = await supabase.rpc('create_pickup_request_secure', {
      p_student_id: studentId
    });
    
    if (error) {
      logger.error('Error creating pickup request:', error);
      throw new Error(error.message);
    }
    
    if (!requestId) {
      throw new Error('Failed to create pickup request');
    }

    // Fetch the created request to return full data
    const { data: requestData, error: fetchError } = await supabase
      .from('pickup_requests')
      .select('*')
      .eq('id', requestId)
      .single();
    
    if (fetchError || !requestData) {
      logger.error('Error fetching created pickup request:', fetchError);
      throw new Error('Failed to retrieve created pickup request');
    }
    
    logger.info('Pickup request created successfully:', requestId);
    
    return {
      id: requestData.id,
      studentId: requestData.student_id,
      parentId: requestData.parent_id,
      requestTime: new Date(requestData.request_time),
      status: requestData.status as 'pending' | 'called' | 'completed' | 'cancelled'
    };
  } catch (error) {
    logger.error('Error in createPickupRequest:', error);
    throw error;
  }
};
