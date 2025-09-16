import { supabase } from "@/integrations/supabase/client";
import { secureOperations } from '@/services/encryption';
import { ParentWithStudents } from '@/types/parent';
import { Child } from '@/types';
import { getParentAffectedPickupRequests } from '@/services/pickup/getParentAffectedPickupRequests';
import { logger } from '@/utils/logger';

export const getParentsWithStudentsOptimized = async (includeDeleted: boolean = false): Promise<ParentWithStudents[]> => {
  try {
    logger.log('Fetching optimized parents with students data...');
    
    // Use secure operations for parent data
    const { data: parentsData, error: parentsError } = await secureOperations.getParentsSecure(includeDeleted);

    if (parentsError) {
      logger.error('Error fetching parents:', parentsError);
      throw new Error(parentsError.message);
    }

    logger.log(`Fetched ${parentsData?.length || 0} parents from database`);
    logger.log(`Include deleted was: ${includeDeleted}`);
    logger.log(`Parents with deleted_at:`, parentsData?.filter(p => p.deleted_at).length || 0);
    
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
        relationship
      `)
      .is('deleted_at', null);

    if (studentParentError) {
      logger.error('Error fetching student-parent relationships:', studentParentError);
      throw new Error(studentParentError.message);
    }

    logger.log(`Fetched ${studentParentData?.length || 0} student-parent relationships`);

    // Get students data using secure operations
    const { data: studentsData, error: studentsError } = await secureOperations.getStudentsSecure();

    if (studentsError) {
      logger.error('Error fetching students:', studentsError);
      throw new Error(studentsError.message);
    }

    // Get classes data separately
    const { data: classesData, error: classesError } = await supabase
      .from('classes')
      .select('id, name, grade');

    if (classesError) {
      logger.error('Error fetching classes:', classesError);
      throw new Error(classesError.message);
    }

    if (studentParentError) {
      logger.error('Error fetching student-parent relationships:', studentParentError);
      throw new Error(studentParentError.message);
    }

    logger.log(`Fetched ${studentParentData?.length || 0} student-parent relationships`);

    // Get current day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    const currentDayOfWeek = new Date().getDay();
    
    // Get pickup authorizations for family members
    const { data: authorizationData, error: authError } = await supabase
      .from('pickup_authorizations')
      .select(`
        authorized_parent_id,
        student_id,
        student_ids,
        is_active,
        start_date,
        end_date,
        allowed_days_of_week,
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
      .eq('is_active', true)
      .is('students.deleted_at', null)
      .gte('end_date', new Date().toISOString().split('T')[0]) // Only current/future authorizations
      .contains('allowed_days_of_week', [currentDayOfWeek]); // Only authorizations valid for today

    if (authError) {
      logger.warn('Error loading pickup authorizations:', authError);
    }

    // Group students by parent ID
    const studentsByParent = studentParentData?.reduce((acc, relation) => {
      if (!acc[relation.parent_id]) {
        acc[relation.parent_id] = [];
      }
      
      // Find student and class data
      const student = studentsData?.find(s => s.id === relation.student_id);
      const studentClass = classesData?.find(c => c.id === student?.class_id);
      
      if (student) {
        acc[relation.parent_id].push({
          id: student.id,
          name: student.name,
          classId: student.class_id,
          className: studentClass?.name || 'No Class',
          grade: studentClass?.grade || 'No Grade',
          isPrimary: relation.is_primary,
          avatar: student.avatar,
          parentRelationshipId: relation.id,
          relationship: relation.relationship,
        });
      }
      return acc;
    }, {} as Record<string, any[]>) || {};

    // Add authorized students for family members
    if (authorizationData) {
      authorizationData.forEach((auth: any) => {
        const parentId = auth.authorized_parent_id;
        
        // Initialize array if doesn't exist
        if (!studentsByParent[parentId]) {
          studentsByParent[parentId] = [];
        }

        const student = auth.students;
        // Check if student is not already in the list (avoid duplicates from direct assignments)
        const existingStudent = studentsByParent[parentId].find((s: any) => s.id === student.id);
        if (!existingStudent) {
          studentsByParent[parentId].push({
            id: student.id,
            name: student.name,
            classId: student.class_id,
            className: student.classes?.name || 'No Class',
            grade: student.classes?.grade || 'No Grade',
            isPrimary: false,
            avatar: student.avatar,
            parentRelationshipId: undefined, // No direct relationship
            relationship: 'authorized',
          });
        }
      });
    }

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

    // Get parent ID using secure operations
    const { data: parentsData, error: parentError } = await secureOperations.getParentsSecure(false);
    const parentData = parentsData?.find(p => p.email === parentEmail);
    
    if (!parentData) {
      logger.error('No parent found for email:', parentEmail);
      return { allChildren: [] };
    }

    if (parentError) {
      logger.error('Error fetching parent:', parentError);
      throw new Error(parentError.message);
    }

    if (!parentData) {
      logger.error('No parent found for email:', parentEmail);
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

    if (childrenError) {
      logger.error('Error fetching children:', childrenError);
      throw new Error(childrenError.message);
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
      .contains('allowed_days_of_week', [currentDayOfWeek]);

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
        parentIds: [parentData.id],
        avatar: student?.avatar,
      };
    }) || [];

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
