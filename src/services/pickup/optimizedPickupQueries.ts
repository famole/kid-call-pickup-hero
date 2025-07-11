
import { supabase } from "@/integrations/supabase/client";
import { PickupRequestWithDetails } from '@/types/supabase';
import { PickupRequest } from '@/types';

// Optimized function to get all pickup requests with details in a single query
export const getPickupRequestsWithDetailsBatch = async (statuses: string[] = ['pending', 'called']): Promise<PickupRequestWithDetails[]> => {
  try {
    // Single query with joins to get all data at once, including parent information
    const { data, error } = await supabase
      .from('pickup_requests')
      .select(`
        *,
        students!inner (
          id,
          name,
          class_id,
          avatar,
          classes (
            id,
            name,
            grade,
            teacher
          )
        ),
        parents!inner (
          id,
          name,
          email
        )
      `)
      .in('status', statuses);

    if (error) {
      console.error('Error fetching pickup requests with details:', error);
      throw new Error(error.message);
    }

    // Transform the data to match our expected format
    return data.map(req => ({
      request: {
        id: req.id,
        studentId: req.student_id,
        parentId: req.parent_id,
        requestTime: new Date(req.request_time),
        status: req.status as 'pending' | 'called' | 'completed' | 'cancelled'
      },
      child: req.students ? {
        id: req.students.id,
        name: req.students.name,
        classId: req.students.class_id || '',
        parentIds: [req.parent_id],
        avatar: req.students.avatar
      } : null,
      class: req.students?.classes ? {
        id: req.students.classes.id,
        name: req.students.classes.name,
        grade: req.students.classes.grade,
        teacher: req.students.classes.teacher
      } : null,
      parent: req.parents ? {
        id: req.parents.id,
        name: req.parents.name,
        email: req.parents.email
      } : null
    }));
  } catch (error) {
    console.error('Error in getPickupRequestsWithDetailsBatch:', error);
    return [];
  }
};

// Optimized function for getting called students with class filtering
export const getCalledStudentsOptimized = async (classId?: string): Promise<PickupRequestWithDetails[]> => {
  try {
    let query = supabase
      .from('pickup_requests')
      .select(`
        *,
        students!inner (
          id,
          name,
          class_id,
          avatar,
          classes (
            id,
            name,
            grade,
            teacher
          )
        ),
        parents!inner (
          id,
          name,
          email
        )
      `)
      .eq('status', 'called');

    // Apply class filter at database level if specified
    if (classId && classId !== 'all') {
      query = query.eq('students.class_id', classId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching called students:', error);
      throw new Error(error.message);
    }

    return data.map(req => ({
      request: {
        id: req.id,
        studentId: req.student_id,
        parentId: req.parent_id,
        requestTime: new Date(req.request_time),
        status: req.status as 'pending' | 'called' | 'completed' | 'cancelled'
      },
      child: req.students ? {
        id: req.students.id,
        name: req.students.name,
        classId: req.students.class_id || '',
        parentIds: [req.parent_id],
        avatar: req.students.avatar
      } : null,
      class: req.students?.classes ? {
        id: req.students.classes.id,
        name: req.students.classes.name,
        grade: req.students.classes.grade,
        teacher: req.students.classes.teacher
      } : null,
      parent: req.parents ? {
        id: req.parents.id,
        name: req.parents.name,
        email: req.parents.email
      } : null
    }));
  } catch (error) {
    console.error('Error in getCalledStudentsOptimized:', error);
    return [];
  }
};
