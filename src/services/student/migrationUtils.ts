
import { supabase } from "@/integrations/supabase/client";
import { Child } from '@/types';
import { randomUUID } from 'crypto';

// Mapping of original numeric IDs to the new UUIDs inserted into the database
// This allows other migration steps (e.g. pickup requests) to reference the
// correct UUID that Supabase generates.
export const studentIdMap: Record<string | number, string> = {};

// Migrate student data from mock to Supabase
export const migrateStudentsToSupabase = async (
  students: Child[]
): Promise<void> => {
  try {
    // First, insert the students with new UUIDs while keeping a mapping of the
    // original numeric IDs to the generated UUIDs. This mapping will be used
    // when inserting related records (e.g. student_parents and pickup_requests).
    for (const student of students) {
      const newId = randomUUID();
      studentIdMap[student.id] = newId;

      // Insert student record with the newly generated UUID
      const { error } = await supabase
        .from('students')
        .upsert({
          id: newId,
          name: student.name,
          class_id: student.classId,
          avatar: student.avatar
        });
      
      if (error) {
        console.error('Error migrating student:', error);
        continue;
      }
      
      // Insert parent relationships
      if (student.parentIds && student.parentIds.length > 0) {
        const parentRelations = student.parentIds.map(parentId => ({
          // Use the new UUID for the student when creating the relationship
          student_id: newId,
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
