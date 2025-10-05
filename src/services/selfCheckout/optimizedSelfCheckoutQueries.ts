import { supabase } from "@/integrations/supabase/client";
import { getCurrentParentIdCached } from '@/services/parent/getCurrentParentId';
import { logger } from "@/utils/logger";
import type { Child } from "@/types";
import type { Parent } from "@/types/parent";
import type { SelfCheckoutAuthorizationWithDetails, StudentDepartureWithDetails } from "../selfCheckoutService";

interface Class {
  id: string;
  name: string;
  grade: string;
  teacher: string;
}

/**
 * Optimized function to get active self-checkout authorizations
 * Batches all database queries to avoid N+1 problem
 */
export const getActiveSelfCheckoutAuthorizationsOptimized = async (): Promise<SelfCheckoutAuthorizationWithDetails[]> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Fetch all active authorizations
    const { data: authData, error: authError } = await supabase
      .from('self_checkout_authorizations')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', today)
      .gte('end_date', today)
      .order('created_at', { ascending: false });
    
    if (authError) {
      console.error('Error fetching active self-checkout authorizations:', authError);
      throw new Error(authError.message);
    }

    if (!authData || authData.length === 0) {
      return [];
    }

    // 2. Collect all unique IDs
    const studentIds = [...new Set(authData.map(a => a.student_id))];
    const parentIds = [...new Set(authData.map(a => a.authorizing_parent_id).filter(Boolean))];
    
    // 3. Batch fetch all students
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .in('id', studentIds);
    
    if (studentsError) {
      console.error('Error fetching students:', studentsError);
    }

    // 4. Collect class IDs from students and batch fetch classes
    const classIds = [...new Set((studentsData || []).map(s => s.class_id).filter(Boolean))];
    const { data: classesData, error: classesError } = await supabase
      .from('classes')
      .select('*')
      .in('id', classIds);
    
    if (classesError) {
      console.error('Error fetching classes:', classesError);
    }

    // 5. Batch fetch all parents
    const { data: parentsData, error: parentsError } = await supabase
      .from('parents')
      .select('*')
      .in('id', parentIds);
    
    if (parentsError) {
      console.error('Error fetching parents:', parentsError);
    }

    // 6. Create lookup maps for O(1) access
    const studentsMap = new Map<string, Child>();
    (studentsData || []).forEach(s => {
      studentsMap.set(s.id, {
        id: s.id,
        name: s.name,
        classId: s.class_id || '',
        parentIds: [],
        avatar: s.avatar
      });
    });

    const classesMap = new Map<string, Class>();
    (classesData || []).forEach(c => {
      classesMap.set(c.id, {
        id: c.id,
        name: c.name,
        grade: c.grade,
        teacher: c.teacher
      });
    });

    const parentsMap = new Map<string, Parent>();
    (parentsData || []).forEach(p => {
      parentsMap.set(p.id, {
        id: p.id,
        name: p.name,
        email: p.email,
        username: p.username,
        phone: p.phone,
        role: p.role,
        createdAt: new Date(p.created_at),
        updatedAt: new Date(p.updated_at)
      });
    });

    // 7. Map authorizations to detailed objects
    const result: SelfCheckoutAuthorizationWithDetails[] = authData.map(auth => {
      const student = studentsMap.get(auth.student_id);
      const classInfo = student?.classId ? classesMap.get(student.classId) : null;
      const parent = auth.authorizing_parent_id ? parentsMap.get(auth.authorizing_parent_id) : null;

      return {
        id: auth.id,
        studentId: auth.student_id,
        authorizingParentId: auth.authorizing_parent_id,
        startDate: auth.start_date,
        endDate: auth.end_date,
        isActive: auth.is_active,
        createdAt: new Date(auth.created_at),
        updatedAt: new Date(auth.updated_at),
        student: student ? {
          id: student.id,
          name: student.name,
          classId: student.classId,
          avatar: student.avatar
        } : undefined,
        class: classInfo ? {
          id: classInfo.id,
          name: classInfo.name,
          grade: classInfo.grade,
          teacher: classInfo.teacher
        } : undefined,
        authorizingParent: parent ? {
          id: parent.id,
          name: parent.name,
          email: parent.email
        } : undefined
      };
    });
    
    return result;
  } catch (error) {
    console.error('Error in getActiveSelfCheckoutAuthorizationsOptimized:', error);
    throw error;
  }
};

/**
 * Optimized function to get self-checkout authorizations for current parent
 * Batches all database queries to avoid N+1 problem
 */
