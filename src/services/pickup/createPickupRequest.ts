
import { supabase } from "@/integrations/supabase/client";
import { PickupRequest } from '@/types';
import { logger } from '@/utils/logger';

// Create a new pickup request - now defaults to 'pending' status
export const createPickupRequest = async (studentId: string): Promise<PickupRequest> => {
  try {
    logger.info('Creating pickup request for student:', studentId);

    // Get current parent ID first
    const { data: parentId, error: parentError } = await supabase.rpc('get_current_parent_id');
    
    if (parentError || !parentId) {
      logger.error('Failed to get current parent ID:', parentError);
      throw new Error('Unable to identify parent for pickup request');
    }

    // Use secure encrypted operations
    const { securePickupOperations } = await import('@/services/encryption/securePickupClient');
    const { data, error } = await securePickupOperations.createPickupRequestSecure(studentId, parentId);
    
    if (error) {
      logger.error('Secure pickup request creation failed:', error);
      throw new Error(error.message || 'Failed to create pickup request');
    }
    
    if (!data) {
      throw new Error('Failed to create pickup request');
    }
    
    logger.info('Pickup request created successfully:', data.id);
    
    return data;
  } catch (error) {
    logger.error('Error in createPickupRequest:', error);
    throw error;
  }
};
