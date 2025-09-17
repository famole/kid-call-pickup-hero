
import { supabase } from "@/integrations/supabase/client";
import { PickupRequest } from '@/types';

// Get all pickup requests that affect a parent's children (both own children and authorized children)
export const getParentAffectedPickupRequests = async (): Promise<PickupRequest[]> => {
  try {
    // Use secure encrypted operations
    const { securePickupOperations } = await import('@/services/encryption/securePickupClient');
    const { data, error } = await securePickupOperations.getParentAffectedRequestsSecure();
    
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
