import { supabase } from "@/integrations/supabase/client";
import { getStudentById } from './studentService';
import { getClassById } from './classService';
import { getParentById } from './parentService';

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
    const { data, error } = await supabase
      .from('self_checkout_authorizations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching self-checkout authorizations:', error);
      throw new Error(error.message);
    }
    
    const result: SelfCheckoutAuthorizationWithDetails[] = [];
    
    for (const auth of data) {
      const student = await getStudentById(auth.student_id);
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
    // Get the current parent ID
    const { data: currentUser, error: userError } = await supabase.auth.getUser();
    if (userError || !currentUser.user) {
      throw new Error('User not authenticated');
    }

    // Get parent ID from the parents table
    const { data: parentData, error: parentError } = await supabase
      .from('parents')
      .select('id')
      .eq('email', currentUser.user.email)
      .single();

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
    
    for (const auth of data) {
      const student = await getStudentById(auth.student_id);
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
    const { data, error } = await supabase
      .from('student_departures')
      .insert({
        student_id: studentId,
        marked_by_user_id: (await supabase.auth.getUser()).data.user?.id,
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
    
    for (const departure of data) {
      const student = await getStudentById(departure.student_id);
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
          markedByUser = await getParentById(departure.marked_by_user_id);
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
