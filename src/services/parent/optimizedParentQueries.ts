import { supabase } from "@/integrations/supabase/client";
import { secureOperations } from '@/services/encryption';
import { secureClassOperations } from '@/services/encryption/secureClassClient';
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
    logger.log(`Parents with deleted_at:`, parentsData?.filter(p => p.deletedAt).length || 0);
    
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
      `);

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

    // Get classes data using secure operations
    const classesData = await secureClassOperations.getAll();
    logger.log(`Fetched ${classesData?.length || 0} classes using secure operations`);

    if (studentParentError) {
      logger.error('Error fetching student-parent relationships:', studentParentError);
      throw new Error(studentParentError.message);
    }

    logger.log(`Fetched ${studentParentData?.length || 0} student-parent relationships`);

    // Get pickup authorizations for family members using secure endpoint
    let authorizationData: Array<{
      id: string;
      authorizing_parent_id: string;
      authorized_parent_id: string;
      student_id: string;
      student_ids?: string[];
      is_active: boolean;
      start_date: string;
      end_date: string;
      allowed_days_of_week: number[];
      created_at: string;
      updated_at: string;
      students: {
        id: string;
        name: string;
        class_id: string;
        avatar: string | null;
        classes: {
          id: string;
          name: string;
          grade: string;
        } | null;
      };
    }> = [];
    
    try {
      // Get the current parent ID using the secure RPC function
      const { data: currentParentId, error: parentIdError } = await supabase.rpc('get_current_parent_id');
      
      if (parentIdError || !currentParentId) {
        logger.warn('Error getting current parent ID:', parentIdError);
        return [];
      }
      
      const { data: authData, error: authError } = await supabase.functions.invoke('secure-pickup-authorizations', {
        body: {
          operation: 'getPickupAuthorizationsForParent',
          parentId: currentParentId
        }
      });
      
      if (authError) {
        logger.warn('Error loading pickup authorizations:', authError);
      } else if (authData?.data?.encrypted_data) {
        // Import the decryption function from encryption service
        const { decryptData } = await import('@/services/encryption/encryptionService');
        // Decrypt the response data
        const decryptedData = await decryptData(authData.data.encrypted_data);
        if (decryptedData) {
          authorizationData = JSON.parse(decryptedData);
        }
      }
    } catch (error) {
      logger.warn('Error in secure pickup authorizations call:', error);
    }

    // Define the student type
    type StudentWithClass = {
      id: string;
      name: string;
      classId: string | null;
      className: string;
      grade: string;
      isPrimary: boolean;
      avatar: string | null;
      parentRelationshipId: string;
      relationship: string | null;
    };

    // Group students by parent ID
    const studentsByParent = studentParentData?.reduce<Record<string, StudentWithClass[]>>((acc, relation) => {
      if (!acc[relation.parent_id]) {
        acc[relation.parent_id] = [];
      }
      
      // Find student and class data
      const student = studentsData?.find(s => s.id === relation.student_id);
      const studentClass = classesData?.find(c => c.id === student?.class_id);
      
      if (student) {
        const studentWithClass: StudentWithClass = {
          id: student.id,
          name: student.name,
          classId: student.class_id || null,
          className: studentClass?.name || 'No Class',
          grade: studentClass?.grade || 'No Grade',
          isPrimary: Boolean(relation.is_primary),
          avatar: student.avatar || null,
          parentRelationshipId: relation.id,
          relationship: relation.relationship || null,
        };
        acc[relation.parent_id].push(studentWithClass);
      }
      return acc;
    }, {} as Record<string, StudentWithClass[]>) || {};

    // Add authorized students for family members
    if (authorizationData) {
      type AuthorizationData = {
        authorized_parent_id: string;
        student_id: string;
        student_ids?: string[];
        is_active: boolean;
        start_date: string;
        end_date: string;
        allowed_days_of_week: number[];
        students: {
          id: string;
          name: string;
          class_id: string;
          avatar: string | null;
          classes: {
            id: string;
            name: string;
            grade: string;
          } | null;
        };
      };

      authorizationData.forEach((auth: AuthorizationData) => {
        const parentId = auth.authorized_parent_id;
        
        // Initialize array if doesn't exist
        if (!studentsByParent[parentId]) {
          studentsByParent[parentId] = [];
        }

        const student = auth.students;
        // Check if student is not already in the list (avoid duplicates from direct assignments)
        const existingStudent = studentsByParent[parentId].find((s: StudentWithClass) => s.id === student.id);
      
      if (!existingStudent && student) {
        const authorizedStudent: StudentWithClass = {
          id: student.id,
          name: student.name,
          classId: student.class_id,
          className: student.classes?.name || 'No Class',
          grade: student.classes?.grade || 'No Grade',
          isPrimary: false, // Authorized students are not primary
          avatar: student.avatar || null,
          parentRelationshipId: '', // No direct relationship ID for authorized students
          relationship: 'authorized',
        };
        studentsByParent[parentId].push(authorizedStudent);
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

export const getParentDashboardDataOptimized = async (parentIdentifier: string) => {
  try {
    logger.log('Fetching parent dashboard data for parent identifier:', parentIdentifier);

    // Get parent data using secure operations
    const { data: parentsData, error: parentError } = await secureOperations.getParentsSecure(false);
    
    if (parentError) {
      logger.error('Error fetching parent:', parentError);
      throw new Error(parentError.message);
    }

    // Find parent by ID (UUID), email, or username
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parentIdentifier);
    let parentData;
    
    if (isUUID) {
      parentData = parentsData?.find(p => p.id === parentIdentifier);
    } else {
      // Check if it's an email or username
      parentData = parentsData?.find(p => p.email === parentIdentifier || p.username === parentIdentifier);
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
