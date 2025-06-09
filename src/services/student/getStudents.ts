
import { supabase } from "@/integrations/supabase/client";
import { Child } from '@/types';

// Get all students
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
    
    // Transform database structure to match our application's structure
    return data.map((student) => ({
      id: student.id,
      name: student.name,
      classId: student.class_id || '',
      parentIds: [], // We'll populate this through a separate query in getStudentsWithParents if needed
      avatar: student.avatar || undefined
    }));
  } catch (error) {
    console.error('Error in getAllStudents:', error);
    throw error;
  }
};

// Get a student by ID
export const getStudentById = async (id: string): Promise<Child | null> => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching student:', error);
      return null;
    }
    
    // Get parent IDs for this student
    const { data: parentRelations, error: parentsError } = await supabase
      .from('student_parents')
      .select('parent_id')
      .eq('student_id', data.id);
    
    if (parentsError) {
      console.error('Error fetching student parents:', parentsError);
    }
    
    const parentIds = parentsError ? [] : parentRelations.map(rel => rel.parent_id);
    
    return {
      id: data.id,
      name: data.name,
      classId: data.class_id || '',
      parentIds: parentIds,
      avatar: data.avatar || undefined
    };
  } catch (error) {
    console.error('Error in getStudentById:', error);
    return null;
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
    
    // Then get the actual student records
    const studentIds = relations.map(rel => rel.student_id);
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .in('id', studentIds);
    
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
