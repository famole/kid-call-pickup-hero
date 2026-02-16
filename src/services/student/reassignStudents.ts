import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

/**
 * Move students to a new class, recording history for each move.
 */
export const reassignStudentsToClass = async (
  studentIds: string[],
  targetClassId: string
): Promise<number> => {
  if (studentIds.length === 0) return 0;

  // 1. Get current class assignments for these students
  const { data: students, error: fetchError } = await supabase
    .from('students')
    .select('id, class_id')
    .in('id', studentIds)
    .is('deleted_at', null);

  if (fetchError) {
    logger.error('Error fetching students for reassignment:', fetchError);
    throw new Error(fetchError.message);
  }

  // 2. Close current history entries (set end_date) for students that have a current class
  const studentsWithClass = (students || []).filter(s => s.class_id);
  if (studentsWithClass.length > 0) {
    const { error: closeError } = await supabase
      .from('student_class_history')
      .update({ end_date: new Date().toISOString().split('T')[0] })
      .in('student_id', studentsWithClass.map(s => s.id))
      .is('end_date', null);

    if (closeError) {
      logger.error('Error closing class history entries:', closeError);
      // Non-blocking: continue with reassignment
    }
  }

  // 3. Insert new history entries
  const historyEntries = studentIds.map(studentId => ({
    student_id: studentId,
    class_id: targetClassId,
    start_date: new Date().toISOString().split('T')[0],
  }));

  const { error: historyError } = await supabase
    .from('student_class_history')
    .insert(historyEntries);

  if (historyError) {
    logger.error('Error inserting class history:', historyError);
    // Non-blocking: continue with reassignment
  }

  // 4. Update students' class_id
  const { data: updated, error: updateError } = await supabase
    .from('students')
    .update({ class_id: targetClassId } as any)
    .in('id', studentIds)
    .is('deleted_at', null)
    .select('id');

  if (updateError) {
    logger.error('Error reassigning students:', updateError);
    throw new Error(updateError.message);
  }

  return updated?.length || 0;
};

/**
 * Get class history for a student.
 */
export const getStudentClassHistory = async (studentId: string) => {
  const { data, error } = await supabase
    .from('student_class_history')
    .select(`
      id,
      class_id,
      start_date,
      end_date,
      classes(name)
    `)
    .eq('student_id', studentId)
    .order('start_date', { ascending: false });

  if (error) {
    logger.error('Error fetching student class history:', error);
    throw new Error(error.message);
  }

  return data || [];
};
