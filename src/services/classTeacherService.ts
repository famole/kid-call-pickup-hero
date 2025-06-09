
import { supabase } from "@/integrations/supabase/client";

// Service for managing class-teacher relationships
export interface ClassTeacher {
  id: string;
  classId: string;
  teacherId: string;
  createdAt: string;
}

export interface ClassWithTeachers {
  id: string;
  name: string;
  grade: string;
  teacher: string; // Keep for backward compatibility
  teachers: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

// Get all class-teacher relationships
export const getClassTeachers = async (): Promise<ClassTeacher[]> => {
  try {
    const { data, error } = await supabase
      .from('class_teachers')
      .select('*')
      .order('created_at');
    
    if (error) {
      console.error('Error fetching class teachers:', error);
      throw new Error(error.message);
    }
    
    return data.map(item => ({
      id: item.id,
      classId: item.class_id,
      teacherId: item.teacher_id,
      createdAt: item.created_at
    }));
  } catch (error) {
    console.error('Error in getClassTeachers:', error);
    throw error;
  }
};

// Get classes with their assigned teachers
export const getClassesWithTeachers = async (): Promise<ClassWithTeachers[]> => {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select(`
        *,
        class_teachers(
          teacher_id,
          parents(id, name, email)
        )
      `)
      .order('name');
    
    if (error) {
      console.error('Error fetching classes with teachers:', error);
      throw new Error(error.message);
    }
    
    return data.map(cls => ({
      id: cls.id,
      name: cls.name,
      grade: cls.grade,
      teacher: cls.teacher, // Keep for backward compatibility
      teachers: cls.class_teachers?.map((ct: any) => ({
        id: ct.parents.id,
        name: ct.parents.name,
        email: ct.parents.email
      })) || [],
      createdAt: cls.created_at,
      updatedAt: cls.updated_at
    }));
  } catch (error) {
    console.error('Error in getClassesWithTeachers:', error);
    throw error;
  }
};

// Add a teacher to a class
export const addTeacherToClass = async (classId: string, teacherId: string): Promise<ClassTeacher> => {
  try {
    const { data, error } = await supabase
      .from('class_teachers')
      .insert({
        class_id: classId,
        teacher_id: teacherId
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error adding teacher to class:', error);
      throw new Error(error.message);
    }
    
    return {
      id: data.id,
      classId: data.class_id,
      teacherId: data.teacher_id,
      createdAt: data.created_at
    };
  } catch (error) {
    console.error('Error in addTeacherToClass:', error);
    throw error;
  }
};

// Remove a teacher from a class
export const removeTeacherFromClass = async (classId: string, teacherId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('class_teachers')
      .delete()
      .eq('class_id', classId)
      .eq('teacher_id', teacherId);
    
    if (error) {
      console.error('Error removing teacher from class:', error);
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Error in removeTeacherFromClass:', error);
    throw error;
  }
};

// Get teachers for a specific class
export const getTeachersForClass = async (classId: string): Promise<Array<{id: string, name: string, email: string}>> => {
  try {
    const { data, error } = await supabase
      .from('class_teachers')
      .select(`
        parents(id, name, email)
      `)
      .eq('class_id', classId);
    
    if (error) {
      console.error('Error fetching teachers for class:', error);
      throw new Error(error.message);
    }
    
    return data.map((item: any) => item.parents);
  } catch (error) {
    console.error('Error in getTeachersForClass:', error);
    throw error;
  }
};

// Get classes for a specific teacher
export const getClassesForTeacher = async (teacherId: string): Promise<Array<{id: string, name: string, grade: string}>> => {
  try {
    const { data, error } = await supabase
      .from('class_teachers')
      .select(`
        classes(id, name, grade)
      `)
      .eq('teacher_id', teacherId);
    
    if (error) {
      console.error('Error fetching classes for teacher:', error);
      throw new Error(error.message);
    }
    
    return data.map((item: any) => item.classes);
  } catch (error) {
    console.error('Error in getClassesForTeacher:', error);
    throw error;
  }
};
