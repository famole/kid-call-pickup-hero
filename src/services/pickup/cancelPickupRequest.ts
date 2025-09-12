import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

// Cancel a pickup request by setting its status to 'cancelled'
export const cancelPickupRequest = async (requestId: string): Promise<void> => {
  try {
    // For username users, set the database session context first
    const usernameParentId = localStorage.getItem('username_parent_id');
    if (usernameParentId) {
      logger.info('Setting username user context for parent ID:', usernameParentId);
      const { error: contextError } = await supabase.rpc('set_username_user_context', {
        parent_id: usernameParentId
      });
      
      if (contextError) {
        logger.error('Error setting username user context:', contextError);
      }
    }

    const { error } = await supabase
      .from('pickup_requests')
      .update({ status: 'cancelled' })
      .eq('id', requestId);
    
    if (error) {
      logger.error('Supabase error cancelling pickup request:', error);
      throw new Error(`Database error: ${error.message}`);
    }
    
    logger.info(`Pickup request ${requestId} cancelled successfully`);
  } catch (error) {
    logger.error('Error in cancelPickupRequest:', error);
    throw error;
  }
};