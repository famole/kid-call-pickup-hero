
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { getCurrentParentIdCached } from '@/services/parent/getCurrentParentId';

interface WithdrawalRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatar?: string;
  className?: string;
  date: Date;
  type: 'self_pickup' | 'authorized_pickup' | 'self_checkout';
  parentName?: string;
  authorizedParentName?: string;
  notes?: string;
}

export const useOptimizedWithdrawalHistory = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: withdrawalData = [], isLoading: loading } = useQuery({
    queryKey: ['optimized-withdrawal-history', user?.email],
    queryFn: async (): Promise<WithdrawalRecord[]> => {
      const parentId = await getCurrentParentIdCached();
      if (!parentId) {
        logger.warn('No parent ID found for current user');
        return [];
      }

      // Get authorized student IDs
      const { data: userRole } = await supabase.rpc('get_current_user_role');
      let studentIdsArray: string[];

      if (userRole && ['admin', 'teacher', 'superadmin'].includes(userRole)) {
        const { data: allStudents } = await supabase.from('students').select('id').is('deleted_at', null);
        studentIdsArray = allStudents?.map(s => s.id) || [];
      } else {
        const { data: studentIds } = await supabase.from('student_parents').select('student_id').eq('parent_id', parentId);
        studentIdsArray = studentIds?.map(s => s.student_id) || [];
      }

      if (studentIdsArray.length === 0) return [];

      const allRecords: WithdrawalRecord[] = [];

      // Fetch pickup history
      const { data: pickupHistoryData, error: pickupError } = await supabase
        .from('pickup_history')
        .select(`id, student_id, parent_id, completed_time, students (id, name, avatar, classes (name, grade))`)
        .in('student_id', studentIdsArray)
        .order('completed_time', { ascending: false })
        .limit(200);

      if (!pickupError && pickupHistoryData) {
        const uniqueParentIds = [...new Set(pickupHistoryData.map(r => r.parent_id))];
        const studentIds = pickupHistoryData.map(r => r.student_id);

        const [parentsData, authorizationsData] = await Promise.all([
          (async () => {
            const { secureOperations } = await import('@/services/encryption');
            const { data: parents } = await secureOperations.getParentsByIdsSecure(uniqueParentIds);
            return parents?.map(p => ({ id: p.id, name: p.name })) || [];
          })(),
          supabase
            .from('pickup_authorizations')
            .select(`student_id, authorized_parent_id, authorizing_parent_id, parents!pickup_authorizations_authorized_parent_id_fkey (id, name)`)
            .eq('authorizing_parent_id', parentId)
            .in('student_id', studentIds)
        ]);

        const parentMap = new Map<string, string>(parentsData.map(p => [p.id, p.name]));
        const authMap = new Map();
        authorizationsData.data?.forEach((auth: any) => {
          authMap.set(`${auth.student_id}-${auth.authorized_parent_id}`, auth);
        });

        for (const record of pickupHistoryData) {
          const isOwnPickup = record.parent_id === parentId;
          allRecords.push({
            id: record.id, studentId: record.student_id,
            studentName: record.students?.name || 'Unknown Student',
            studentAvatar: record.students?.avatar,
            className: record.students?.classes ? `${record.students.classes.name} - Grade ${record.students.classes.grade}` : undefined,
            date: new Date(record.completed_time),
            type: isOwnPickup ? 'self_pickup' : 'authorized_pickup',
            parentName: isOwnPickup ? parentMap.get(record.parent_id) : undefined,
            authorizedParentName: !isOwnPickup ? parentMap.get(record.parent_id) : undefined
          });
        }
      }

      // Fetch self-checkout departures
      const { data: selfCheckoutData, error: selfCheckoutError } = await supabase
        .from('student_departures')
        .select(`id, student_id, departed_at, notes, marked_by_user_id, students (id, name, avatar, classes (name, grade))`)
        .in('student_id', studentIdsArray)
        .order('departed_at', { ascending: false })
        .limit(200);

      if (!selfCheckoutError && selfCheckoutData) {
        const uniqueTeacherIds = [...new Set(selfCheckoutData.map(r => r.marked_by_user_id))];
        const { secureOperations } = await import('@/services/encryption');
        const { data: teachers } = await secureOperations.getParentsByIdsSecure(uniqueTeacherIds);
        const teacherMap = new Map<string, string>(teachers?.map(t => [t.id, t.name]) || []);

        for (const departure of selfCheckoutData) {
          allRecords.push({
            id: departure.id, studentId: departure.student_id,
            studentName: teacherMap.get(departure.marked_by_user_id) || 'Unknown Teacher',
            studentAvatar: departure.students?.avatar,
            className: departure.students?.classes ? `${departure.students.classes.name} - Grade ${departure.students.classes.grade}` : undefined,
            date: new Date(departure.departed_at), type: 'self_checkout',
            notes: departure.notes
          });
        }
      }

      allRecords.sort((a, b) => b.date.getTime() - a.date.getTime());
      return allRecords;
    },
    enabled: !!user?.email,
  });

  return {
    withdrawalData,
    loading,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['optimized-withdrawal-history'] })
  };
};
