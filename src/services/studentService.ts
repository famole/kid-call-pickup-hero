
import { supabase } from "@/integrations/supabase/client";
import { Child } from '@/types';

// Fetch all students
export const getAllStudents = async (): Promise<Child[]> => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching students:', error);
      throw new Error(error.message);
    }
    
    return data.map(student => ({
      id: student.id,
      name: student.name,
      classId: student.class_id,
      parentIds: [], // We'll need to fetch parent relationships separately
      avatar: student.avatar
    }));
  } catch (error) {
    console.error('Error in getAllStudents:', error);
    // Fallback to mock data if there's an error
    const { getAllStudents: getMockStudents } = await import('./mockData');
    return getMockStudents();
  }
};

// Get a single student by ID
export const getStudentById = async (id: string): Promise<Child | null> => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching student:', error);
      
      // Fallback to mock data
      const { getChildById } = await import('./mockData');
      return getChildById(id);
    }
    
    // Get parent ids from relationships table
    const { data: relationships, error: relError } = await supabase
      .from('student_parents')
      .select('parent_id')
      .eq('student_id', id);
      
    const parentIds = relError ? [] : relationships.map(rel => rel.parent_id);
    
    return {
      id: data.id,
      name: data.name,
      classId: data.class_id,
      parentIds: parentIds,
      avatar: data.avatar
    };
  } catch (error) {
    console.error('Error in getStudentById:', error);
    
    // Fallback to mock data
    const { getChildById } = await import('./mockData');
    return getChildById(id);
  }
};

// Get students for a parent
export const getStudentsForParent = async (parentId: string): Promise<Child[]> => {
  try {
    const { data: relationships, error: relError } = await supabase
      .from('student_parents')
      .select('student_id')
      .eq('parent_id', parentId);
    
    if (relError) {
      console.error('Error fetching student relationships:', relError);
      
      // Fallback to mock data
      const { getChildrenForParent } = await import('./mockData');
      return getChildrenForParent(parentId);
    }
    
    if (relationships.length === 0) {
      return [];
    }
    
    const studentIds = relationships.map(rel => rel.student_id);
    
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .in('id', studentIds);
    
    if (error) {
      console.error('Error fetching students:', error);
      
      // Fallback to mock data
      const { getChildrenForParent } = await import('./mockData');
      return getChildrenForParent(parentId);
    }
    
    return data.map(student => ({
      id: student.id,
      name: student.name,
      classId: student.class_id,
      parentIds: [parentId], // We're only including the current parent for simplicity
      avatar: student.avatar
    }));
  } catch (error) {
    console.error('Error in getStudentsForParent:', error);
    
    // Fallback to mock data
    const { getChildrenForParent } = await import('./mockData');
    return getChildrenForParent(parentId);
  }
};

// Create a new student
export const createStudent = async (studentData: Omit<Child, 'id'>): Promise<Child> => {
  try {
    const { data, error } = await supabase
      .from('students')
      .insert([{
        name: studentData.name,
        class_id: studentData.classId,
        avatar: studentData.avatar
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating student:', error);
      throw new Error(error.message);
    }
    
    const student = {
      id: data.id,
      name: data.name,
      classId: data.class_id,
      parentIds: [],
      avatar: data.avatar
    };
    
    // Add parent relationships if there are any
    if (studentData.parentIds && studentData.parentIds.length > 0) {
      const relationshipData = studentData.parentIds.map(parentId => ({
        student_id: data.id,
        parent_id: parentId,
        is_primary: false
      }));
      
      const { error: relError } = await supabase
        .from('student_parents')
        .insert(relationshipData);
      
      if (relError) {
        console.error('Error creating student-parent relationships:', relError);
      } else {
        student.parentIds = studentData.parentIds;
      }
    }
    
    return student;
  } catch (error) {
    console.error('Error in createStudent:', error);
    throw error;
  }
};

// Update an existing student
export const updateStudent = async (id: string, studentData: Partial<Child>): Promise<Child> => {
  try {
    const updateData: any = {};
    if (studentData.name) updateData.name = studentData.name;
    if (studentData.classId) updateData.class_id = studentData.classId;
    if (studentData.avatar) updateData.avatar = studentData.avatar;
    
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
    
    // Get current parent ids
    const { data: relationships, error: relError } = await supabase
      .from('student_parents')
      .select('parent_id')
      .eq('student_id', id);
      
    const currentParentIds = relError ? [] : relationships.map(rel => rel.parent_id);
    
    // Update parent relationships if provided
    if (studentData.parentIds) {
      // Remove old relationships
      if (currentParentIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('student_parents')
          .delete()
          .eq('student_id', id);
        
        if (deleteError) {
          console.error('Error deleting student-parent relationships:', deleteError);
        }
      }
      
      // Add new relationships
      if (studentData.parentIds.length > 0) {
        const relationshipData = studentData.parentIds.map(parentId => ({
          student_id: id,
          parent_id: parentId,
          is_primary: false
        }));
        
        const { error: insertError } = await supabase
          .from('student_parents')
          .insert(relationshipData);
        
        if (insertError) {
          console.error('Error creating student-parent relationships:', insertError);
        }
      }
    }
    
    return {
      id: data.id,
      name: data.name,
      classId: data.class_id,
      parentIds: studentData.parentIds || currentParentIds,
      avatar: data.avatar
    };
  } catch (error) {
    console.error('Error in updateStudent:', error);
    throw error;
  }
};

// Delete a student
export const deleteStudent = async (id: string): Promise<void> => {
  try {
    // Delete student-parent relationships first
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

// Migrate student data from mock to Supabase
export const migrateStudentsToSupabase = async (students: Child[]): Promise<void> => {
  try {
    for (const student of students) {
      // Insert student
      const { data, error } = await supabase
        .from('students')
        .upsert([{
          id: student.id,
          name: student.name,
          class_id: student.classId,
          avatar: student.avatar
        }])
        .select()
        .single();
      
      if (error) {
        console.error(`Error migrating student ${student.name}:`, error);
        continue;
      }
      
      // Insert student-parent relationships
      if (student.parentIds.length > 0) {
        const relationshipData = student.parentIds.map(parentId => ({
          student_id: data.id,
          parent_id: parentId,
          is_primary: false
        }));
        
        const { error: relError } = await supabase
          .from('student_parents')
          .upsert(relationshipData);
        
        if (relError) {
          console.error(`Error migrating relationships for student ${student.name}:`, relError);
        }
      }
    }
  } catch (error) {
    console.error('Error in migrateStudentsToSupabase:', error);
    throw error;
  }
};
