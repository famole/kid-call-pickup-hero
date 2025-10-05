import { supabase } from "@/integrations/supabase/client";
import { getStudentById } from './studentService';
import { getClassById } from './classService';
import { getParentById } from './parentService';
import { getCurrentParentIdCached } from '@/services/parent/getCurrentParentId';
import { logger } from "@/utils/logger";
import type { Child } from "@/types";
import type { Parent } from "@/types/parent";
import { getCachedAuthUser } from '@/services/auth/getCachedAuthUser';

// Export the base types
export interface SelfCheckoutAuthorization {
  id: string;
  studentId: string;
  authorizingParentId: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SelfCheckoutAuthorizationWithDetails {
  id: string;
  studentId: string;
  authorizingParentId: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  student?: {
    id: string;
    name: string;
    classId: string;
    avatar?: string;
  };
  class?: {
    id: string;
    name: string;
    grade: string;
    teacher: string;
  };
  authorizingParent?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface StudentDeparture {
  id: string;
  studentId: string;
  departedAt: Date;
  markedByUserId: string;
  notes?: string;
  createdAt: Date;
}

export interface StudentDepartureWithDetails {
  id: string;
  studentId: string;
  departedAt: Date;
  markedByUserId: string;
  notes?: string;
  createdAt: Date;
  student?: {
    id: string;
    name: string;
    classId: string;
    avatar?: string;
  };
  class?: {
    id: string;
    name: string;
    grade: string;
    teacher: string;
  };
  markedByUser?: {
    id: string;
    name: string;
    email: string;
  };
}

// Function to get all self-checkout authorizations for the current parent
export const getSelfCheckoutAuthorizationsForParent = async (): Promise<SelfCheckoutAuthorizationWithDetails[]> => {
  try {
    // Get current parent ID (cached)
    const parentData = await getCurrentParentIdCached();
    if (!parentData) {
      logger.info('No parent ID found for current user');
      return [];
    }

    const { data, error } = await supabase
      .from('self_checkout_authorizations')
      .select('*')
      .eq('authorizing_parent_id', parentData)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching self-checkout authorizations:', error);
      throw new Error(error.message);
    }
    
    const result: SelfCheckoutAuthorizationWithDetails[] = [];
    // Per-call caches to prevent duplicate fetches
    const studentCache = new Map<string, Child | null>();
    const parentCache = new Map<string, Parent | null>();
    const getStudentCached = async (studentId: string) => {
      if (studentCache.has(studentId)) return studentCache.get(studentId);
      const s = await getStudentById(studentId);
      studentCache.set(studentId, s);
      return s;
    };
    const getParentCached = async (parentId: string): Promise<Parent | null> => {
      if (parentCache.has(parentId)) return parentCache.get(parentId) as Parent | null;
      const p = await getParentById(parentId);
      parentCache.set(parentId, p);
      return p;
    };
    
    for (const auth of data) {
      logger.log(`[getSelfCheckoutAuthorizationsForParent] Processing authorization ${auth.id} for student ${auth.student_id}`);
      
      const student = await getStudentCached(auth.student_id);
      logger.log(`[getSelfCheckoutAuthorizationsForParent] Student data:`, student);
      
      let classInfo = null;
      let parentInfo = null;
      
      if (student && student.classId) {
        try {
          logger.log(`[getSelfCheckoutAuthorizationsForParent] Fetching class for student ${student.name}, classId: ${student.classId}`);
          classInfo = await getClassById(student.classId);
          logger.log(`[getSelfCheckoutAuthorizationsForParent] Class info fetched:`, classInfo);
        } catch (error) {
          console.error(`Error fetching class with id ${student.classId}:`, error);
        }
      } else {
        logger.log(`[getSelfCheckoutAuthorizationsForParent] Student or classId missing:`, { student: student?.name, classId: student?.classId });
      }

      if (auth.authorizing_parent_id) {
        try {
          parentInfo = await getParentCached(auth.authorizing_parent_id);
        } catch (error) {
          console.error(`Error fetching parent with id ${auth.authorizing_parent_id}:`, error);
        }
      }
      
      // Create the student info object in the expected format
      const studentInfo = student ? {
        id: student.id,
        name: student.name,
        classId: student.classId,
        avatar: student.avatar
      } : undefined;

      // Create the class info object in the expected format
      const classData = classInfo ? {
        id: classInfo.id,
        name: classInfo.name,
        grade: classInfo.grade,
        teacher: classInfo.teacher
      } : undefined;

      logger.log(`[getSelfCheckoutAuthorizationsForParent] Final data for auth ${auth.id}:`, {
        student: studentInfo,
        class: classData
      });
      
      result.push({
        id: auth.id,
        studentId: auth.student_id,
        authorizingParentId: auth.authorizing_parent_id,
        startDate: auth.start_date,
        endDate: auth.end_date,
        isActive: auth.is_active,
        createdAt: new Date(auth.created_at),
        updatedAt: new Date(auth.updated_at),
        student: studentInfo,
        class: classData,
        authorizingParent: parentInfo
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error in getSelfCheckoutAuthorizationsForParent:', error);
    throw error;
  }
};

// Function to create a new self-checkout authorization
export const createSelfCheckoutAuthorization = async (
  studentId: string,
  startDate: string,
  endDate: string
): Promise<SelfCheckoutAuthorization> => {
  try {
    // Get the current parent ID (cached auth user)
    const currentUser = await getCachedAuthUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Get parent ID using optimized operation
    const { secureOperations } = await import('@/services/encryption');
    const { data: parentData, error: parentError } = await secureOperations.getParentByEmailSecure(currentUser.email);

    if (parentError || !parentData) {
      throw new Error('Parent not found');
    }

    const { data, error } = await supabase
      .from('self_checkout_authorizations')
      .insert({
        student_id: studentId,
        authorizing_parent_id: parentData.id,
        start_date: startDate,
        end_date: endDate,
        is_active: true
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating self-checkout authorization:', error);
      throw new Error(error.message);
    }
    
    return {
      id: data.id,
      studentId: data.student_id,
      authorizingParentId: data.authorizing_parent_id,
      startDate: data.start_date,
      endDate: data.end_date,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  } catch (error) {
    console.error('Error in createSelfCheckoutAuthorization:', error);
    throw error;
  }
};

// Function to update a self-checkout authorization
export const updateSelfCheckoutAuthorization = async (
  id: string,
  updates: {
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
  }
): Promise<SelfCheckoutAuthorization> => {
  try {
    const updateData: any = {};
    if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
    if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('self_checkout_authorizations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating self-checkout authorization:', error);
      throw new Error(error.message);
    }
    
    return {
      id: data.id,
      studentId: data.student_id,
      authorizingParentId: data.authorizing_parent_id,
      startDate: data.start_date,
      endDate: data.end_date,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  } catch (error) {
    console.error('Error in updateSelfCheckoutAuthorization:', error);
    throw error;
  }
};

// Function to delete a self-checkout authorization
export const deleteSelfCheckoutAuthorization = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('self_checkout_authorizations')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting self-checkout authorization:', error);
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Error in deleteSelfCheckoutAuthorization:', error);
    throw error;
  }
};

// Function to get active self-checkout authorizations for teachers/admins
export const getActiveSelfCheckoutAuthorizations = async (): Promise<SelfCheckoutAuthorizationWithDetails[]> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('self_checkout_authorizations')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', today)
      .gte('end_date', today)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching active self-checkout authorizations:', error);
      throw new Error(error.message);
    }
    
    const result: SelfCheckoutAuthorizationWithDetails[] = [];
    // Per-call cache to prevent duplicate student fetches
    const studentCache = new Map<string, Child | null>();
    const getStudentCached = async (studentId: string) => {
      if (studentCache.has(studentId)) return studentCache.get(studentId);
      const s = await getStudentById(studentId);
      studentCache.set(studentId, s);
      return s;
    };

    for (const auth of data) {
      const student = await getStudentCached(auth.student_id);
      let classInfo = null;
      let parentInfo = null;
      
      if (student && student.classId) {
        try {
          classInfo = await getClassById(student.classId);
        } catch (error) {
          console.error(`Error fetching class with id ${student.classId}:`, error);
        }
      }

      if (auth.authorizing_parent_id) {
        try {
          parentInfo = await getParentById(auth.authorizing_parent_id);
        } catch (error) {
          console.error(`Error fetching parent with id ${auth.authorizing_parent_id}:`, error);
        }
      }
      
      result.push({
        id: auth.id,
        studentId: auth.student_id,
        authorizingParentId: auth.authorizing_parent_id,
        startDate: auth.start_date,
        endDate: auth.end_date,
        isActive: auth.is_active,
        createdAt: new Date(auth.created_at),
        updatedAt: new Date(auth.updated_at),
        student,
        class: classInfo,
        authorizingParent: parentInfo
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error in getActiveSelfCheckoutAuthorizations:', error);
    throw error;
  }
};

// Function to mark a student departure
export const markStudentDeparture = async (
  studentId: string,
  notes?: string
): Promise<StudentDeparture> => {
  try {
    // Resolve the current parent (app) ID, not the Supabase auth user ID
    const currentParentId = await getCurrentParentIdCached();
    const { data, error } = await supabase
      .from('student_departures')
      .insert({
        student_id: studentId,
        marked_by_user_id: currentParentId,
        notes: notes || null,
        departed_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) {
      console.error('Error marking student departure:', error);
      throw new Error(error.message);
    }
    
    return {
      id: data.id,
      studentId: data.student_id,
      departedAt: new Date(data.departed_at),
      markedByUserId: data.marked_by_user_id,
      notes: data.notes,
      createdAt: new Date(data.created_at)
    };
  } catch (error) {
    console.error('Error in markStudentDeparture:', error);
    throw error;
  }
};

// Function to get recent departures
export const getRecentDepartures = async (limit: number = 50): Promise<StudentDepartureWithDetails[]> => {
  try {
    const { data, error } = await supabase
      .from('student_departures')
      .select('*')
      .order('departed_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching recent departures:', error);
      throw new Error(error.message);
    }
    
    const result: StudentDepartureWithDetails[] = [];
    // Per-call caches to prevent duplicate fetches
    const studentCache = new Map<string, Child | null>();
    const parentCache = new Map<string, Parent | null>();
    const getStudentCached = async (studentId: string) => {
      if (studentCache.has(studentId)) return studentCache.get(studentId);
      const s = await getStudentById(studentId);
      studentCache.set(studentId, s);
      return s;
    };
    const getParentCached = async (parentId: string) => {
      if (parentCache.has(parentId)) return parentCache.get(parentId);
      const p = await getParentById(parentId);
      parentCache.set(parentId, p as any);
      return p as any;
    };
    
    for (const departure of data) {
      const student = await getStudentCached(departure.student_id);
      let classInfo = null;
      let markedByUser = null;
      
      if (student && student.classId) {
        try {
          classInfo = await getClassById(student.classId);
        } catch (error) {
          console.error(`Error fetching class with id ${student.classId}:`, error);
        }
      }

      if (departure.marked_by_user_id) {
        try {
          markedByUser = await getParentCached(departure.marked_by_user_id);
        } catch (error) {
          console.error(`Error fetching user with id ${departure.marked_by_user_id}:`, error);
        }
      }
      
      result.push({
        id: departure.id,
        studentId: departure.student_id,
        departedAt: new Date(departure.departed_at),
        markedByUserId: departure.marked_by_user_id,
        notes: departure.notes,
        createdAt: new Date(departure.created_at),
        student,
        class: classInfo,
        markedByUser
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error in getRecentDepartures:', error);
    throw error;
  }
};

// Function to get today's departure for a specific student
export const getTodayDepartureForStudent = async (studentId: string): Promise<StudentDeparture | null> => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const { data, error } = await supabase
      .from('student_departures')
      .select('*')
      .eq('student_id', studentId)
      .gte('departed_at', startOfDay.toISOString())
      .lte('departed_at', endOfDay.toISOString())
      .order('departed_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('Error fetching today departure for student:', error);
      throw new Error(error.message);
    }
    
    if (!data || data.length === 0) {
      return null;
    }

    const departure = data[0];
    return {
      id: departure.id,
      studentId: departure.student_id,
      departedAt: new Date(departure.departed_at),
      markedByUserId: departure.marked_by_user_id,
      notes: departure.notes,
      createdAt: new Date(departure.created_at)
    };
  } catch (error) {
    console.error('Error in getTodayDepartureForStudent:', error);
    throw error;
  }
};
