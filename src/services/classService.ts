
import { Class } from '@/types';
import { secureClassOperations } from './encryption/secureClassClient';

// Fetch all classes
export const getAllClasses = async (): Promise<Class[]> => {
  try {
    return await secureClassOperations.getAll();
  } catch (error) {
    console.error('Error in getAllClasses:', error);
    throw error;
  }
};

// Get a single class by ID
export const getClassById = async (id: string): Promise<Class | null> => {
  try {
    return await secureClassOperations.getById(id);
  } catch (error) {
    console.error('Error in getClassById:', error);
    return null;
  }
};

// Create a new class
export const createClass = async (classData: Omit<Class, 'id'>): Promise<Class> => {
  try {
    return await secureClassOperations.create(classData);
  } catch (error) {
    console.error('Error in createClass:', error);
    throw error;
  }
};

// Update an existing class
export const updateClass = async (id: string, classData: Partial<Class>): Promise<Class> => {
  try {
    return await secureClassOperations.update(id, classData);
  } catch (error) {
    console.error('Error in updateClass:', error);
    throw error;
  }
};

// Delete a class
export const deleteClass = async (id: string): Promise<void> => {
  try {
    await secureClassOperations.delete(id);
  } catch (error) {
    console.error('Error in deleteClass:', error);
    throw error;
  }
};

// Migrate class data from mock to Supabase
export const migrateClassesToSupabase = async (classes: Class[]): Promise<void> => {
  try {
    await secureClassOperations.migrate(classes);
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
    throw error;
  }
};
