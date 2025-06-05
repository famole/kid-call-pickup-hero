
import { supabase } from "@/integrations/supabase/client";

export interface PickupAuthorization {
  id: string;
  authorizingParentId: string;
  authorizedParentId: string;
  studentId: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PickupAuthorizationInput {
  authorizedParentId: string;
  studentId: string;
  startDate: string;
  endDate: string;
}

export interface PickupAuthorizationWithDetails extends PickupAuthorization {
  authorizingParent?: {
    id: string;
    name: string;
    email: string;
  };
  authorizedParent?: {
    id: string;
    name: string;
    email: string;
  };
  student?: {
    id: string;
    name: string;
  };
}

// Create a new pickup authorization
export const createPickupAuthorization = async (
  authorizationData: PickupAuthorizationInput
): Promise<PickupAuthorization> => {
  const { data, error } = await supabase
    .from('pickup_authorizations')
    .insert({
      authorizing_parent_id: (await getCurrentParentId()),
      authorized_parent_id: authorizationData.authorizedParentId,
      student_id: authorizationData.studentId,
      start_date: authorizationData.startDate,
      end_date: authorizationData.endDate,
      is_active: true
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating pickup authorization:', error);
    throw new Error(error.message);
  }

  return mapAuthorizationFromDB(data);
};

// Get pickup authorizations for the current parent
export const getPickupAuthorizationsForParent = async (): Promise<PickupAuthorizationWithDetails[]> => {
  const { data, error } = await supabase
    .from('pickup_authorizations')
    .select(`
      *,
      authorizing_parent:parents!authorizing_parent_id (id, name, email),
      authorized_parent:parents!authorized_parent_id (id, name, email)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pickup authorizations:', error);
    throw new Error(error.message);
  }

  const authorizations = await Promise.all(
    data.map(async (auth) => {
      // Get student details
      const { data: studentData } = await supabase
        .from('students')
        .select('id, name')
        .eq('id', auth.student_id)
        .single();

      return {
        ...mapAuthorizationFromDB(auth),
        authorizingParent: auth.authorizing_parent,
        authorizedParent: auth.authorized_parent,
        student: studentData
      };
    })
  );

  return authorizations;
};

// Get parents who share students with the current parent
export const getParentsWhoShareStudents = async (): Promise<{
  parents: any[];
  sharedStudents: Record<string, string[]>;
}> => {
  const currentParentId = await getCurrentParentId();
  
  // Get all students associated with the current parent
  const { data: currentParentStudents, error: studentsError } = await supabase
    .from('student_parents')
    .select('student_id')
    .eq('parent_id', currentParentId);

  if (studentsError) {
    console.error('Error fetching current parent students:', studentsError);
    throw new Error(studentsError.message);
  }

  if (!currentParentStudents || currentParentStudents.length === 0) {
    return { parents: [], sharedStudents: {} };
  }

  const studentIds = currentParentStudents.map(sp => sp.student_id);

  // Get all other parents who are associated with these students
  const { data: sharedParentRelations, error: sharedError } = await supabase
    .from('student_parents')
    .select(`
      parent_id,
      student_id,
      parent:parents!parent_id (id, name, email)
    `)
    .in('student_id', studentIds)
    .neq('parent_id', currentParentId);

  if (sharedError) {
    console.error('Error fetching shared parents:', sharedError);
    throw new Error(sharedError.message);
  }

  // Group by parent and track shared students
  const parentMap = new Map();
  const sharedStudents: Record<string, string[]> = {};

  for (const relation of sharedParentRelations) {
    const parentId = relation.parent_id;
    
    if (!parentMap.has(parentId)) {
      parentMap.set(parentId, relation.parent);
      sharedStudents[parentId] = [];
    }
    
    sharedStudents[parentId].push(relation.student_id);
  }

  return {
    parents: Array.from(parentMap.values()),
    sharedStudents
  };
};

// Update a pickup authorization
export const updatePickupAuthorization = async (
  id: string,
  updates: Partial<PickupAuthorizationInput & { isActive: boolean }>
): Promise<PickupAuthorization> => {
  const updateData: any = {};
  
  if (updates.authorizedParentId) updateData.authorized_parent_id = updates.authorizedParentId;
  if (updates.studentId) updateData.student_id = updates.studentId;
  if (updates.startDate) updateData.start_date = updates.startDate;
  if (updates.endDate) updateData.end_date = updates.endDate;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
  
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('pickup_authorizations')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating pickup authorization:', error);
    throw new Error(error.message);
  }

  return mapAuthorizationFromDB(data);
};

// Delete a pickup authorization
export const deletePickupAuthorization = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('pickup_authorizations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting pickup authorization:', error);
    throw new Error(error.message);
  }
};

// Check if a parent is authorized to pick up a student on a specific date
export const checkPickupAuthorization = async (
  parentId: string,
  studentId: string,
  date: string = new Date().toISOString().split('T')[0]
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('pickup_authorizations')
    .select('id')
    .eq('authorized_parent_id', parentId)
    .eq('student_id', studentId)
    .eq('is_active', true)
    .lte('start_date', date)
    .gte('end_date', date);

  if (error) {
    console.error('Error checking pickup authorization:', error);
    return false;
  }

  return data.length > 0;
};

// Helper function to get current parent ID from auth
const getCurrentParentId = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    throw new Error('User not authenticated');
  }

  const { data: parent, error } = await supabase
    .from('parents')
    .select('id')
    .eq('email', user.email)
    .single();

  if (error || !parent) {
    throw new Error('Parent not found');
  }

  return parent.id;
};

// Helper function to map database response to our interface
const mapAuthorizationFromDB = (dbAuth: any): PickupAuthorization => ({
  id: dbAuth.id,
  authorizingParentId: dbAuth.authorizing_parent_id,
  authorizedParentId: dbAuth.authorized_parent_id,
  studentId: dbAuth.student_id,
  startDate: dbAuth.start_date,
  endDate: dbAuth.end_date,
  isActive: dbAuth.is_active,
  createdAt: dbAuth.created_at,
  updatedAt: dbAuth.updated_at
});
