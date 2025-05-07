
import { supabase } from "@/integrations/supabase/client";
import { Class } from '@/types';

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
    
    return data.map(classItem => ({
      id: classItem.id,
      name: classItem.name,
      grade: classItem.grade,
      teacher: classItem.teacher
    }));
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
    
    return {
      id: data.id,
      name: data.name,
      grade: data.grade,
      teacher: data.teacher
    };
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
      .insert([classData])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating class:', error);
      throw new Error(error.message);
    }
    
    return {
      id: data.id,
      name: data.name,
      grade: data.grade,
      teacher: data.teacher
    };
  } catch (error) {
    console.error('Error in createClass:', error);
    throw error;
  }
};

// Update an existing class
export const updateClass = async (id: string, classData: Partial<Class>): Promise<Class> => {
  try {
    const { data, error } = await supabase
      .from('classes')
      .update(classData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating class:', error);
      throw new Error(error.message);
    }
    
    return {
      id: data.id,
      name: data.name,
      grade: data.grade,
      teacher: data.teacher
    };
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
    const { error } = await supabase
      .from('classes')
      .upsert(
        classes.map(cls => ({
          id: cls.id,
          name: cls.name,
          grade: cls.grade,
          teacher: cls.teacher
        }))
      );
    
    if (error) {
      console.error('Error migrating classes:', error);
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Error in migrateClassesToSupabase:', error);
    throw error;
  }
};
