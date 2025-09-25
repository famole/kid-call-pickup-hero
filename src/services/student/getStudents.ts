import { supabase } from "@/integrations/supabase/client";
import { secureStudentOperations } from "@/services/encryption/secureStudentClient";
import { Child } from "@/types";

// Get all students using secure operations
export const getAllStudents = async (includeDeleted: boolean = false): Promise<Child[]> => {
  try {
    const { data, error } = await secureStudentOperations.getStudentsSecure(includeDeleted);

    if (error) {
      console.error('Error fetching students with secure operations:', error);
      throw new Error(error.message || 'Failed to fetch students');
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllStudents:', error);
    throw error;
  }
};

// Get a student by ID using secure operations
export const getStudentById = async (id: string): Promise<Child | null> => {
  try {
    const { data, error } = await secureStudentOperations.getStudentByIdSecure(id);

    if (error) {
      console.error('Error fetching student by ID with secure operations:', error);
      throw new Error(error.message || 'Failed to fetch student');
    }

    return data;
  } catch (error) {
    console.error('Error in getStudentById:', error);
    throw error;
  }
};

// Get students for a specific parent
export const getStudentsForParent = async (parentId: string): Promise<Child[]> => {
  try {
    // First get the student IDs related to this parent
    const { data: relations, error: relationsError } = await supabase
      .from('student_parents')
      .select('student_id')
      .eq('parent_id', parentId);
    
    if (relationsError) {
      console.error('Error fetching student relations:', relationsError);
      throw new Error(relationsError.message);
    }
    
    if (!relations || relations.length === 0) {
      return [];
    }
    
    // Then get the actual student records (excluding deleted)
    const studentIds = relations.map(rel => rel.student_id);
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .in('id', studentIds)
      .is('deleted_at', null);
    
    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      throw new Error(studentsError.message);
    }
    
    // Transform the data to match our application's structure
    return students.map((student) => ({
      id: student.id,
      name: student.name,
      classId: student.class_id || '',
      parentIds: [parentId], // We know this parent is related at least
      avatar: student.avatar || undefined
    }));
  } catch (error) {
    console.error('Error in getStudentsForParent:', error);
    throw error;
  }
};
