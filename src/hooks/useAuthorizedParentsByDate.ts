import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface AuthorizedParent {
  parentId: string;
  parentName: string;
  parentEmail: string;
  parentRole?: string;
  students: Array<{
    id: string;
    name: string;
  }>;
}

export const useAuthorizedParentsByDate = (date: Date) => {
  const [authorizedParents, setAuthorizedParents] = useState<AuthorizedParent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuthorizedParents = async () => {
      setLoading(true);
      try {
        // Format date in local timezone to avoid timezone conversion issues
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const selectedDate = `${year}-${month}-${day}`;
        const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, etc.

        logger.info('Fetching authorized parents for date:', selectedDate, 'day:', dayOfWeek);

        // Fetch all active authorizations for the selected date and day of week
        const { data: authorizations, error } = await supabase
          .from('pickup_authorizations')
          .select(`
            id,
            authorized_parent_id,
            student_ids,
            allowed_days_of_week,
            authorized_parent:parents!authorized_parent_id (
              id,
              name,
              email,
              role
            )
          `)
          .eq('is_active', true)
          .lte('start_date', selectedDate)
          .gte('end_date', selectedDate)
          .contains('allowed_days_of_week', [dayOfWeek]);

        if (error) {
          logger.error('Error fetching authorized parents:', error);
          setAuthorizedParents([]);
          return;
        }

        if (!authorizations || authorizations.length === 0) {
          setAuthorizedParents([]);
          return;
        }

        // Get all unique student IDs
        const allStudentIds = new Set<string>();
        authorizations.forEach(auth => {
          if (auth.student_ids && Array.isArray(auth.student_ids)) {
            auth.student_ids.forEach(id => allStudentIds.add(id));
          }
        });

        // Fetch student details
        const { data: students, error: studentsError } = await supabase
          .from('students')
          .select('id, name')
          .in('id', Array.from(allStudentIds));

        if (studentsError) {
          logger.error('Error fetching students:', studentsError);
        }

        const studentsMap = new Map(
          (students || []).map(s => [s.id, s])
        );

        // Group authorizations by parent
        const parentMap = new Map<string, AuthorizedParent>();

        authorizations.forEach(auth => {
          const parent = auth.authorized_parent;
          if (!parent) return;

          if (!parentMap.has(parent.id)) {
            parentMap.set(parent.id, {
              parentId: parent.id,
              parentName: parent.name,
              parentEmail: parent.email || '',
              parentRole: parent.role,
              students: []
            });
          }

          const parentData = parentMap.get(parent.id)!;
          
          // Add students for this authorization
          if (auth.student_ids && Array.isArray(auth.student_ids)) {
            auth.student_ids.forEach(studentId => {
              const student = studentsMap.get(studentId);
              if (student && !parentData.students.some(s => s.id === studentId)) {
                parentData.students.push({
                  id: student.id,
                  name: student.name
                });
              }
            });
          }
        });

        const result = Array.from(parentMap.values())
          .sort((a, b) => a.parentName.localeCompare(b.parentName));

        logger.info(`Found ${result.length} authorized parents for ${selectedDate}`);
        setAuthorizedParents(result);
      } catch (error) {
        logger.error('Error in fetchAuthorizedParents:', error);
        setAuthorizedParents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAuthorizedParents();
  }, [date]);

  return { authorizedParents, loading };
};
