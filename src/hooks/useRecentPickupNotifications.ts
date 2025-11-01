import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentParentIdCached } from '@/services/parent/getCurrentParentId';
import { logger } from '@/utils/logger';

interface RecentPickup {
  id: string;
  studentName: string;
  parentName: string;
  completedTime: Date;
}

const NOTIFICATION_DURATION_MINUTES = 10;
const DISMISSED_PICKUPS_KEY = 'dismissedPickupNotifications';

export const useRecentPickupNotifications = () => {
  const [recentPickups, setRecentPickups] = useState<RecentPickup[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    const stored = localStorage.getItem(DISMISSED_PICKUPS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  const loadRecentPickups = useCallback(async () => {
    try {
      const currentParentId = await getCurrentParentIdCached();
      if (!currentParentId) return;

      // Get student IDs for the current parent
      const { data: studentParents } = await supabase
        .from('student_parents')
        .select('student_id')
        .eq('parent_id', currentParentId);

      if (!studentParents || studentParents.length === 0) return;

      const studentIds = studentParents.map(sp => sp.student_id);
      const cutoffTime = new Date(Date.now() - NOTIFICATION_DURATION_MINUTES * 60 * 1000);

      // Get recent pickup history
      const { data: pickupHistory, error } = await supabase
        .from('pickup_history')
        .select(`
          id,
          student_id,
          parent_id,
          completed_time,
          students (
            name
          )
        `)
        .in('student_id', studentIds)
        .neq('parent_id', currentParentId)
        .gte('completed_time', cutoffTime.toISOString())
        .order('completed_time', { ascending: false })
        .limit(5);

      if (error) {
        logger.error('Error fetching recent pickups:', error);
        return;
      }

      if (!pickupHistory || pickupHistory.length === 0) {
        setRecentPickups([]);
        return;
      }

      // Get parent names
      const parentIds = [...new Set(pickupHistory.map(p => p.parent_id))];
      const { secureOperations } = await import('@/services/encryption');
      const { data: parents } = await secureOperations.getParentsByIdsSecure(parentIds);

      const parentMap = new Map();
      parents?.forEach(parent => {
        parentMap.set(parent.id, parent.name);
      });

      // Map to notification format and filter dismissed ones
      const pickups: RecentPickup[] = pickupHistory
        .map(p => ({
          id: p.id,
          studentName: p.students?.name || 'Unknown',
          parentName: parentMap.get(p.parent_id) || 'Unknown Parent',
          completedTime: new Date(p.completed_time)
        }))
        .filter(p => !dismissedIds.has(p.id));

      setRecentPickups(pickups);
    } catch (error) {
      logger.error('Error loading recent pickup notifications:', error);
    }
  }, [dismissedIds]);

  useEffect(() => {
    loadRecentPickups();

    // Set up real-time subscription
    const channel = supabase
      .channel('pickup-history-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pickup_history'
        },
        () => {
          loadRecentPickups();
        }
      )
      .subscribe();

    // Refresh every minute to check for expired notifications
    const interval = setInterval(loadRecentPickups, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [loadRecentPickups]);

  const dismissNotification = useCallback((id: string) => {
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(id);
    setDismissedIds(newDismissed);
    localStorage.setItem(DISMISSED_PICKUPS_KEY, JSON.stringify([...newDismissed]));
    setRecentPickups(prev => prev.filter(p => p.id !== id));
  }, [dismissedIds]);

  return {
    recentPickups,
    dismissNotification
  };
};
