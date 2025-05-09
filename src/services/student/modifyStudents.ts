
import { supabase } from "@/integrations/supabase/client";
import { Child } from '@/types';

// Create a new student
export const createStudent = async (student: Omit<Child, 'id'>): Promise<Child> => {
  try {
    // Insert the student record
    const { data, error } = await supabase
      .from('students')
      .insert({
        name: student.name,
        class_id: student.classId,
        avatar: student.avatar
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating student:', error);
      throw new Error(error.message);
    }
    
    // Add parent relationships if provided
    if (student.parentIds && student.parentIds.length > 0) {
      const parentRelations = student.parentIds.map(parentId => ({
        student_id: data.id,
        parent_id: parentId,
        is_primary: true // Default to primary for now
      }));
      
      const { error: relError } = await supabase
        .from('student_parents')
        .insert(parentRelations);
      
      if (relError) {
        console.error('Error creating student-parent relationships:', relError);
      }
    }
    
    return {
      id: data.id,
      name: data.name,
      classId: data.class_id || '',
      parentIds: student.parentIds || [],
      avatar: data.avatar || undefined
    };
  } catch (error) {
    console.error('Error in createStudent:', error);
    throw error;
  }
};

// Update an existing student
export const updateStudent = async (id: string, student: Partial<Child>): Promise<Child> => {
  try {
    const updateData: Record<string, any> = {};
    if (student.name !== undefined) updateData.name = student.name;
    if (student.classId !== undefined) updateData.class_id = student.classId;
    if (student.avatar !== undefined) updateData.avatar = student.avatar;
    
    const { data, error } = await supabase
      .from('students')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating student:', error);
      throw new Error(error.message);
    }
    
    // Update parent relationships if provided
    if (student.parentIds !== undefined) {
      // First remove existing relationships
      const { error: delError } = await supabase
        .from('student_parents')
        .delete()
        .eq('student_id', id);
      
      if (delError) {
        console.error('Error deleting student-parent relationships:', delError);
      }
      
      // Then add new ones
      if (student.parentIds.length > 0) {
        const parentRelations = student.parentIds.map(parentId => ({
          student_id: id,
          parent_id: parentId,
          is_primary: true // Default to primary for now
        }));
        
        const { error: relError } = await supabase
          .from('student_parents')
          .insert(parentRelations);
        
        if (relError) {
          console.error('Error creating student-parent relationships:', relError);
        }
      }
    }
    
    // Get current parent IDs
    const { data: parentRelations, error: parentsError } = await supabase
      .from('student_parents')
      .select('parent_id')
      .eq('student_id', id);
    
    const parentIds = parentsError ? [] : parentRelations.map(rel => rel.parent_id);
    
    return {
      id: data.id,
      name: data.name,
      classId: data.class_id || '',
      parentIds: parentIds,
      avatar: data.avatar || undefined
    };
  } catch (error) {
    console.error('Error in updateStudent:', error);
    throw error;
  }
};

// Delete a student
export const deleteStudent = async (id: string): Promise<void> => {
  try {
    // First delete parent relationships
    const { error: relError } = await supabase
      .from('student_parents')
      .delete()
      .eq('student_id', id);
    
    if (relError) {
      console.error('Error deleting student-parent relationships:', relError);
    }
    
    // Then delete the student
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting student:', error);
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Error in deleteStudent:', error);
    throw error;
  }
};
