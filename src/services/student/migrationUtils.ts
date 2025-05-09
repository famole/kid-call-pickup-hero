
import { supabase } from "@/integrations/supabase/client";
import { Child } from '@/types';

// Migrate student data from mock to Supabase
export const migrateStudentsToSupabase = async (students: Child[]): Promise<void> => {
  try {
    // First, insert the students
    for (const student of students) {
      // Insert student record
      const { data, error } = await supabase
        .from('students')
        .upsert({
          id: student.id,
          name: student.name,
          class_id: student.classId,
          avatar: student.avatar
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error migrating student:', error);
        continue;
      }
      
      // Insert parent relationships
      if (student.parentIds && student.parentIds.length > 0) {
        const parentRelations = student.parentIds.map(parentId => ({
          student_id: student.id,
          parent_id: parentId,
          is_primary: true
        }));
        
        const { error: relError } = await supabase
          .from('student_parents')
          .upsert(parentRelations);
        
        if (relError) {
          console.error('Error migrating student-parent relationships:', relError);
        }
      }
    }
  } catch (error) {
    console.error('Error in migrateStudentsToSupabase:', error);
    throw error;
  }
};
