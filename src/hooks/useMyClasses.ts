import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Class } from '@/types';
import { useAuth } from '@/context/AuthContext';

/**
 * Returns only the classes that belong to the current user's students (for parents),
 * or all classes (for admins/teachers).
 */
export const useMyClasses = () => {
  const { user } = useAuth();
  const isAdminOrTeacher = user?.role === 'admin' || user?.role === 'teacher' || user?.role === 'superadmin';

  return useQuery({
    queryKey: ['my-classes', user?.id, isAdminOrTeacher],
    queryFn: async (): Promise<Class[]> => {
      if (isAdminOrTeacher) {
        // Admins/teachers see all classes
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .order('name');
        if (error) throw error;
        return (data || []) as Class[];
      }

      // For parents: get classes via student_parents -> students -> classes
      const { data: parentId } = await supabase.rpc('get_current_parent_id');
      if (!parentId) return [];

      const { data, error } = await supabase
        .from('student_parents')
        .select(`
          students!fk_student_parents_student (
            class_id,
            classes!students_class_id_fkey (
              id,
              name,
              grade,
              teacher
            )
          )
        `)
        .eq('parent_id', parentId);

      if (error) throw error;

      // Extract unique classes from the nested result
      const classMap = new Map<string, Class>();
      for (const sp of data || []) {
        const student = (sp as any).students;
        if (student?.classes) {
          const cls = student.classes;
          if (cls.id && !classMap.has(cls.id)) {
            classMap.set(cls.id, cls as Class);
          }
        }
      }

      return Array.from(classMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};
