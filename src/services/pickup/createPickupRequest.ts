
import { supabase } from "@/integrations/supabase/client";
import { PickupRequest } from '@/types';

// Create a new pickup request - now defaults to 'pending' status
export const createPickupRequest = async (studentId: string, parentId: string): Promise<PickupRequest> => {
  try {
    console.log(`Creating pickup request for student: ${studentId}, parent: ${parentId}`);
    
    const { data, error } = await supabase
      .from('pickup_requests')
      .insert({
        student_id: studentId,
        parent_id: parentId,
        status: 'pending' // Changed from 'called' to 'pending'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating pickup request:', error);
      throw new Error(error.message);
    }
    
    return {
      id: data.id,
      childId: data.student_id,
      parentId: data.parent_id,
      requestTime: new Date(data.request_time),
      status: data.status as 'pending' | 'called' | 'completed' | 'cancelled'
    };
  } catch (error) {
    console.error('Error in createPickupRequest:', error);
    throw error;
  }
};
