
import { supabase } from "@/integrations/supabase/client";
import { Parent, ParentInput, StudentParentRelationship, ParentWithStudents } from "@/types/parent";
import { Child } from "@/types";
import { isValidUUID } from '@/utils/validators';

// Fetch all parents
export const getAllParents = async (): Promise<Parent[]> => {
  const { data, error } = await supabase
    .from('parents')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Error fetching parents:', error);
    throw new Error(error.message);
  }
  
  return data.map(parent => ({
    id: parent.id,
    name: parent.name,
    email: parent.email,
    phone: parent.phone,
    createdAt: new Date(parent.created_at),
    updatedAt: new Date(parent.updated_at),
  }));
};

// Fetch parents with their associated students
export const getParentsWithStudents = async (): Promise<ParentWithStudents[]> => {
  // Get all parents
  const parents = await getAllParents();
  
  // For each parent, get their students
  const parentsWithStudents: ParentWithStudents[] = [];
  
  for (const parent of parents) {
    const { data, error } = await supabase
      .from('student_parents')
      .select('id, student_id, is_primary, relationship')
      .eq('parent_id', parent.id);
    
    if (error) {
      console.error(`Error fetching students for parent ${parent.id}:`, error);
      continue;
    }
    
    // Get student names from the mock data
    // In a real app, you'd fetch this from your students table
    const studentRelationships = data.map(relationship => ({
      id: relationship.student_id,
      parentRelationshipId: relationship.id,
      isPrimary: relationship.is_primary,
      relationship: relationship.relationship,
    }));
    
    // Fetch student details from mock data (for now)
    // TODO: Replace with real API call once student table is created
    const { getAllStudents } = await import('./mockData');
    const allStudents = getAllStudents();
    
    const studentDetails = studentRelationships.map(relationship => {
      const student = allStudents.find(s => s.id === relationship.id);
      return {
        id: relationship.id,
        name: student ? student.name : 'Unknown Student',
        isPrimary: relationship.isPrimary,
        relationship: relationship.relationship,
        parentRelationshipId: relationship.parentRelationshipId,
      };
    });
    
    parentsWithStudents.push({
      ...parent,
      students: studentDetails,
    });
  }
  
  return parentsWithStudents;
};

// Get a single parent by ID
export const getParentById = async (id: string): Promise<Parent | null> => {
  if (!isValidUUID(id)) {
    console.error(`Invalid parent ID: ${id}`);
    return null;
  }
  const { data, error } = await supabase
    .from('parents')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching parent:', error);
    return null;
  }
  
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
};

// Create a new parent
export const createParent = async (parentData: ParentInput): Promise<Parent> => {
  const { data, error } = await supabase
    .from('parents')
    .insert([
      {
        name: parentData.name,
        email: parentData.email,
        phone: parentData.phone || null,
      }
    ])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating parent:', error);
    throw new Error(error.message);
  }
  
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
};

// Update an existing parent
export const updateParent = async (id: string, parentData: ParentInput): Promise<Parent> => {
  if (!isValidUUID(id)) {
    throw new Error(`Invalid parent ID: ${id}`);
  }
  const { data, error } = await supabase
    .from('parents')
    .update({
      name: parentData.name,
      email: parentData.email,
      phone: parentData.phone || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating parent:', error);
    throw new Error(error.message);
  }
  
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
};

// Delete a parent
export const deleteParent = async (id: string): Promise<void> => {
  if (!isValidUUID(id)) {
    throw new Error(`Invalid parent ID: ${id}`);
  }
  const { error } = await supabase
    .from('parents')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting parent:', error);
    throw new Error(error.message);
  }
};

// Associate a parent with a student
export const addStudentToParent = async (
  parentId: string, 
  studentId: string,
  relationship?: string,
  isPrimary: boolean = false
): Promise<StudentParentRelationship> => {
  const { data, error } = await supabase
    .from('student_parents')
    .insert([
      {
        parent_id: parentId,
        student_id: studentId,
        relationship,
        is_primary: isPrimary,
      }
    ])
    .select()
    .single();
  
  if (error) {
    console.error('Error associating student with parent:', error);
    throw new Error(error.message);
  }
  
  return {
    id: data.id,
    studentId: data.student_id,
    parentId: data.parent_id,
    relationship: data.relationship,
    isPrimary: data.is_primary,
    createdAt: new Date(data.created_at),
  };
};

// Remove student-parent association
export const removeStudentFromParent = async (relationshipId: string): Promise<void> => {
  if (!isValidUUID(relationshipId)) {
    throw new Error(`Invalid relationship ID: ${relationshipId}`);
  }
  const { error } = await supabase
    .from('student_parents')
    .delete()
    .eq('id', relationshipId);
  
  if (error) {
    console.error('Error removing student-parent relationship:', error);
    throw new Error(error.message);
  }
};

// Update student-parent association
export const updateStudentParentRelationship = async (
  relationshipId: string,
  isPrimary: boolean,
  relationship?: string
): Promise<void> => {
  if (!isValidUUID(relationshipId)) {
    throw new Error(`Invalid relationship ID: ${relationshipId}`);
  }
  const { error } = await supabase
    .from('student_parents')
    .update({
      is_primary: isPrimary,
      relationship,
    })
    .eq('id', relationshipId);
  
  if (error) {
    console.error('Error updating student-parent relationship:', error);
    throw new Error(error.message);
  }
};

// Get all students for a parent
export const getStudentsForParent = async (parentId: string): Promise<Child[]> => {
  if (!isValidUUID(parentId)) {
    console.error(`Invalid parent ID: ${parentId}`);
    return [];
  }
  const { data, error } = await supabase
    .from('student_parents')
    .select('student_id')
    .eq('parent_id', parentId);
  
  if (error) {
    console.error(`Error fetching students for parent ${parentId}:`, error);
    throw new Error(error.message);
  }
  
  const studentIds = data.map(item => item.student_id).filter(isValidUUID);
  if (studentIds.length === 0) {
    return [];
  }
  
  // Fetch student details from mock data (for now)
  // TODO: Replace with real API call once student table is created
  const { getAllStudents } = await import('./mockData');
  const allStudents = getAllStudents();
  
  return allStudents.filter(student => studentIds.includes(student.id));
};

// Method to import parents from CSV
export const importParentsFromCSV = async (
  parents: ParentInput[]
): Promise<{ success: number; errors: number; errorMessages: string[] }> => {
  const errorMessages: string[] = [];
  let successCount = 0;
  
  for (const parent of parents) {
    try {
      await createParent(parent);
      successCount++;
    } catch (error: any) {
      errorMessages.push(`Failed to import ${parent.name}: ${error.message}`);
    }
  }
  
  return {
    success: successCount,
    errors: parents.length - successCount,
    errorMessages,
  };
};
