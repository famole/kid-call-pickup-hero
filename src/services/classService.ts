import { supabase } from "@/integrations/supabase/client";
import { Class } from '@/types';
import { isValidUUID } from '@/utils/validators';

// Fetch all classes
export const getAllClasses = async (): Promise<Class[]> => {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching classes:', error);
      throw new Error(error.message);
    }
    
    return data as Class[];
  } catch (error) {
    console.error('Error in getAllClasses:', error);
    // Fallback to mock data if there's an error
    const { classes } = await import('./mockData');
    return classes;
  }
};

// Get a single class by ID
export const getClassById = async (id: string): Promise<Class | null> => {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching class:', error);
      
      // Fallback to mock data
      const { classes } = await import('./mockData');
      return classes.find(cls => cls.id === id) || null;
    }
    
    return data as Class;
  } catch (error) {
    console.error('Error in getClassById:', error);
    
    // Fallback to mock data
    const { getClassById: getMockClassById } = await import('./mockData');
    return getMockClassById(id);
  }
};

// Create a new class
export const createClass = async (classData: Omit<Class, 'id'>): Promise<Class> => {
  try {
    const { data, error } = await supabase
      .from('classes')
      .insert({
        name: classData.name,
        grade: classData.grade,
        teacher: classData.teacher
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating class:', error);
      throw new Error(error.message);
    }
    
    return data as Class;
  } catch (error) {
    console.error('Error in createClass:', error);
    throw error;
  }
};

// Update an existing class
export const updateClass = async (id: string, classData: Partial<Class>): Promise<Class> => {
  try {
    const updateData: Record<string, any> = {};
    if (classData.name !== undefined) updateData.name = classData.name;
    if (classData.grade !== undefined) updateData.grade = classData.grade;
    if (classData.teacher !== undefined) updateData.teacher = classData.teacher;

    const { data, error } = await supabase
      .from('classes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating class:', error);
      throw new Error(error.message);
    }
    
    return data as Class;
  } catch (error) {
    console.error('Error in updateClass:', error);
    throw error;
  }
};

// Delete a class
export const deleteClass = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting class:', error);
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Error in deleteClass:', error);
    throw error;
  }
};

// Migrate class data from mock to Supabase
export const migrateClassesToSupabase = async (classes: Class[]): Promise<void> => {
  try {
    const classesForInsert = classes.map(cls => ({
      id: cls.id,
      name: cls.name,
      grade: cls.grade,
      teacher: cls.teacher
    }));

    const { error } = await supabase
      .from('classes')
      .upsert(classesForInsert);
    
    if (error) {
      console.error('Error migrating classes:', error);
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Error in migrateClassesToSupabase:', error);
    throw error;
  }
};

// Get classes by ID lookup - utility function to help with class ID validation
export const getClassesById = async (): Promise<Record<string, Class>> => {
  try {
    const classes = await getAllClasses();
    return classes.reduce((acc, cls) => {
      acc[cls.id] = cls;
      return acc;
    }, {} as Record<string, Class>);
  } catch (error) {
    console.error('Error in getClassesById:', error);
    // Fallback to mock data
    const { classes } = await import('./mockData');
    return classes.reduce((acc, cls) => {
      acc[cls.id] = cls;
      return acc;
    }, {} as Record<string, Class>);
  }
};
