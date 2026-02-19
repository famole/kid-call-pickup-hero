import { supabase } from "@/integrations/supabase/client";
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

    // Step 1: Get direct children IDs + authorized children IDs + classes — all in parallel
    const currentDayOfWeek = new Date().getDay();
    const todayStr = new Date().toISOString().split('T')[0];

    const [childrenRelationsResult, authorizedChildrenResult, classesResult] = await Promise.all([
      supabase
        .from('student_parents')
        .select('student_id, is_primary')
        .eq('parent_id', parentData.id),
      supabase
        .from('pickup_authorizations')
        .select('student_id, student_ids, allowed_days_of_week')
        .eq('authorized_parent_id', parentData.id)
        .eq('is_active', true)
        .lte('start_date', todayStr)
        .gte('end_date', todayStr)
        .contains('allowed_days_of_week', [currentDayOfWeek]),
      secureClassOperations.getAll().catch((err: any) => {
        logger.error('Error fetching classes:', err);
        return [] as any[];
      }),
    ]);

    const { data: childrenRelations, error: childrenError } = childrenRelationsResult;
    if (childrenError) {
      logger.error('Error fetching children relations:', childrenError);
      throw new Error(childrenError.message);
    }

    const { data: authorizedChildren, error: authorizedError } = authorizedChildrenResult;
    if (authorizedError) {
      logger.error('Error fetching authorized children:', authorizedError);
      // Don't throw — just continue with empty
    }

    const classesData = Array.isArray(classesResult) ? classesResult : [];
    logger.log(`Fetched ${classesData?.length || 0} classes`);

    // Step 2: Collect all needed student IDs (direct + authorized) and fetch ONLY those
    const directStudentIds = childrenRelations?.map(r => r.student_id) || [];

    let authorizedStudentIds: string[] = [];
    if (authorizedChildren) {
      authorizedChildren.forEach(auth => {
        if (auth.student_ids && Array.isArray(auth.student_ids)) {
          authorizedStudentIds.push(...auth.student_ids);
        }
        if (auth.student_id) authorizedStudentIds.push(auth.student_id);
      });
    }
    authorizedStudentIds = [...new Set(authorizedStudentIds)];

    const allNeededIds = [...new Set([...directStudentIds, ...authorizedStudentIds])];

    // Step 3: Single targeted fetch — only the students this parent needs
    const { data: allStudents, error: studentsError } = await secureStudentOperations.getStudentsForParentSecure(allNeededIds);
    if (studentsError) {
      logger.error('Error fetching students:', studentsError);
      throw new Error(studentsError.message);
    }
    logger.log(`Fetched ${allStudents?.length || 0} students (targeted, not all)`);

    // Split into direct vs authorized from the single fetch
    const studentsData = allStudents?.filter(s => directStudentIds.includes(s.id)) || [];
    const authorizedStudentDetails = allStudents
      ?.filter(s => authorizedStudentIds.includes(s.id) && s.status !== 'withdrawn') || [];

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
        classId: student?.classId || '',
        className: getClassName(student?.classId || null),
        parentIds: [parentData.id],
        avatar: student?.avatar,
      };
    }) || [];

    const authorizedChildrenFormatted: Child[] = authorizedStudentDetails?.map(student => ({
      id: student.id,
      name: student.name,
      classId: student.classId || '',
      className: getClassName(student.classId || null),
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
