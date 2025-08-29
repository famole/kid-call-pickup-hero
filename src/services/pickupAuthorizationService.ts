
import { supabase } from "@/integrations/supabase/client";

export interface PickupAuthorization {
  id: string;
  authorizingParentId: string;
  authorizedParentId: string;
  studentId: string; // Keep for backward compatibility
  studentIds?: string[]; // New field for multiple students
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PickupAuthorizationInput {
  authorizedParentId: string;
  studentId?: string; // Keep for backward compatibility
  studentIds?: string[]; // New field for multiple students
  startDate: string;
  endDate: string;
}

export interface PickupAuthorizationWithDetails extends PickupAuthorization {
  authorizingParent?: {
    id: string;
    name: string;
    email: string;
    role?: 'parent' | 'teacher' | 'admin' | 'superadmin' | 'family' | 'other';
  };
  authorizedParent?: {
    id: string;
    name: string;
    email: string;
    role?: 'parent' | 'teacher' | 'admin' | 'superadmin' | 'family' | 'other';
  };
  student?: {
    id: string;
    name: string;
  };
}

import { ParentWithStudents } from '@/types/parent';

// Helper function to filter out family and other roles from parent searches
export const filterSearchableParents = (parents: ParentWithStudents[]) => {
  return parents.filter(parent => 
    parent.role && !['family', 'other'].includes(parent.role)
  );
};

// Create a new pickup authorization
export const createPickupAuthorization = async (
  authorizationData: PickupAuthorizationInput
): Promise<PickupAuthorization> => {
  // Use the server-side helper to get current parent ID
  const { data: currentParentId, error: parentError } = await supabase.rpc('get_current_parent_id');
  
  if (parentError || !currentParentId) {
    throw new Error('Unable to authenticate parent');
  }

  const { data, error } = await supabase
    .from('pickup_authorizations')
    .insert({
      authorizing_parent_id: currentParentId,
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
  // Get the current parent's ID via server-side helper
  const { data: currentParentId, error: parentError } = await supabase.rpc('get_current_parent_id');

  if (parentError || !currentParentId) {
    throw new Error('Unable to authenticate parent');
  }

  const { data, error } = await supabase
    .from('pickup_authorizations')
    .select(`
      *,
      authorizing_parent:parents!authorizing_parent_id (id, name, email, role),
      authorized_parent:parents!authorized_parent_id (id, name, email, role)
    `)
    .eq('authorizing_parent_id', currentParentId)
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

// Get parents available for pickup authorization
// Only returns family/other members created by current parent + parents sharing students
export const getAvailableParentsForAuthorization = async (): Promise<{
  parents: any[];
  sharedStudents: Record<string, string[]>;
}> => {
  // Use the server-side helper to get current parent ID
  const { data: currentParentId, error: parentError } = await supabase.rpc('get_current_parent_id');
  
  if (parentError || !currentParentId) {
    throw new Error('Unable to authenticate parent');
  }

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

  // Get parents who share students with the current parent
  const { data: sharedParentRelations, error: sharedError } = await supabase
    .from('student_parents')
    .select(`
      parent_id,
      student_id,
      parent:parents!parent_id (id, name, email, role)
    `)
    .in('student_id', studentIds)
    .neq('parent_id', currentParentId);

  if (sharedError) {
    console.error('Error fetching shared parents:', sharedError);
    throw new Error(sharedError.message);
  }

  // Get family/other role parents who were authorized by current parent
  const { data: authorizedFamilyMembers, error: familyError } = await supabase
    .from('pickup_authorizations')
    .select(`
      authorized_parent_id,
      authorized_parent:parents!authorized_parent_id (id, name, email, role)
    `)
    .eq('authorizing_parent_id', currentParentId)
    .in('authorized_parent.role', ['family', 'other']);

  if (familyError) {
    console.error('Error fetching family members:', familyError);
    throw new Error(familyError.message);
  }

  // Group shared parents by parent and track shared students
  const parentMap = new Map();
  const sharedStudents: Record<string, string[]> = {};

  // Add shared parents (parents of same students)
  for (const relation of sharedParentRelations) {
    const parentId = relation.parent_id;
    const parentData = relation.parent;
    
    // Skip if parent data is null (due to RLS restrictions)
    if (!parentData || !parentData.id) {
      continue;
    }
    
    if (!parentMap.has(parentId)) {
      parentMap.set(parentId, parentData);
      sharedStudents[parentId] = [];
    }
    
    sharedStudents[parentId].push(relation.student_id);
  }

  // Add family/other role members (don't count them as shared students)
  for (const auth of authorizedFamilyMembers || []) {
    const parentId = auth.authorized_parent_id;
    const parentData = auth.authorized_parent;
    
    // Skip if parent data is null (due to RLS restrictions)
    if (!parentData || !parentData.id) {
      continue;
    }
    
    if (!parentMap.has(parentId)) {
      parentMap.set(parentId, parentData);
      // Family members don't have shared students in this context
      sharedStudents[parentId] = [];
    }
  }

  return {
    parents: Array.from(parentMap.values()),
    sharedStudents
  };
};

// Get parents who share students with the current parent
export const getParentsWhoShareStudents = async (): Promise<{
  parents: any[];
  sharedStudents: Record<string, string[]>;
}> => {
  // Use the server-side helper to get current parent ID
  const { data: currentParentId, error: parentError } = await supabase.rpc('get_current_parent_id');
  
  if (parentError || !currentParentId) {
    throw new Error('Unable to authenticate parent');
  }
  
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
    const parentData = relation.parent;
    
    // Skip if parent data is null (due to RLS restrictions)
    if (!parentData || !parentData.id) {
      continue;
    }
    
    if (!parentMap.has(parentId)) {
      parentMap.set(parentId, parentData);
      sharedStudents[parentId] = [];
    }
    
    sharedStudents[parentId].push(relation.student_id);
  }

  return {
    parents: Array.from(parentMap.values()),
    sharedStudents
  };
};

// Get pickup authorizations for a specific student with parent details
export const getPickupAuthorizationsForStudent = async (
  studentId: string
): Promise<PickupAuthorizationWithDetails[]> => {
  const { data, error } = await supabase
    .from('pickup_authorizations')
    .select(`
      *,
      authorizing_parent:parents!authorizing_parent_id (id, name, email),
      authorized_parent:parents!authorized_parent_id (id, name, email)
    `)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pickup authorizations for student:', error);
    throw new Error(error.message);
  }

  return data.map(auth => ({
    ...mapAuthorizationFromDB(auth),
    authorizingParent: auth.authorizing_parent,
    authorizedParent: auth.authorized_parent
  }));
};

// Get pickup authorizations where the given parent is authorized
export const getPickupAuthorizationsForAuthorizedParent = async (
  parentId?: string
): Promise<PickupAuthorizationWithDetails[]> => {
  let targetParentId = parentId;

  if (!targetParentId) {
    const { data, error } = await supabase.rpc('get_current_parent_id');
    if (error || !data) {
      throw new Error('Unable to authenticate parent');
    }
    targetParentId = data;
  }

  const { data, error } = await supabase
    .from('pickup_authorizations')
    .select(`
      *,
      authorizing_parent:parents!authorizing_parent_id (id, name, email),
      student:students (id, name)
    `)
    .eq('authorized_parent_id', targetParentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pickup authorizations for authorized parent:', error);
    throw new Error(error.message);
  }

  return data.map(auth => ({
    ...mapAuthorizationFromDB(auth),
    authorizingParent: auth.authorizing_parent,
    student: auth.student
  }));
};

// Update a pickup authorization
export const updatePickupAuthorization = async (
  id: string,
  updates: Partial<PickupAuthorizationInput & { isActive: boolean }>
): Promise<PickupAuthorization> => {
  const updateData: any = {};
  
  if (updates.authorizedParentId) updateData.authorized_parent_id = updates.authorizedParentId;
  if (updates.studentId) updateData.student_id = updates.studentId;
  if (updates.studentIds) updateData.student_ids = updates.studentIds;
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
  studentId: string,
  date: string = new Date().toISOString().split('T')[0]
): Promise<boolean> => {
  const { data: parentId, error: parentError } = await supabase.rpc('get_current_parent_id');

  if (parentError || !parentId) {
    console.error('Unable to determine current parent ID:', parentError);
    return false;
  }

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

// Helper function to map database response to our interface
const mapAuthorizationFromDB = (dbAuth: any): PickupAuthorization => ({
  id: dbAuth.id,
  authorizingParentId: dbAuth.authorizing_parent_id,
  authorizedParentId: dbAuth.authorized_parent_id,
  studentId: dbAuth.student_id,
  studentIds: dbAuth.student_ids,
  startDate: dbAuth.start_date,
  endDate: dbAuth.end_date,
  isActive: dbAuth.is_active,
  createdAt: dbAuth.created_at,
  updatedAt: dbAuth.updated_at
});
