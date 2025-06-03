
import { supabase } from "@/integrations/supabase/client";
import { PickupRequest } from '@/types';

// Migrate pickup request data from mock to Supabase
export const migratePickupRequestsToSupabase = async (requests: PickupRequest[]): Promise<void> => {
  try {
    const { error } = await supabase
      .from('pickup_requests')
      .upsert(
        requests.map(request => ({
          id: request.id,
          student_id: request.childId,
          parent_id: request.parentId,
          request_time: request.requestTime.toISOString(),
          status: request.status
        }))
      );
    
    if (error) {
      console.error('Error migrating pickup requests:', error);
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Error in migratePickupRequestsToSupabase:', error);
    throw error;
  }
};
