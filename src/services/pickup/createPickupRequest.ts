
import { supabase } from "@/integrations/supabase/client";
import { PickupRequest } from '@/types';

// Create a new pickup request - now defaults to 'pending' status
export const createPickupRequest = async (studentId: string, parentId: string): Promise<PickupRequest> => {
  try {
    console.log('Creating pickup request for student:', studentId, 'parent:', parentId);
    
    // First, verify that the parent has permission to request pickup for this student
    const { data: relationshipCheck, error: relationshipError } = await supabase
      .from('student_parents')
      .select('id')
      .eq('student_id', studentId)
      .eq('parent_id', parentId)
      .single();

    if (relationshipError || !relationshipCheck) {
      console.error('Parent is not authorized for this student:', relationshipError);
      throw new Error('You are not authorized to request pickup for this student.');
    }

    console.log('Parent authorization verified');
    
    const { data, error } = await supabase
      .from('pickup_requests')
      .insert({
        student_id: studentId,
        parent_id: parentId,
        status: 'pending',
        request_time: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating pickup request:', error);
      throw new Error(error.message);
    }
    
    console.log('Pickup request created successfully:', data.id);
    
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
