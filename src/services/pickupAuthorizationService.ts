
import { supabase } from "@/integrations/supabase/client";
import { getCurrentParentIdCached } from '@/services/parent/getCurrentParentId';

export interface PickupAuthorization {
  id: string;
  authorizingParentId: string;
  authorizedParentId: string;
  studentId: string; // Keep for backward compatibility
  studentIds?: string[]; // New field for multiple students
  startDate: string;
  endDate: string;
  allowedDaysOfWeek: number[]; // Array of day numbers (0=Sunday, 1=Monday, ..., 6=Saturday)
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
  allowedDaysOfWeek: number[]; // Array of day numbers (0=Sunday, 1=Monday, ..., 6=Saturday)
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
  parentId: string,
  authorizationData: PickupAuthorizationInput
): Promise<PickupAuthorization> => {
  const { securePickupAuthorizationOperations } = await import('@/services/encryption/securePickupAuthorizationClient');
  const { data, error } = await securePickupAuthorizationOperations.createPickupAuthorizationSecure(parentId, authorizationData);
  
  if (error || !data) {
    throw new Error(error?.message || 'Failed to create pickup authorization');
  }

  return data;
};

// Get pickup authorizations for the current parent
export const getPickupAuthorizationsForParent = async (parentId: string): Promise<PickupAuthorizationWithDetails[]> => {
  const { securePickupAuthorizationOperations } = await import('@/services/encryption/securePickupAuthorizationClient');
  const { data, error } = await securePickupAuthorizationOperations.getPickupAuthorizationsForParentSecure(parentId);
  
  if (error) {
    console.error('Error fetching pickup authorizations:', error);
    throw new Error(error?.message || 'Failed to fetch pickup authorizations');
  }

  return data || [];
};

// Get parents available for pickup authorization
// Returns ALL parents in the school for pickup authorization
export const getAvailableParentsForAuthorization = async (parentId: string): Promise<{
  parents: any[];
  sharedStudents: Record<string, string[]>;
}> => {
  const { securePickupAuthorizationOperations } = await import('@/services/encryption/securePickupAuthorizationClient');
  const { data, error } = await securePickupAuthorizationOperations.getAvailableParentsForAuthorizationSecure(parentId);
  
  if (error) {
    console.error('Error fetching available parents:', error);
    throw new Error(error?.message || 'Failed to fetch available parents');
  }

  return data || { parents: [], sharedStudents: {} };
};

// Get parents who share students with the current parent
export const getParentsWhoShareStudents = async (): Promise<{
  parents: any[];
  sharedStudents: Record<string, string[]>;
}> => {
  // Use cached helper to get current parent ID
  const currentParentId = await getCurrentParentIdCached();
  if (!currentParentId) {
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
      student_id
    `)
    .in('student_id', studentIds)
    .neq('parent_id', currentParentId);

  if (sharedError) {
    console.error('Error fetching shared parents:', sharedError);
    throw new Error(sharedError.message);
  }

  // Get parent data using secure operations
  const { secureOperations } = await import('@/services/encryption');
  const { data: allParents, error: parentsSecureError } = await secureOperations.getParentsSecure(false);
  
  if (parentsSecureError) {
    console.error('Error fetching parents:', parentsSecureError);
    throw new Error(parentsSecureError.message);
  }

  // Group by parent and track shared students
  const parentMap = new Map();
  const sharedStudents: Record<string, string[]> = {};

  for (const relation of sharedParentRelations) {
    const parentId = relation.parent_id;
    const parentData = allParents?.find(p => p.id === parentId);
    
    // Skip if parent data is null (due to RLS restrictions or not found)
    if (!parentData || !parentData.id) {
      continue;
    }
    
    if (!parentMap.has(parentId)) {
      parentMap.set(parentId, { id: parentData.id, name: parentData.name, email: parentData.email });
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
  currentParentId: string,
  targetParentId?: string
): Promise<PickupAuthorizationWithDetails[]> => {
  const { securePickupAuthorizationOperations } = await import('@/services/encryption/securePickupAuthorizationClient');
  const { data, error } = await securePickupAuthorizationOperations.getPickupAuthorizationsForAuthorizedParentSecure(currentParentId, targetParentId);
  
  if (error) {
    console.error('Error fetching pickup authorizations for authorized parent:', error);
    throw new Error(error?.message || 'Failed to fetch authorized pickup authorizations');
  }

  return data || [];
};

// Update a pickup authorization
export const updatePickupAuthorization = async (
  parentId: string,
  id: string,
  updates: Partial<PickupAuthorizationInput & { isActive: boolean }>
): Promise<PickupAuthorization> => {
  const { securePickupAuthorizationOperations } = await import('@/services/encryption/securePickupAuthorizationClient');
  const { data, error } = await securePickupAuthorizationOperations.updatePickupAuthorizationSecure(parentId, id, updates);
  
  if (error || !data) {
    throw new Error(error?.message || 'Failed to update pickup authorization');
  }

  return data;
};

// Delete a pickup authorization
export const deletePickupAuthorization = async (parentId: string, id: string): Promise<void> => {
  try {
    // Validate inputs
    if (!parentId || typeof parentId !== 'string') {
      throw new Error('Invalid parent ID provided');
    }
    
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid authorization ID provided');
    }
    
    const { securePickupAuthorizationOperations } = await import('@/services/encryption/securePickupAuthorizationClient');
    const { error } = await securePickupAuthorizationOperations.deletePickupAuthorizationSecure(parentId, id);
    
    if (error) {
      console.error('Error deleting pickup authorization:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to delete pickup authorization:', error);
    throw error;
  }
};

// Check if a parent is authorized to pick up a student on a specific date
export const checkPickupAuthorization = async (
  studentId: string,
  date: string = new Date().toISOString().split('T')[0]
): Promise<boolean> => {
  const parentId = await getCurrentParentIdCached();
  if (!parentId) {
    console.error('Unable to determine current parent ID:', parentError);
    return false;
  }

  // Use the new database function that checks day of week
  const { data, error } = await supabase.rpc('check_pickup_authorization_with_days', {
    p_student_id: studentId,
    p_parent_id: parentId,
    p_check_date: date
  });

  if (error) {
    console.error('Error checking pickup authorization:', error);
    return false;
  }

  return data === true;
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
  allowedDaysOfWeek: dbAuth.allowed_days_of_week || [0,1,2,3,4,5,6],
  isActive: dbAuth.is_active,
  createdAt: dbAuth.created_at,
  updatedAt: dbAuth.updated_at
});
