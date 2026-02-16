
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

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

export const useWithdrawalHistory = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: withdrawalData = [], isLoading: loading } = useQuery({
    queryKey: ['withdrawal-history', user?.email],
    queryFn: async (): Promise<WithdrawalRecord[]> => {
      const { secureOperations } = await import('@/services/encryption');
      const { data: parentData, error: parentError } = await secureOperations.getParentByIdentifierSecure(user!.email!);
      
      if (parentError || !parentData?.id) {
        logger.error('Error getting current parent ID:', parentError);
        return [];
      }

      const parentId = parentData.id;
      const allRecords: WithdrawalRecord[] = [];

      const { data: pickupHistoryData, error: pickupError } = await supabase
        .from('pickup_history')
        .select(`*, students (id, name, avatar, classes (name, grade))`)
        .order('completed_time', { ascending: false });

      if (pickupError) {
        logger.error('Error fetching pickup history:', pickupError);
      } else if (pickupHistoryData) {
        for (const record of pickupHistoryData) {
          if (record.parent_id === parentId) {
            allRecords.push({
              id: record.id, studentId: record.student_id,
              studentName: record.students?.name || 'Unknown Student',
              studentAvatar: record.students?.avatar,
              className: record.students?.classes ? `${record.students.classes.name} - Grade ${record.students.classes.grade}` : undefined,
              date: new Date(record.completed_time), type: 'self_pickup',
              parentName: parentData?.name
            });
          } else {
            const { data: authData, error: authError } = await supabase
              .from('pickup_authorizations')
              .select('id, authorized_parent_id, parents!pickup_authorizations_authorized_parent_id_fkey(name)')
              .eq('student_id', record.student_id)
              .eq('authorizing_parent_id', parentId)
              .eq('authorized_parent_id', record.parent_id)
              .single();

            if (!authError && authData) {
              allRecords.push({
                id: record.id, studentId: record.student_id,
                studentName: record.students?.name || 'Unknown Student',
                studentAvatar: record.students?.avatar,
                className: record.students?.classes ? `${record.students.classes.name} - Grade ${record.students.classes.grade}` : undefined,
                date: new Date(record.completed_time), type: 'authorized_pickup',
                authorizedParentName: authData.parents?.name
              });
            }
          }
        }
      }

      const { data: selfCheckoutData, error: selfCheckoutError } = await supabase
        .from('student_departures')
        .select(`*, students (id, name, avatar, classes (name, grade))`)
        .order('departed_at', { ascending: false });

      if (!selfCheckoutError && selfCheckoutData) {
        for (const departure of selfCheckoutData) {
          const { data: authData, error: authError } = await supabase
            .from('self_checkout_authorizations')
            .select('id')
            .eq('student_id', departure.student_id)
            .eq('authorizing_parent_id', parentId)
            .lte('start_date', new Date(departure.departed_at).toISOString().split('T')[0])
            .gte('end_date', new Date(departure.departed_at).toISOString().split('T')[0])
            .single();

          if (!authError && authData) {
            allRecords.push({
              id: departure.id, studentId: departure.student_id,
              studentName: departure.students?.name || 'Unknown Student',
              studentAvatar: departure.students?.avatar,
              className: departure.students?.classes ? `${departure.students.classes.name} - Grade ${departure.students.classes.grade}` : undefined,
              date: new Date(departure.departed_at), type: 'self_checkout',
              notes: departure.notes
            });
          }
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
    refetch: () => queryClient.invalidateQueries({ queryKey: ['withdrawal-history'] })
  };
};
