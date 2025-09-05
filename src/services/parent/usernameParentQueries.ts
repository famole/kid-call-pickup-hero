import { supabase } from "@/integrations/supabase/client";
import { Child, PickupRequest } from '@/types';
import { logger } from '@/utils/logger';

// Direct parent dashboard data fetch using parent ID (for username-only users)
export const getParentDashboardDataByParentId = async (parentId: string) => {
  try {
    logger.log('Fetching parent dashboard data for parent ID:', parentId);

    // Get all children this parent has access to (direct children + authorized children)
    const { data: childrenData, error: childrenError } = await supabase
      .from('students')
      .select(`
        id,
        name,
        class_id,
        avatar,
        student_parents!inner (
          parent_id,
          is_primary
        )
      `)
      .eq('student_parents.parent_id', parentId)
      .is('deleted_at', null);

    if (childrenError) {
      logger.error('Error fetching children:', childrenError);
      throw new Error(childrenError.message);
    }

    // Get authorized children - handle both old student_id and new student_ids
    const { data: authorizedChildren, error: authorizedError } = await supabase
      .from('pickup_authorizations')
      .select(`
        student_id,
        student_ids
      `)
      .eq('authorized_parent_id', parentId)
      .eq('is_active', true)
      .lte('start_date', new Date().toISOString().split('T')[0])
      .gte('end_date', new Date().toISOString().split('T')[0]);

    // Get student details for all authorized students
    let authorizedStudentIds: string[] = [];
    if (authorizedChildren) {
      authorizedChildren.forEach(auth => {
        // Handle new student_ids array field
        if (auth.student_ids && Array.isArray(auth.student_ids)) {
          authorizedStudentIds.push(...auth.student_ids);
        }
        // Handle old student_id field for backward compatibility
        if (auth.student_id) {
          authorizedStudentIds.push(auth.student_id);
        }
      });
    }

    // Remove duplicates
    authorizedStudentIds = [...new Set(authorizedStudentIds)];

    // Get student details for authorized students
    let authorizedStudentDetails = [];
    if (authorizedStudentIds.length > 0) {
      const { data: studentDetails, error: studentsError } = await supabase
        .from('students')
        .select('id, name, class_id, avatar')
        .in('id', authorizedStudentIds)
        .is('deleted_at', null);

      if (!studentsError && studentDetails) {
        authorizedStudentDetails = studentDetails;
      }
    }

    if (authorizedError) {
      logger.error('Error fetching authorized children:', authorizedError);
      // Don't throw here, just log and continue
    }

    // Combine and format children data
    const directChildren: Child[] = childrenData?.map(child => ({
      id: child.id,
      name: child.name,
      classId: child.class_id || '',
      parentIds: [parentId],
      avatar: child.avatar,
    })) || [];

    const authorizedChildrenFormatted: Child[] = authorizedStudentDetails?.map(student => ({
      id: student.id,
      name: student.name,
      classId: student.class_id || '',
      parentIds: [parentId],
      avatar: student.avatar,
    })) || [];

    // Remove duplicates and combine
    const allChildrenMap = new Map<string, Child>();
    
    directChildren.forEach(child => {
      allChildrenMap.set(child.id, { ...child, isAuthorized: false });
    });

    authorizedChildrenFormatted.forEach(child => {
      if (!allChildrenMap.has(child.id)) {
        allChildrenMap.set(child.id, { ...child, isAuthorized: true });
      }
    });

    const allChildren = Array.from(allChildrenMap.values());

    logger.log(`Found ${allChildren.length} children for parent ID ${parentId}`);

    return { allChildren };
  } catch (error) {
    logger.error('Error in getParentDashboardDataByParentId:', error);
    throw error;
  }
};

