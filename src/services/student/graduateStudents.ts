import { supabase } from "@/integrations/supabase/client";

/**
 * Graduate students by class: sets status to 'graduated' and removes class_id.
 */
export const graduateStudentsByClass = async (classId: string): Promise<number> => {
  const { data, error } = await supabase
    .from('students')
    .update({ status: 'graduated', class_id: null } as any)
    .eq('class_id', classId)
    .is('deleted_at', null)
    .eq('status', 'active' as any)
    .select('id');

  if (error) {
    console.error('Error graduating students:', error);
    throw new Error(error.message);
  }

  return data?.length || 0;
};

/**
 * Graduate specific students by IDs.
 */
export const graduateStudentsByIds = async (studentIds: string[]): Promise<number> => {
  const { data, error } = await supabase
    .from('students')
    .update({ status: 'graduated', class_id: null } as any)
    .in('id', studentIds)
    .is('deleted_at', null)
    .select('id');

  if (error) {
    console.error('Error graduating students:', error);
    throw new Error(error.message);
  }

  return data?.length || 0;
};
