
import { supabase } from "@/integrations/supabase/client";
import { PickupRequest } from '@/types';
import { securePickupOperations } from '@/services/encryption/securePickupClient';

// Get all pickup requests that affect a parent's children (both own children and authorized children)
export const getParentAffectedPickupRequests = async (): Promise<PickupRequest[]> => {
  try {
    // Get current parent ID first
    const { data: parentId, error: parentError } = await supabase.rpc('get_current_parent_id');
    
    if (parentError || !parentId) {
      console.error('Failed to get current parent ID:', parentError);
      return [];
    }

    // Use secure encrypted operations
    const { data, error } = await securePickupOperations.getParentAffectedRequestsSecure(parentId);
    
    if (error) {
      console.error('Secure parent affected requests fetch failed:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getParentAffectedPickupRequests:', error);
    return [];
  }
};