export const getSelfCheckoutAuthorizationsForParentOptimized = async (): Promise<SelfCheckoutAuthorizationWithDetails[]> => {
  try {
    // Get current parent ID (cached)
    const parentData = await getCurrentParentIdCached();
    if (!parentData) {
      logger.info('No parent ID found for current user');
      return [];
    }

    // 1. Fetch all authorizations for this parent
    const { data: authData, error: authError } = await supabase
      .from('self_checkout_authorizations')
      .select('*')
      .eq('authorizing_parent_id', parentData)
      .order('created_at', { ascending: false });
    
    if (authError) {
      console.error('Error fetching self-checkout authorizations:', authError);
      throw new Error(authError.message);
    }

    if (!authData || authData.length === 0) {
      return [];
    }

    // 2. Collect all unique student IDs
    const studentIds = [...new Set(authData.map(a => a.student_id))];
    
    // 3. Batch fetch all students
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .in('id', studentIds);
    
    if (studentsError) {
      console.error('Error fetching students:', studentsError);
    }

    // 4. Collect class IDs from students and batch fetch classes
    const classIds = [...new Set((studentsData || []).map(s => s.class_id).filter(Boolean))];
    const { data: classesData, error: classesError } = await supabase
      .from('classes')
      .select('*')
      .in('id', classIds);
    
    if (classesError) {
      console.error('Error fetching classes:', classesError);
    }

    // 5. Create lookup maps for O(1) access
    const studentsMap = new Map<string, Child>();
    (studentsData || []).forEach(s => {
      studentsMap.set(s.id, {
        id: s.id,
        name: s.name,
        classId: s.class_id || '',
        parentIds: [],
        avatar: s.avatar
      });
    });

    const classesMap = new Map<string, Class>();
    (classesData || []).forEach(c => {
      classesMap.set(c.id, {
        id: c.id,
        name: c.name,
        grade: c.grade,
        teacher: c.teacher
      });
    });

    // 6. Map authorizations to detailed objects
    const result: SelfCheckoutAuthorizationWithDetails[] = authData.map(auth => {
      const student = studentsMap.get(auth.student_id);
      const classInfo = student?.classId ? classesMap.get(student.classId) : null;

      return {
        id: auth.id,
        studentId: auth.student_id,
        authorizingParentId: auth.authorizing_parent_id,
        startDate: auth.start_date,
        endDate: auth.end_date,
        isActive: auth.is_active,
        createdAt: new Date(auth.created_at),
        updatedAt: new Date(auth.updated_at),
        student: student ? {
          id: student.id,
          name: student.name,
          classId: student.classId,
          avatar: student.avatar
        } : undefined,
        class: classInfo ? {
          id: classInfo.id,
          name: classInfo.name,
          grade: classInfo.grade,
          teacher: classInfo.teacher
        } : undefined,
        authorizingParent: {
          id: parentData,
          name: '',
          email: ''
        }
      };
    });
    
    return result;
  } catch (error) {
    console.error('Error in getSelfCheckoutAuthorizationsForParentOptimized:', error);
    throw error;
  }
};

/**
 * Optimized function to get recent departures
 * Batches all database queries to avoid N+1 problem
 */
export const getRecentDeparturesOptimized = async (limit: number = 50): Promise<StudentDepartureWithDetails[]> => {
  try {
    // 1. Fetch departures
    const { data: departuresData, error: departuresError } = await supabase
      .from('student_departures')
      .select('*')
      .order('departed_at', { ascending: false })
      .limit(limit);
    
    if (departuresError) {
      console.error('Error fetching recent departures:', departuresError);
      throw new Error(departuresError.message);
    }

    if (!departuresData || departuresData.length === 0) {
      return [];
    }

    // 2. Collect all unique IDs
    const studentIds = [...new Set(departuresData.map(d => d.student_id))];
    const userIds = [...new Set(departuresData.map(d => d.marked_by_user_id).filter(Boolean))];
    
    // 3. Batch fetch all students
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .in('id', studentIds);
    
    if (studentsError) {
      console.error('Error fetching students:', studentsError);
    }

    // 4. Collect class IDs from students and batch fetch classes
    const classIds = [...new Set((studentsData || []).map(s => s.class_id).filter(Boolean))];
    const { data: classesData, error: classesError } = await supabase
      .from('classes')
      .select('*')
      .in('id', classIds);
    
    if (classesError) {
      console.error('Error fetching classes:', classesError);
    }

    // 5. Batch fetch all users (parents)
    const { data: usersData, error: usersError } = await supabase
      .from('parents')
      .select('*')
      .in('id', userIds);
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
    }

    // 6. Create lookup maps for O(1) access
    const studentsMap = new Map<string, Child>();
    (studentsData || []).forEach(s => {
      studentsMap.set(s.id, {
        id: s.id,
        name: s.name,
        classId: s.class_id || '',
        parentIds: [],
        avatar: s.avatar
      });
    });

    const classesMap = new Map<string, Class>();
    (classesData || []).forEach(c => {
      classesMap.set(c.id, {
        id: c.id,
        name: c.name,
        grade: c.grade,
        teacher: c.teacher
      });
    });

    const usersMap = new Map<string, Parent>();
    (usersData || []).forEach(u => {
      usersMap.set(u.id, {
        id: u.id,
        name: u.name,
        email: u.email,
        username: u.username,
        phone: u.phone,
        role: u.role,
        createdAt: new Date(u.created_at),
        updatedAt: new Date(u.updated_at)
      });
    });

    // 7. Map departures to detailed objects
    const result: StudentDepartureWithDetails[] = departuresData.map(departure => {
      const student = studentsMap.get(departure.student_id);
      const classInfo = student?.classId ? classesMap.get(student.classId) : null;
      const markedByUser = departure.marked_by_user_id ? usersMap.get(departure.marked_by_user_id) : null;

      return {
        id: departure.id,
        studentId: departure.student_id,
        departedAt: new Date(departure.departed_at),
        markedByUserId: departure.marked_by_user_id,
        notes: departure.notes,
        createdAt: new Date(departure.created_at),
        student,
        class: classInfo,
        markedByUser
      };
    });
    
    return result;
  } catch (error) {
    console.error('Error in getRecentDeparturesOptimized:', error);
    throw error;
  }
};
