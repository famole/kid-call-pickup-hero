import { secureOperations } from '@/services/encryption';
import { secureClassOperations } from '@/services/encryption/secureClassClient';
import { secureStudentOperations } from '@/services/encryption/secureStudentClient';
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

    // Get parent data using targeted query
    const { data: parentData, error: parentError } = await secureOperations.getParentByIdentifierSecure(parentIdentifier);
    
    if (parentError) {
      logger.error('Error fetching parent:', parentError);
      throw new Error(parentError.message);
    }
    
    if (!parentData) {
      logger.error('No parent found for identifier:', parentIdentifier);
      return { allChildren: [] };
    }

    // Single endpoint resolves everything server-side: student_parents + pickup_authorizations + student details
    const [dashboardResult, classesData] = await Promise.all([
      secureStudentOperations.getStudentsForParentDashboardSecure(parentData.id),
      secureClassOperations.getAll().catch((err: any) => {
        logger.error('Error fetching classes:', err);
        return [] as any[];
      }),
    ]);

    if (dashboardResult.error) {
      logger.error('Error fetching dashboard students:', dashboardResult.error);
      throw new Error(dashboardResult.error.message || 'Failed to fetch students');
    }

    const { directChildren: directStudents, authorizedChildren: authorizedStudents } = dashboardResult.data || { directChildren: [], authorizedChildren: [] };
    const classes = Array.isArray(classesData) ? classesData : [];

    logger.log(`Dashboard: ${directStudents.length} direct, ${authorizedStudents.length} authorized children`);

    // Helper function to get class name
    const getClassName = (classId: string | null): string => {
      if (!classId || !classes) return 'Unknown Class';
      const classData = classes.find(c => c.id === classId);
      return classData?.name || 'Unknown Class';
    };

    // Format children data with class names
    const allChildrenMap = new Map<string, Child>();

    directStudents.forEach(student => {
      allChildrenMap.set(student.id, {
        id: student.id,
        name: student.name,
        classId: student.classId || '',
        className: getClassName(student.classId || null),
        parentIds: [parentData.id],
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
          className: getClassName(student.classId || null),
          parentIds: [parentData.id],
          avatar: student.avatar,
          isAuthorized: true,
        });
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
