// Re-export all pickup service functions for backwards compatibility
export { createPickupRequest } from './createPickupRequest';
export { updatePickupRequestStatus } from './updatePickupRequest';
export { getActivePickupRequests, getActivePickupRequestsForParent } from './getPickupRequests';
export { getCurrentlyCalled } from './getCurrentlyCalled';
export { migratePickupRequestsToSupabase } from './migratePickupRequests';
export { autoCompleteExpiredPickupRequests, startAutoCompletionProcess } from './autoCompletePickupRequests';

// Export new optimized functions
export { 
  getPickupRequestsWithDetailsBatch, 
  getCalledStudentsOptimized 
} from './optimizedPickupQueries';

export { getParentAffectedPickupRequests } from './getParentAffectedPickupRequests';
