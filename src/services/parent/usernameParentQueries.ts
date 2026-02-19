import { supabase } from "@/integrations/supabase/client";
import { Child, PickupRequest } from '@/types';
import { logger } from '@/utils/logger';

// Direct parent dashboard data fetch using parent ID (for username-only users)
export const getParentDashboardDataByParentId = async (parentId: string) => {
  try {
    logger.log('Fetching parent dashboard data for parent ID:', parentId);

    // Single endpoint resolves everything server-side
    const { secureStudentOperations } = await import('@/services/encryption/secureStudentClient');
    const { data: dashboardData, error: dashboardError } = await secureStudentOperations.getStudentsForParentDashboardSecure(parentId);

    if (dashboardError) {
      logger.error('Error fetching dashboard students:', dashboardError);
      throw new Error(dashboardError.message || 'Failed to fetch dashboard data');
    }

    const { directChildren: directStudents, authorizedChildren: authorizedStudents } = dashboardData || { directChildren: [], authorizedChildren: [] };

    // Combine and format children data
    const allChildrenMap = new Map<string, Child>();

    directStudents.forEach(student => {
      allChildrenMap.set(student.id, {
        id: student.id,
        name: student.name,
        classId: student.classId || '',
        parentIds: [parentId],
        avatar: student.avatar,
        isAuthorized: false,
      });
    });

    authorizedStudents.forEach(student => {
      if (!allChildrenMap.has(student.id)) {
        allChildrenMap.set(student.id, {
          id: student.id,
          name: student.name,
          classId: student.classId || '',
          parentIds: [parentId],
          avatar: student.avatar,
          isAuthorized: true,
        });
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

    logger.info('🔍 DEBUG - Own pickup requests query result:', {
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

        logger.info('🔍 DEBUG - Authorized pickup requests query result:', {
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

    logger.info('🔍 DEBUG - Combined requests:', {
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