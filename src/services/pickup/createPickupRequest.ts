
import { supabase } from "@/integrations/supabase/client";
import { PickupRequest } from '@/types';
import { logger } from '@/utils/logger';

// Create a new pickup request - now defaults to 'pending' status
export const createPickupRequest = async (studentId: string): Promise<PickupRequest> => {
  try {
    logger.info('Creating pickup request for student:', studentId);

    // Use secure encrypted operations
    const { securePickupOperations } = await import('@/services/encryption/securePickupClient');
    const { data, error } = await securePickupOperations.createPickupRequestSecure(studentId);
    
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
