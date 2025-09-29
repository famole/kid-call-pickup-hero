import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
import { encryptData } from "@/services/encryption/encryptionService";

// Cancel a pickup request by setting its status to 'cancelled' using the secure endpoint
export const cancelPickupRequest = async (requestId: string): Promise<void> => {
  try {
    logger.info('Canceling pickup request:', requestId);
    
    // Check if user has active Supabase auth session
    const { data: { session } } = await supabase.auth.getSession();
    const usernameParentId = localStorage.getItem('username_parent_id');
    
    // Determine if this is a username user (no auth session but has username parent ID)
    const isUsernameUser = !session && usernameParentId;
    
    // Get the current user's ID for authenticated users
    const { data: { user } } = await supabase.auth.getUser();
    
    // Prepare the request payload
    const payload = {
      requestId,
      parentId: isUsernameUser ? usernameParentId : user?.id
    };
    
    if (!payload.parentId) {
      throw new Error('Unable to determine user identity');
    }
    
    // Encrypt the payload
    const encryptedPayload = await encryptData(JSON.stringify(payload));
    
    // Call the secure endpoint
    const { data, error } = await supabase.functions.invoke('secure-pickup-requests', {
      body: {
        operation: 'cancelPickupRequest',
        data: encryptedPayload
      }
    });
    
    if (error) {
      logger.error('Error calling secure-pickup-requests:', error);
      throw new Error(error.message || 'Failed to cancel pickup request');
    }
    
    if (!data?.success) {
      logger.error('Failed to cancel pickup request:', data?.error);
      throw new Error(data?.error || 'Failed to cancel pickup request');
    }
    
    logger.info(`Successfully canceled pickup request ${requestId}`);
  } catch (error) {
    logger.error('Error in cancelPickupRequest:', error);
    throw error;
  }
};