
import { supabase } from "@/integrations/supabase/client";
import { PickupRequest } from '@/types';

// Create a new pickup request - now defaults to 'pending' status
export const createPickupRequest = async (studentId: string, parentId: string): Promise<PickupRequest> => {
  try {
    
    const { data, error } = await supabase
      .from('pickup_requests')
      .insert({
        student_id: studentId, // Now properly handled as UUID
        parent_id: parentId,   // Now properly handled as UUID
        status: 'pending',
        request_time: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating pickup request:', error);
      throw new Error(error.message);
    }
    
    return {
      id: data.id,
      studentId: data.student_id,
      parentId: data.parent_id,
      requestTime: new Date(data.request_time),
      status: data.status as 'pending' | 'called' | 'completed' | 'cancelled'
    };
  } catch (error) {
    console.error('Error in createPickupRequest:', error);
    throw error;
  }
};
