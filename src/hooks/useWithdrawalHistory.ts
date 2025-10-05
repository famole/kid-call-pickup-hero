import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

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
  const [withdrawalData, setWithdrawalData] = useState<WithdrawalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWithdrawalHistory = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get current parent data using targeted query
      const { secureOperations } = await import('@/services/encryption');
      const { data: parentData, error: parentError } = await secureOperations.getParentByIdentifierSecure(user.email);
      
      if (parentError) {
        console.error('Error getting current parent ID:', parentError);
        setWithdrawalData([]);
        return;
      }

      if (!parentData?.id) {
        console.log('No parent ID found for current user');
        setWithdrawalData([]);
        return;
      }

      const parentId = parentData.id;

      const allRecords: WithdrawalRecord[] = [];

      // 1. Fetch pickup history (self pickups and authorized pickups)
      const { data: pickupHistoryData, error: pickupError } = await supabase
        .from('pickup_history')
        .select(`
          *,
          students (
            id,
            name,
            avatar,
            classes (
              name,
              grade
            )
          )
        `)
        .order('completed_time', { ascending: false });

      if (pickupError) {
        console.error('Error fetching pickup history:', pickupError);
      } else if (pickupHistoryData) {
        for (const record of pickupHistoryData) {
          // Check if this pickup was done by the current parent (self pickup)
          if (record.parent_id === parentId) {
            // Use the parent data we already fetched
            const parentInfo = parentData;

            allRecords.push({
              id: record.id,
              studentId: record.student_id,
              studentName: record.students?.name || 'Unknown Student',
              studentAvatar: record.students?.avatar,
              className: record.students?.classes ? `${record.students.classes.name} - Grade ${record.students.classes.grade}` : undefined,
              date: new Date(record.completed_time),
              type: 'self_pickup',
              parentName: parentInfo?.name
            });
          } else {
            // Check if this pickup was authorized by the current parent
            const { data: authData, error: authError } = await supabase
              .from('pickup_authorizations')
              .select('id, authorized_parent_id, parents!pickup_authorizations_authorized_parent_id_fkey(name)')
              .eq('student_id', record.student_id)
              .eq('authorizing_parent_id', parentId)
              .eq('authorized_parent_id', record.parent_id)
              .single();

            if (!authError && authData) {
              allRecords.push({
                id: record.id,
                studentId: record.student_id,
                studentName: record.students?.name || 'Unknown Student',
                studentAvatar: record.students?.avatar,
                className: record.students?.classes ? `${record.students.classes.name} - Grade ${record.students.classes.grade}` : undefined,
                date: new Date(record.completed_time),
                type: 'authorized_pickup',
                authorizedParentName: authData.parents?.name
              });
            }
          }
        }
      }

      // 2. Fetch self-checkout departures
      const { data: selfCheckoutData, error: selfCheckoutError } = await supabase
        .from('student_departures')
        .select(`
          *,
          students (
            id,
            name,
            avatar,
            classes (
              name,
              grade
            )
          )
        `)
        .order('departed_at', { ascending: false });

      if (selfCheckoutError) {
        console.error('Error fetching self-checkout departures:', selfCheckoutError);
      } else if (selfCheckoutData) {
        // Filter departures for students authorized by current parent
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
              id: departure.id,
              studentId: departure.student_id,
              studentName: departure.students?.name || 'Unknown Student',
              studentAvatar: departure.students?.avatar,
              className: departure.students?.classes ? `${departure.students.classes.name} - Grade ${departure.students.classes.grade}` : undefined,
              date: new Date(departure.departed_at),
              type: 'self_checkout',
              notes: departure.notes
            });
          }
        }
      }

      // Sort all records by date (most recent first)
      allRecords.sort((a, b) => b.date.getTime() - a.date.getTime());

      setWithdrawalData(allRecords);

    } catch (error) {
      console.error('Error loading withdrawal history:', error);
      setWithdrawalData([]);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    loadWithdrawalHistory();
  }, [loadWithdrawalHistory]);

  const refetch = useCallback(() => {
    loadWithdrawalHistory();
  }, [loadWithdrawalHistory]);

  return {
    withdrawalData,
    loading,
    refetch
  };
};