import { supabase } from "@/integrations/supabase/client";
import { ParentWithStudents } from '@/types/parent';
import { Child } from '@/types';
import { getParentAffectedPickupRequests } from '@/services/pickup/getParentAffectedPickupRequests';
import { logger } from '@/utils/logger';

export const getParentsWithStudentsOptimized = async (includeDeleted: boolean = false): Promise<ParentWithStudents[]> => {
  try {
    logger.log('Fetching optimized parents with students data...');
    
    let query = supabase
      .from('parents')
      .select(`
        id,
        name,
        email,
        username,
        phone,
        role,
        created_at,
        updated_at,
        deleted_at
      `);
    
    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }
    
    const { data: parentsData, error: parentsError } = await query.order('name');

    if (parentsError) {
      logger.error('Error fetching parents:', parentsError);
      throw new Error(parentsError.message);
    }

    logger.log(`Fetched ${parentsData?.length || 0} parents from database`);
    
    // Log role distribution for debugging
    const roleDistribution = parentsData?.reduce((acc, parent) => {
      const role = parent.role || 'no-role';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    logger.log('Role distribution:', roleDistribution);

    const { data: studentParentData, error: studentParentError } = await supabase
      .from('student_parents')
      .select(`
        id,
        parent_id,
        student_id,
        is_primary,
        relationship,
        students!inner (
          id,
          name,
          class_id,
          avatar,
          classes (
            id,
            name,
            grade
          )
        )
      `)
      .is('students.deleted_at', null);

    if (studentParentError) {
      logger.error('Error fetching student-parent relationships:', studentParentError);
      throw new Error(studentParentError.message);
    }

    logger.log(`Fetched ${studentParentData?.length || 0} student-parent relationships`);

    // Group students by parent ID
    const studentsByParent = studentParentData?.reduce((acc, relation) => {
      if (!acc[relation.parent_id]) {
        acc[relation.parent_id] = [];
      }
      acc[relation.parent_id].push({
        id: relation.students.id,
        name: relation.students.name,
        classId: relation.students.class_id,
        className: relation.students.classes?.name || 'No Class',
        grade: relation.students.classes?.grade || 'No Grade',
        isPrimary: relation.is_primary,
        avatar: relation.students.avatar,
        parentRelationshipId: relation.id,
        relationship: relation.relationship,
      });
      return acc;
    }, {} as Record<string, any[]>) || {};

    // Combine parents with their students - convert dates properly
    const parentsWithStudents: ParentWithStudents[] = parentsData?.map(parent => ({
      id: parent.id,
      name: parent.name,
      email: parent.email,
      username: parent.username,
      phone: parent.phone || '',
      role: parent.role || 'parent',
      students: studentsByParent[parent.id] || [],
      createdAt: new Date(parent.created_at),
      updatedAt: new Date(parent.updated_at),
      deletedAt: parent.deleted_at ? new Date(parent.deleted_at) : undefined,
    })) || [];

    logger.log(`Returning ${parentsWithStudents.length} parents with students data`);
    
    // Log teachers specifically for debugging
    const teachers = parentsWithStudents.filter(p => p.role === 'teacher');
    logger.log(`Found ${teachers.length} teachers:`, teachers.map(t => ({ name: t.name, role: t.role })));

    return parentsWithStudents;
  } catch (error) {
    logger.error('Error in getParentsWithStudentsOptimized:', error);
    throw error;
  }
};

export const getParentDashboardDataOptimized = async (parentEmail: string) => {
  try {
    logger.log('Fetching parent dashboard data for:', parentEmail);

    // Get parent ID first (excluding deleted)
    const { data: parentData, error: parentError } = await supabase
      .from('parents')
      .select('id')
      .eq('email', parentEmail)
      .is('deleted_at', null)
      .single();

    if (parentError) {
      logger.error('Error fetching parent:', parentError);
      throw new Error(parentError.message);
    }

    if (!parentData) {
      logger.error('No parent found for email:', parentEmail);
      return { allChildren: [] };
    }

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
      .eq('student_parents.parent_id', parentData.id)
      .is('deleted_at', null);

    if (childrenError) {
      logger.error('Error fetching children:', childrenError);
      throw new Error(childrenError.message);
    }

    // Get authorized children (excluding deleted students) - handle both old student_id and new student_ids
    const { data: authorizedChildren, error: authorizedError } = await supabase
      .from('pickup_authorizations')
      .select(`
        student_id,
        student_ids
      `)
      .eq('authorized_parent_id', parentData.id)
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
      parentIds: [parentData.id],
      avatar: child.avatar,
    })) || [];

    const authorizedChildrenFormatted: Child[] = authorizedStudentDetails?.map(student => ({
      id: student.id,
      name: student.name,
      classId: student.class_id || '',
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

    logger.log(`Found ${allChildren.length} children for parent ${parentEmail}`);

    return { allChildren };
  } catch (error) {
    logger.error('Error in getParentDashboardDataOptimized:', error);
    throw error;
  }
};

// Enhanced function that gets all pickup requests affecting a parent's children
export const getParentDashboardWithRealTimeData = async (parentEmail: string) => {
  try {
    logger.log('Fetching complete parent dashboard data for:', parentEmail);
    
    // Get basic dashboard data
    const dashboardData = await getParentDashboardDataOptimized(parentEmail);
    
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
