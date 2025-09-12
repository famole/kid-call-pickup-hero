import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

// Cancel a pickup request by setting its status to 'cancelled'
export const cancelPickupRequest = async (requestId: string): Promise<void> => {
  try {
    console.log('cancelPickupRequest called for requestId:', requestId);
    
    // Check if user has active Supabase auth session
    const { data: { session } } = await supabase.auth.getSession();
    const usernameParentId = localStorage.getItem('username_parent_id');
    
    console.log('Has auth session:', !!session);
    console.log('Username parent ID from localStorage:', usernameParentId);
    
    // Determine if this is a username user (no auth session but has username parent ID)
    const isUsernameUser = !session && usernameParentId;
    
    if (isUsernameUser) {
      logger.info('Username user detected, using secure function for parent ID:', usernameParentId);
      console.log('Setting context for username user:', usernameParentId);
      
      const { error: contextError } = await supabase.rpc('set_username_user_context', {
        parent_id: usernameParentId
      });
      
      if (contextError) {
        logger.error('Error setting username user context:', contextError);
        console.error('Context error:', contextError);
      } else {
        console.log('Context set successfully');
      }
    } else {
      console.log('Authenticated user, using regular RLS approach');
    }

    console.log('About to update pickup request with ID:', requestId);
    console.log('Attempting to set status to cancelled...');
    
    if (isUsernameUser) {
      // Use the secure database function for username users
      console.log('Using secure function for username user');
      const { error } = await supabase.rpc('cancel_pickup_request_for_username_user', {
        p_request_id: requestId,
        p_parent_id: usernameParentId
      });
      
      if (error) {
        logger.error('Supabase error cancelling pickup request for username user:', error);
        console.error('Detailed error:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      console.log('Successfully cancelled pickup request using secure function');
    } else {
      // Use regular update for authenticated users
      const { data, error } = await supabase
        .from('pickup_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId)
        .select('*');
      
      console.log('Update result - data:', data);
      console.log('Update result - error:', error);
      
      if (error) {
        logger.error('Supabase error cancelling pickup request:', error);
        console.error('Detailed error:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        console.error('No rows were updated - this suggests RLS policy blocked the update');
        throw new Error('Failed to cancel pickup request - access denied');
      }
    }
    
    logger.info(`Pickup request ${requestId} cancelled successfully`);
  } catch (error) {
    logger.error('Error in cancelPickupRequest:', error);
    throw error;
  }
};