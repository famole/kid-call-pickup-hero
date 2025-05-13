
import { supabase } from "@/integrations/supabase/client";
import { Child } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { isValidUUID } from '@/utils/validators';

// Helper function to ensure valid UUID format
const ensureUUID = (id: string): string => {
  return isValidUUID(id) ? id : uuidv4();
};

// Migrate student data from mock to Supabase
export const migrateStudentsToSupabase = async (students: Child[]): Promise<void> => {
  try {
    // First, insert the students
    for (const student of students) {
      // Ensure proper UUID format for all IDs
      const validStudentId = ensureUUID(student.id);
      const validClassId = student.classId ? ensureUUID(student.classId) : null;
      
      // Insert student record
      const { data, error } = await supabase
        .from('students')
        .upsert({
          id: validStudentId,
          name: student.name,
          class_id: validClassId,
          avatar: student.avatar
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error migrating student:', error);
        continue;
      }
      
      // Insert parent relationships with valid UUIDs
      if (student.parentIds && student.parentIds.length > 0) {
        const parentRelations = student.parentIds
          .filter(id => id) // Filter out any null or undefined IDs
          .map(parentId => {
            const validParentId = ensureUUID(parentId);
            return {
              student_id: validStudentId,
              parent_id: validParentId,
              is_primary: true
            };
          });
        
        if (parentRelations.length > 0) {
          const { error: relError } = await supabase
            .from('student_parents')
            .upsert(parentRelations);
          
          if (relError) {
            console.error('Error migrating student-parent relationships:', relError);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in migrateStudentsToSupabase:', error);
    throw error;
  }
};
