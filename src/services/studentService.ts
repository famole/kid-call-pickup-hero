import { supabase } from "@/integrations/supabase/client";
import { Child } from '@/types';

// Import functions from the refactored modules
export { getAllStudents, getStudentById, getStudentsForParent } from './student/getStudents';
export { createStudent, updateStudent, deleteStudent } from './student/modifyStudents';

// Get a single student by ID with improved error handling
export const getStudentByIdLegacy = async (id: string): Promise<Child | null> => {
  try {
    
    // Validate the ID format (should be UUID)
    if (!id || typeof id !== 'string') {
      console.warn(`Invalid student ID provided: ${id}`);
      return null;
    }
    
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .maybeSingle(); // Use maybeSingle to handle cases where no record is found
    
    if (error) {
      console.error('Supabase error fetching student:', error);
      // Don't throw error, just return null to prevent cascade failures
      return null;
    }
    
    if (!data) {
      console.warn(`No student found with id: ${id}`);
      return null;
    }
    
    
    // Get parent IDs for this student
    const { data: parentData, error: parentError } = await supabase
      .from('student_parents')
      .select('parent_id')
      .eq('student_id', id);
    
    if (parentError) {
      console.error('Error fetching parent relationships:', parentError);
    }
    
    const parentIds = parentData ? parentData.map(p => p.parent_id) : [];
    
    return {
      id: data.id,
      name: data.name,
      classId: data.class_id || '',
      parentIds: parentIds,
      avatar: data.avatar
    };
  } catch (error) {
    console.error('Error in getStudentById:', error);
    return null;
  }
};

// Get all students
export const getAllStudentsLegacy = async (): Promise<Child[]> => {
  try {
    
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Supabase error fetching students:', error);
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!data) {
      return [];
    }
    
    
    // Get parent relationships for all students
    const studentIds = data.map(s => s.id);
    const { data: parentData, error: parentError } = await supabase
      .from('student_parents')
      .select('student_id, parent_id')
      .in('student_id', studentIds);
    
    if (parentError) {
      console.error('Error fetching parent relationships:', parentError);
    }
    
    // Group parent IDs by student ID
    const parentsByStudent = (parentData || []).reduce((acc, rel) => {
      if (!acc[rel.student_id]) {
        acc[rel.student_id] = [];
      }
      acc[rel.student_id].push(rel.parent_id);
      return acc;
    }, {} as Record<string, string[]>);
    
    return data.map(student => ({
      id: student.id,
      name: student.name,
      classId: student.class_id || '',
      parentIds: parentsByStudent[student.id] || [],
      avatar: student.avatar
    }));
  } catch (error) {
    console.error('Error in getAllStudents:', error);
    throw error;
  }
};
