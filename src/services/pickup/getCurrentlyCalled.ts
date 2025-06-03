
import { supabase } from "@/integrations/supabase/client";
import { PickupRequestWithDetails } from '@/types/supabase';
import { getStudentById } from '@/services/studentService';
import { getClassById } from '@/services/classService';

// Get currently called pickup requests with details, optionally filtered by class
export const getCurrentlyCalled = async (classId?: string): Promise<PickupRequestWithDetails[]> => {
  try {
    console.log(`Fetching currently called with classId filter: ${classId || 'all'}`);
    
    // Base query to get called pickup requests
    const { data, error } = await supabase
      .from('pickup_requests')
      .select('*')
      .eq('status', 'called');
    
    if (error) {
      console.error('Error fetching called pickup requests:', error);
      throw new Error(error.message);
    }
    
    // Get student and class details for each request
    const requestsWithDetails = await Promise.all(data.map(async (req) => {
      const student = await getStudentById(req.student_id);
      const classInfo = student ? await getClassById(student.classId) : null;
      
      return {
        request: {
          id: req.id,
          childId: req.student_id,
          parentId: req.parent_id,
          requestTime: new Date(req.request_time),
          status: req.status as 'pending' | 'called' | 'completed' | 'cancelled'
        },
        child: student,
        class: classInfo
      };
    }));
    
    // Filter by class if a classId is provided and it's not 'all'
    if (classId && classId !== 'all') {
      console.log(`Filtering by classId: ${classId}`);
      const filtered = requestsWithDetails.filter(item => {
        if (!item.child || !item.class) {
          return false;
        }
        
        // Convert both IDs to strings for consistent comparison
        const childClassId = String(item.child.classId);
        const filterClassId = String(classId);
        
        const match = childClassId === filterClassId;
        console.log(`Comparing IDs: ${childClassId} vs ${filterClassId}, match: ${match}`);
        
        return match;
      });
      
      return filtered;
    }
    
    return requestsWithDetails;
  } catch (error) {
    console.error('Error in getCurrentlyCalled:', error);
    throw error;
  }
};
