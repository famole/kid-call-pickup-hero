
import { PickupRequest } from '@/types';
import { securePickupOperations } from '@/services/encryption/securePickupClient';
import { getCurrentParentId } from '@/services/auth/parentIdResolver';

// Get all pickup requests that affect a parent's children (both own children and authorized children)
export const getParentAffectedPickupRequests = async (): Promise<PickupRequest[]> => {
  try {
    // Get current parent ID with fallback methods
    const parentId = await getCurrentParentId();
    
    if (!parentId) {
      console.error('Failed to get current parent ID with all methods');
      return [];
    }

    console.log('🔍 Using parent ID for pickup requests:', parentId);

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
