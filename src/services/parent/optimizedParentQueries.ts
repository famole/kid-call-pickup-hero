import { supabase } from "@/integrations/supabase/client";
import { secureOperations } from '@/services/encryption';
import { secureClassOperations } from '@/services/encryption/secureClassClient';
import { ParentWithStudents } from '@/types/parent';
import { Child } from '@/types';
import { getParentAffectedPickupRequests } from '@/services/pickup/getParentAffectedPickupRequests';
import { logger } from '@/utils/logger';
import { getCurrentParentIdCached } from '@/services/parent/getCurrentParentId';

export const getParentsWithStudentsOptimized = async (
  includeDeleted: boolean = false,
  deletedOnly: boolean = false,
  includedRoles?: string[],
  page: number = 1,
  pageSize: number = 50,
  searchTerm?: string
): Promise<{ parents: ParentWithStudents[]; totalCount: number; page: number; pageSize: number }> => {
  try {
    logger.log('Fetching optimized parents with students data...');
    logger.log('includedRoles filter:', includedRoles);
    logger.log('includeDeleted:', includeDeleted, 'deletedOnly:', deletedOnly);
    logger.log('page:', page, 'pageSize:', pageSize, 'searchTerm:', searchTerm);
    
    // Use secure operations for parent data - USE OPTIMIZED VERSION WITH ROLE FILTERING, PAGINATION, AND SEARCH
    const { data: result, error: parentsError } = await secureOperations.getParentsWithStudentsSecure(
      includedRoles, 
      includeDeleted,
      deletedOnly,
      page,
      pageSize,
      searchTerm
    );

    if (parentsError) {
      logger.error('Error fetching parents:', parentsError);
      throw new Error(parentsError.message);
    }

    if (!result || !result.parents) {
      logger.warn('No parents data returned');
      return { parents: [], totalCount: 0, page, pageSize };
    }

    const parentsData = result.parents;

    logger.log(`Fetched ${parentsData?.length || 0} parents from database (page ${result.page} of total ${result.totalCount})`);
    logger.log(`Include deleted was: ${includeDeleted}`);
    logger.log(`Parents with deleted_at:`, parentsData?.filter(p => p.deletedAt).length || 0);
    
    // Log role distribution for debugging
    const roleDistribution = parentsData?.reduce((acc, parent) => {
      const role = parent.role || 'no-role';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    logger.log('Role distribution:', roleDistribution);

    return {
      parents: parentsData || [],
      totalCount: result.totalCount || 0,
      page: result.page || page,
      pageSize: result.pageSize || pageSize
    };
  } catch (error) {
    logger.error('Error in getParentsWithStudentsOptimized:', error);
    throw error;
  }
};

export const getParentDashboardDataOptimized = async (parentIdentifier: string) => {
  try {
    logger.log('Fetching parent dashboard data for parent identifier:', parentIdentifier);

    // Get parent data using targeted query instead of fetching all parents
    const { data: parentData, error: parentError } = await secureOperations.getParentByIdentifierSecure(parentIdentifier);
    
    if (parentError) {
      logger.error('Error fetching parent:', parentError);
      throw new Error(parentError.message);
    }
    
    if (!parentData) {
      logger.error('No parent found for identifier:', parentIdentifier);
      return { allChildren: [] };
    }

    // Get direct children (via student_parents relationship) - get IDs only
    const { data: childrenRelations, error: childrenError } = await supabase
      .from('student_parents')
      .select(`
        student_id,
        is_primary
      `)
      .eq('parent_id', parentData.id);

    if (childrenError) {
      logger.error('Error fetching children relations:', childrenError);
      throw new Error(childrenError.message);
    }

    // Get student details using secure operations
    const studentIds = childrenRelations?.map(r => r.student_id) || [];
    let studentsData = [];
    if (studentIds.length > 0) {
      const { data: allStudents, error: studentsError } = await secureOperations.getStudentsSecure();
      if (studentsError) {
        logger.error('Error fetching students:', studentsError);
        throw new Error(studentsError.message);
      }
      studentsData = allStudents?.filter(s => studentIds.includes(s.id)) || [];
    }

    // Get all classes data to resolve class names using secure operations
    let classesData = [];
    try {
      classesData = await secureClassOperations.getAll();
      logger.log(`Fetched ${classesData?.length || 0} classes using secure operations`);
    } catch (error) {
      logger.error('Error fetching classes with secure operations:', error);
      // Don't throw, just log and continue with empty classes
    }

    // Get current day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    const currentDayOfWeek = new Date().getDay();
    
    // Get authorized children (excluding deleted students) - handle both old student_id and new student_ids
    const { data: authorizedChildren, error: authorizedError } = await supabase
      .from('pickup_authorizations')
      .select(`
        student_id,
        student_ids,
        allowed_days_of_week
      `)
      .eq('authorized_parent_id', parentData.id)
      .eq('is_active', true)
      .lte('start_date', new Date().toISOString().split('T')[0])
      .gte('end_date', new Date().toISOString().split('T')[0])
      .overlaps('allowed_days_of_week', [currentDayOfWeek]);

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
      const { data: allStudents, error: studentsError } = await secureOperations.getStudentsSecure();
      
      if (!studentsError && allStudents) {
        // Filter out deleted students and map to match expected structure
        authorizedStudentDetails = allStudents
          .filter(s => s && authorizedStudentIds.includes(s.id) && !s.deletedAt);
      }
    }

    if (authorizedError) {
      logger.error('Error fetching authorized children:', authorizedError);
      // Don't throw here, just log and continue
    }

    // Helper function to get class name
    const getClassName = (classId: string | null): string => {
      if (!classId || !classesData) return 'Unknown Class';
      const classData = classesData.find(c => c.id === classId);
      return classData?.name || 'Unknown Class';
    };

    // Combine and format children data with class names
    const directChildren: Child[] = childrenRelations?.map(relation => {
      const student = studentsData.find(s => s.id === relation.student_id);
      return {
        id: relation.student_id,
        name: student?.name || 'Unknown Student',
        classId: student?.class_id || '',
        className: getClassName(student?.class_id),
        parentIds: [parentData.id],
        avatar: student?.avatar,
      };
    }) || [];

    const authorizedChildrenFormatted: Child[] = authorizedStudentDetails?.map(student => ({
      id: student.id,
      name: student.name,
      classId: student.class_id || '',
      className: getClassName(student.class_id),
      parentIds: [parentData.id],
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

    logger.log(`Found ${allChildren.length} children for parent identifier ${parentIdentifier}`);

    return { allChildren };
  } catch (error) {
    logger.error('Error in getParentDashboardDataOptimized:', error);
    throw error;
  }
};

// Enhanced function that gets all pickup requests affecting a parent's children
export const getParentDashboardWithRealTimeData = async (parentIdentifier: string) => {
  try {
    logger.log('Fetching complete parent dashboard data for parent identifier:', parentIdentifier);
    
    // Get basic dashboard data
    const dashboardData = await getParentDashboardDataOptimized(parentIdentifier);
    
    // Get all pickup requests that affect this parent's children
    const affectedPickupRequests = await getParentAffectedPickupRequests();
    
    return {
      ...dashboardData,
      affectedPickupRequests
    };
  } catch (error) {
    logger.error('Error in getParentDashboardWithRealTimeData:', error);
    throw error;
  }
};
