
import { supabase } from "@/integrations/supabase/client";
import { PickupRequest } from '@/types';

// Create a new pickup request - now defaults to 'pending' status
export const createPickupRequest = async (studentId: string): Promise<PickupRequest> => {
  try {
    console.log('Creating pickup request for student:', studentId);

    // Get the authenticated parent's ID from the server
    const { data: parentId, error: parentError } = await supabase.rpc('get_current_parent_id');

    if (parentError || !parentId) {
      console.error('Unable to determine current parent ID:', parentError);
      throw new Error('Authentication error.');
    }
    
    // Use the updated server-side helper to verify parent-student relationship or authorization
    const { data: isAuthorized, error: authError } = await supabase.rpc('is_parent_of_student', {
      student_id: studentId
    });

    if (authError) {
      console.error('Error checking parent authorization:', authError);
      throw new Error('Unable to verify parent authorization.');
    }

    if (!isAuthorized) {
      console.error('Parent is not authorized for this student');
      throw new Error('You are not authorized to request pickup for this student.');
    }

    console.log('Parent authorization verified via enhanced server function (includes pickup authorizations)');
    
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
