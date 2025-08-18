
import { supabase } from "@/integrations/supabase/client";
import { PickupRequestWithDetails } from '@/types/supabase';
import { PickupRequest } from '@/types';
import { logger } from '@/utils/logger';

// Optimized function to get all pickup requests with details in a single query
export const getPickupRequestsWithDetailsBatch = async (
  statuses: string[] = ['pending', 'called'], 
  teacherClassIds?: string[]
): Promise<PickupRequestWithDetails[]> => {
  try {
    // Single query with joins to get all data at once, including parent information
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
      .in('status', statuses);

    // If teacher class IDs are provided, filter by those classes
    if (teacherClassIds && teacherClassIds.length > 0) {
      logger.info('Filtering pickup requests by teacherClassIds:', teacherClassIds);
      query = query.in('students.class_id', teacherClassIds);
    } else {
      logger.info('No teacherClassIds filter applied, teacherClassIds:', teacherClassIds);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching pickup requests with details:', error);
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
    logger.error('Error in getPickupRequestsWithDetailsBatch:', error);
    return [];
  }
};

// Optimized function for getting called students with class filtering
export const getCalledStudentsOptimized = async (
  classId?: string, 
  teacherClassIds?: string[]
): Promise<PickupRequestWithDetails[]> => {
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

    // Apply teacher class filter first if provided
    if (teacherClassIds && teacherClassIds.length > 0) {
      query = query.in('students.class_id', teacherClassIds);
    }
    // Apply single class filter if specified and no teacher filter
    else if (classId && classId !== 'all') {
      query = query.eq('students.class_id', classId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching called students:', error);
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
    logger.error('Error in getCalledStudentsOptimized:', error);
    return [];
  }
};
