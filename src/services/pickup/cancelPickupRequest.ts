import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
import { getCurrentParentId } from '@/services/auth/parentIdResolver';
import { getCachedAuthUser } from '@/services/auth/getCachedAuthUser';
import { encryptData } from "@/services/encryption/encryptionService";

// Cancel a pickup request by setting its status to 'cancelled' using the secure endpoint
export const cancelPickupRequest = async (requestId: string): Promise<void> => {
  try {
    logger.info('Canceling pickup request:', requestId);

    // Resolve parent (app) ID with robust fallbacks
    let resolvedParentId: string | null = await getCurrentParentId();

    // Fallback 1: username session/localStorage
    if (!resolvedParentId) {
      const usernameParentId = localStorage.getItem('username_parent_id');
      if (usernameParentId) {
        resolvedParentId = usernameParentId;
      } else {
        const usernameSession = localStorage.getItem('username_session');
        if (usernameSession) {
          try {
            const sessionData = JSON.parse(usernameSession);
            if (sessionData?.id) resolvedParentId = sessionData.id;
          } catch (e) {
            logger.warn('Failed to parse username_session during cancel fallback:', e);
          }
        }
      }
    }

    // Fallback 2: find parent by auth user email via secure-parents
    if (!resolvedParentId) {
      const user = await getCachedAuthUser();
      const email = user?.email;
      if (email) {
        try {
          const { secureOperations } = await import('@/services/encryption');
          const { data: parents } = await secureOperations.getParentsSecure(false);
          const byEmail = parents?.find((p: { id: string; email?: string }) => p.email === email);
          if (byEmail?.id) resolvedParentId = byEmail.id;
        } catch (e) {
          logger.warn('Fallback secure-parents lookup failed:', e);
        }
      }
    }

    // Fallback 3: direct RPC as last attempt
    if (!resolvedParentId) {
      try {
        const { data: rpcParentId, error: rpcErr } = await supabase.rpc('get_current_parent_id');
        if (rpcErr) {
          logger.warn('RPC get_current_parent_id fallback error:', rpcErr);
        }
        if (rpcParentId) resolvedParentId = rpcParentId as string;
      } catch (e) {
        logger.warn('RPC get_current_parent_id fallback threw:', e);
      }
    }

    // Prepare the request payload
    // Build payload; if parentId couldn't be resolved, still invoke endpoint with requestId only
    const payload: Record<string, unknown> = { requestId };
    if (resolvedParentId) {
      payload.parentId = resolvedParentId;
    } else {
      logger.warn('Proceeding to cancel without resolved parentId; server will validate ownership.');
    }
    
    // Encrypt the payload
    logger.info('Invoking secure-pickup-requests.cancelPickupRequest with payload keys:', Object.keys(payload));
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
    
    // Edge function returns: { data: { success: true, request: {...} }, error: null }
    // supabase.functions.invoke wraps this as: { data: { data: {...}, error: null } }
    if (!data?.data?.success) {
      logger.error('Failed to cancel pickup request:', data?.error);
      throw new Error(data?.error || 'Failed to cancel pickup request');
    }
    
    logger.info(`Successfully canceled pickup request ${requestId}`);
  } catch (error) {
    logger.error('Error in cancelPickupRequest:', error);
    throw error;
  }
};