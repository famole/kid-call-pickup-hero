
import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentParentIdCached } from '@/services/parent/getCurrentParentId';
import { logger } from '@/utils/logger';
import { useState } from 'react';

interface RecentPickup {
  id: string;
  studentName: string;
  parentName: string;
  completedTime: Date;
}

const NOTIFICATION_DURATION_MINUTES = 10;
const DISMISSED_PICKUPS_KEY = 'dismissedPickupNotifications';

export const useRecentPickupNotifications = () => {
  const queryClient = useQueryClient();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    const stored = localStorage.getItem(DISMISSED_PICKUPS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  const { data: allRecentPickups = [] } = useQuery({
    queryKey: ['recent-pickup-notifications'],
    queryFn: async (): Promise<RecentPickup[]> => {
      const currentParentId = await getCurrentParentIdCached();
      if (!currentParentId) return [];

      const { data: studentParents } = await supabase
        .from('student_parents')
        .select('student_id')
        .eq('parent_id', currentParentId);

      if (!studentParents || studentParents.length === 0) return [];

      const studentIds = studentParents.map(sp => sp.student_id);
      const cutoffTime = new Date(Date.now() - NOTIFICATION_DURATION_MINUTES * 60 * 1000);

      const { data: pickupHistory, error } = await supabase
        .from('pickup_history')
        .select(`id, student_id, parent_id, completed_time, students (name)`)
        .in('student_id', studentIds)
        .neq('parent_id', currentParentId)
        .gte('completed_time', cutoffTime.toISOString())
        .order('completed_time', { ascending: false })
        .limit(5);

      if (error || !pickupHistory?.length) return [];

      const parentIds = [...new Set(pickupHistory.map(p => p.parent_id))];
      const { secureOperations } = await import('@/services/encryption');
      const { data: parents } = await secureOperations.getParentsByIdsSecure(parentIds);

      const parentMap = new Map<string, string>();
      parents?.forEach(parent => { parentMap.set(parent.id, parent.name); });

      return pickupHistory.map(p => ({
        id: p.id,
        studentName: p.students?.name || 'Unknown',
        parentName: parentMap.get(p.parent_id) || 'Unknown Parent',
        completedTime: new Date(p.completed_time)
      }));
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Filter dismissed
  const recentPickups = allRecentPickups.filter(p => !dismissedIds.has(p.id));

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('pickup-history-changes-rq')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pickup_history' },
        () => { queryClient.invalidateQueries({ queryKey: ['recent-pickup-notifications'] }); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const dismissNotification = useCallback((id: string) => {
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(id);
    setDismissedIds(newDismissed);
    localStorage.setItem(DISMISSED_PICKUPS_KEY, JSON.stringify([...newDismissed]));
  }, [dismissedIds]);

  return {
    recentPickups,
    dismissNotification
  };
};
