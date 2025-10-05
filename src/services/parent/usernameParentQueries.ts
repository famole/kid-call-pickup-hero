import { supabase } from "@/integrations/supabase/client";
import { Child, PickupRequest } from '@/types';
import { logger } from '@/utils/logger';

// Direct parent dashboard data fetch using parent ID (for username-only users)
export const getParentDashboardDataByParentId = async (parentId: string) => {
  try {
    logger.log('Fetching parent dashboard data for parent ID:', parentId);

    // Get direct children (via student_parents relationship) - get IDs only
    const { data: childrenRelations, error: childrenError } = await supabase
      .from('student_parents')
      .select(`
        student_id,
        is_primary
      `)
      .eq('parent_id', parentId);

    if (childrenError) {
      logger.error('Error fetching children relations:', childrenError);
      throw new Error(childrenError.message);
    }

    // Get student details using secure operations
    const studentIds = childrenRelations?.map(r => r.student_id) || [];
    let studentsData = [];
    if (studentIds.length > 0) {
      const { secureOperations } = await import('@/services/encryption');
      const { data: allStudents, error: studentsError } = await secureOperations.getStudentsSecure();
      if (studentsError) {
        logger.error('Error fetching students:', studentsError);
        throw new Error(studentsError.message);
      }
      studentsData = allStudents?.filter(s => studentIds.includes(s.id)) || [];
    }

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

    // Get student details for authorized students using secure operations
    let authorizedStudentDetails = [];
    if (authorizedStudentIds.length > 0) {
      const { secureOperations } = await import('@/services/encryption');
      const { data: allStudents, error: studentsError } = await secureOperations.getStudentsSecure();
      
      if (!studentsError && allStudents) {
        authorizedStudentDetails = allStudents.filter(s => authorizedStudentIds.includes(s.id));
      }
    }

    if (authorizedError) {
      logger.error('Error fetching authorized children:', authorizedError);
      // Don't throw here, just log and continue
    }

    // Combine and format children data
    const directChildren: Child[] = childrenRelations?.map(relation => {
      const student = studentsData.find(s => s.id === relation.student_id);
      return {
        id: relation.student_id,
        name: student?.name || 'Unknown Student',
        classId: student?.class_id || '',
        parentIds: [parentId],
        avatar: student?.avatar,
      };
    }) || [];

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

    // First: Get pickup requests made BY this parent (their own requests)
    const { data: ownRequests, error: ownRequestsError } = await supabase
      .from('pickup_requests')
      .select('*')
      .eq('parent_id', parentId)
      .in('status', ['pending', 'called']);

    console.log('🔍 DEBUG - Own pickup requests query result:', {
      parentId,
      ownRequests: ownRequests || [],
      error: ownRequestsError?.message
    });

    if (ownRequestsError) {
      logger.error('Error fetching own pickup requests:', ownRequestsError);
      // Continue to try getting authorized requests even if own requests fail
    }

    // Second: Get pickup requests FOR children this parent is authorized to pick up (made by other parents)
    const [ownChildren, authorizedChildren] = await Promise.all([
      supabase
        .from('student_parents')
        .select('student_id')
        .eq('parent_id', parentId),
      supabase
        .from('pickup_authorizations')
        .select('student_id, student_ids')
        .eq('authorized_parent_id', parentId)
        .eq('is_active', true)
        .lte('start_date', new Date().toISOString().split('T')[0])
        .gte('end_date', new Date().toISOString().split('T')[0])
    ]);

    let authorizedRequests: any[] = [];
    
    if (!ownChildren.error && !authorizedChildren.error) {
      // Combine all student IDs this parent can pick up
      let allStudentIds = [
        ...(ownChildren.data?.map(sp => sp.student_id) || [])
      ];

      // Handle authorized children - both old and new format
      if (authorizedChildren.data) {
        authorizedChildren.data.forEach(auth => {
          if (auth.student_ids && Array.isArray(auth.student_ids)) {
            allStudentIds.push(...auth.student_ids);
          }
          if (auth.student_id) {
            allStudentIds.push(auth.student_id);
          }
        });
      }

      // Remove duplicates
      const uniqueStudentIds = [...new Set(allStudentIds)];

      if (uniqueStudentIds.length > 0) {
        // Get requests for these children made by OTHER parents
        const { data: authRequests, error: authError } = await supabase
          .from('pickup_requests')
          .select('*')
          .in('student_id', uniqueStudentIds)
          .in('status', ['pending', 'called'])
          .neq('parent_id', parentId); // Exclude own requests

        console.log('🔍 DEBUG - Authorized pickup requests query result:', {
          uniqueStudentIds,
          authRequests: authRequests || [],
          error: authError?.message
        });

        if (!authError && authRequests) {
          authorizedRequests = authRequests;
        }
      }
    }

    // Combine own requests and authorized requests
    const allRequests = [
      ...(ownRequests || []),
      ...authorizedRequests
    ];

    console.log('🔍 DEBUG - Combined requests:', {
      ownRequestsCount: ownRequests?.length || 0,
      authorizedRequestsCount: authorizedRequests.length,
      totalRequests: allRequests.length
    });

    // Get parent information for each request
    const requestsWithParents = await Promise.all(
      allRequests.map(async (req) => {
        // Use optimized operation to get parent data
        const { secureOperations } = await import('@/services/encryption');
        const { data: parentData } = await secureOperations.getParentByEmailSecure(`${req.parent_id}@placeholder.com`);

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