// Direct pickup requests fetch using parent ID (for username-only users)
export const getActivePickupRequestsForParentId = async (parentId: string): Promise<PickupRequest[]> => {
  try {
    logger.log('Fetching pickup requests for parent ID:', parentId);

    // Get all children this parent can see (own children + authorized children)
    const [ownChildren, authorizedChildren] = await Promise.all([
      // Own children
      supabase
        .from('student_parents')
        .select('student_id')
        .eq('parent_id', parentId),
      
      // Children they're authorized to pick up
      supabase
        .from('pickup_authorizations')
        .select('student_id, student_ids')
        .eq('authorized_parent_id', parentId)
        .eq('is_active', true)
        .lte('start_date', new Date().toISOString().split('T')[0])
        .gte('end_date', new Date().toISOString().split('T')[0])
    ]);

    if (ownChildren.error || authorizedChildren.error) {
      logger.error('Error fetching children:', ownChildren.error || authorizedChildren.error);
      return [];
    }

    // Combine all student IDs
    let allStudentIds = [
      ...(ownChildren.data?.map(sp => sp.student_id) || [])
    ];

    // Handle authorized children - both old and new format
    if (authorizedChildren.data) {
      authorizedChildren.data.forEach(auth => {
        // Handle new student_ids array field
        if (auth.student_ids && Array.isArray(auth.student_ids)) {
          allStudentIds.push(...auth.student_ids);
        }
        // Handle old student_id field for backward compatibility
        if (auth.student_id) {
          allStudentIds.push(auth.student_id);
        }
      });
    }

    // Remove duplicates
    const uniqueStudentIds = [...new Set(allStudentIds)];

    if (uniqueStudentIds.length === 0) {
      logger.log('No students found for parent ID:', parentId);
      return [];
    }

    logger.log('Found students for parent:', uniqueStudentIds.length);

    // Get all active pickup requests for these children  
    const { data: requests, error: requestsError } = await supabase
      .from('pickup_requests')
      .select('*')
      .in('student_id', uniqueStudentIds)
      .in('status', ['pending', 'called']);

    if (requestsError) {
      logger.error('Error fetching pickup requests:', requestsError);
      return [];
    }

    // Get parent information for each request
    const requestsWithParents = await Promise.all(
      (requests || []).map(async (req) => {
        const { data: parentData } = await supabase
          .from('parents')
          .select('id, name, email')
          .eq('id', req.parent_id)
          .single();

        return {
          id: req.id,
          studentId: req.student_id,
          parentId: req.parent_id,
          requestTime: new Date(req.request_time),
          status: req.status as 'pending' | 'called' | 'completed' | 'cancelled',
          requestingParent: parentData ? {
            id: parentData.id,
            name: parentData.name,
            email: parentData.email
          } : undefined
        };
      })
    );

    logger.log(`Found ${requestsWithParents.length} pickup requests for parent ID ${parentId}`);
    return requestsWithParents;
  } catch (error) {
    logger.error('Error in getActivePickupRequestsForParentId:', error);
    return [];
  }
};

// Function to create a pickup request using the secure database function
export const createPickupRequestForUsernameUser = async (studentId: string, parentId: string): Promise<string> => {
  try {
    logger.log('Creating pickup request for username user:', { studentId, parentId });
    
    const { data: requestId, error } = await supabase.rpc('create_pickup_request_for_username_user', {
      p_student_id: studentId,
      p_parent_id: parentId
    });

    if (error) {
      logger.error('Error creating pickup request:', error);
      throw error;
    }

    logger.log('Successfully created pickup request with ID:', requestId);
    return requestId;
  } catch (error) {
    logger.error('Error in createPickupRequestForUsernameUser:', error);
    throw error;
  }
};

// Function to get pickup request status updates for notifications
export const getPickupRequestsByStudentIds = async (studentIds: string[]): Promise<PickupRequest[]> => {
  try {
    if (studentIds.length === 0) return [];
    
    logger.log('Fetching pickup requests for student IDs:', studentIds);
    
    const { data: requests, error } = await supabase
      .from('pickup_requests')
      .select('*')
      .in('student_id', studentIds)
      .in('status', ['pending', 'called', 'completed']);

    if (error) {
      logger.error('Error fetching pickup requests by student IDs:', error);
      throw error;
    }

    logger.log('Found pickup requests for students:', requests?.length || 0);

    return (requests || []).map(request => ({
      id: request.id,
      studentId: request.student_id,
      parentId: request.parent_id,
      requestTime: new Date(request.request_time),
      status: request.status as 'pending' | 'called' | 'completed' | 'cancelled'
    }));
  } catch (error) {
    logger.error('Error in getPickupRequestsByStudentIds:', error);
    throw error;
  }
};