
import { supabase } from "@/integrations/supabase/client";
import { PickupRequestWithDetails } from '@/types/supabase';
import { getStudentById } from '@/services/studentService';
import { getClassById } from '@/services/classService';

// Function to check if a string is a valid UUID
const isValidUUID = (id: string): boolean => {
  if (!id) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

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
    
    // Filter out requests with invalid student IDs
    const validRequests = data.filter(req => {
      const isValid = isValidUUID(req.student_id) && isValidUUID(req.parent_id);
      if (!isValid) {
        console.warn(`Filtering out called request ${req.id} with invalid IDs: student_id=${req.student_id}, parent_id=${req.parent_id}`);
      }
      return isValid;
    });
    
    console.log(`Found ${validRequests.length} valid called requests`);
    
    // Get student and class details for each request
    const requestsWithDetails = await Promise.all(validRequests.map(async (req) => {
      try {
        const student = await getStudentById(req.student_id);
        let classInfo = null;
        
        if (student && student.classId && isValidUUID(student.classId)) {
          try {
            classInfo = await getClassById(student.classId);
          } catch (classError) {
            console.error(`Error fetching class ${student.classId}:`, classError);
          }
        }
        
        return {
          request: {
            id: req.id,
            studentId: req.student_id,
            parentId: req.parent_id,
            requestTime: new Date(req.request_time),
            status: req.status as 'pending' | 'called' | 'completed' | 'cancelled'
          },
          child: student,
          class: classInfo
        };
      } catch (error) {
        console.error(`Error fetching details for request ${req.id}:`, error);
        // Return null for problematic requests and filter them out later
        return null;
      }
    }));
    
    // Filter out null results (failed requests)
    const validRequestsWithDetails = requestsWithDetails.filter(item => item !== null) as PickupRequestWithDetails[];
    
    // Filter by class if a classId is provided and it's not 'all'
    if (classId && classId !== 'all') {
      console.log(`Filtering by classId: ${classId}`);
      const filtered = validRequestsWithDetails.filter(item => {
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
    
    return validRequestsWithDetails;
  } catch (error) {
    console.error('Error in getCurrentlyCalled:', error);
    throw error;
  }
};
