import { supabase } from "@/integrations/supabase/client";
import { getStudentById } from './studentService';
import { getClassById } from './classService';
import { getParentById } from './parentService';
import { getCurrentParentIdCached } from '@/services/parent/getCurrentParentId';
import { logger } from "@/utils/logger";
import type { Child } from "@/types";
import type { Parent } from "@/types/parent";
import { getCachedAuthUser } from '@/services/auth/getCachedAuthUser';

// Import optimized versions
export {
  getActiveSelfCheckoutAuthorizationsOptimized as getActiveSelfCheckoutAuthorizations,
  getSelfCheckoutAuthorizationsForParentOptimized as getSelfCheckoutAuthorizationsForParent,
  getRecentDeparturesOptimized as getRecentDepartures
} from './selfCheckout/optimizedSelfCheckoutQueries';

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

// Legacy function - kept for backwards compatibility but not used
// Use optimized version from selfCheckout/optimizedSelfCheckoutQueries instead
const getSelfCheckoutAuthorizationsForParentLegacy = async (): Promise<SelfCheckoutAuthorizationWithDetails[]> => {
  throw new Error('Legacy function - use optimized version');
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
    const { data: parentData, error: parentError } = await secureOperations.getParentByIdentifierSecure(currentUser.email);

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

// Legacy function - kept for backwards compatibility but not used
// Use optimized version from selfCheckout/optimizedSelfCheckoutQueries instead
const getActiveSelfCheckoutAuthorizationsLegacy = async (): Promise<SelfCheckoutAuthorizationWithDetails[]> => {
  throw new Error('Legacy function - use optimized version');
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

// Legacy function - kept for backwards compatibility but not used
// Use optimized version from selfCheckout/optimizedSelfCheckoutQueries instead
const getRecentDeparturesLegacy = async (limit: number = 50): Promise<StudentDepartureWithDetails[]> => {
  throw new Error('Legacy function - use optimized version');
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
