import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

/**
 * Withdraw specific students by IDs: sets status to 'withdrawn', removes class_id,
 * and deactivates parents who have no other active/graduated students.
 */
export const withdrawStudentsByIds = async (studentIds: string[]): Promise<number> => {
  // 1. Update students to 'withdrawn' status
  const { data, error } = await supabase
    .from('students')
    .update({ status: 'withdrawn', class_id: null } as any)
    .in('id', studentIds)
    .is('deleted_at', null)
    .select('id');

  if (error) {
    logger.error('Error withdrawing students:', error);
    throw new Error(error.message);
  }

  const withdrawnCount = data?.length || 0;

  // 2. Find parents of withdrawn students
  const { data: parentRels, error: relError } = await supabase
    .from('student_parents')
    .select('parent_id')
    .in('student_id', studentIds);

  if (relError) {
    logger.error('Error fetching parent relations:', relError);
    return withdrawnCount;
  }

  const parentIds = [...new Set(parentRels.map(r => r.parent_id))];

  // 3. For each parent, check if they have other active/graduated students
  for (const parentId of parentIds) {
    const { data: otherStudents, error: otherError } = await supabase
      .from('student_parents')
      .select('student_id, students!inner(status, deleted_at)')
      .eq('parent_id', parentId)
      .not('student_id', 'in', `(${studentIds.join(',')})`);

    if (otherError) {
      logger.error(`Error checking other students for parent ${parentId}:`, otherError);
      continue;
    }

    const hasActiveStudents = otherStudents?.some((rel: any) => {
      const student = rel.students;
      return student && !student.deleted_at && (student.status === 'active' || student.status === 'graduated');
    });

    if (!hasActiveStudents) {
      // Soft-delete the parent (set deleted_at)
      const { error: deactivateError } = await supabase
        .from('parents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', parentId)
        .is('deleted_at', null);

      if (deactivateError) {
        logger.error(`Error deactivating parent ${parentId}:`, deactivateError);
      }
    }
  }

  return withdrawnCount;
};
