import { useState, useEffect, useCallback } from 'react';
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
  const [withdrawalData, setWithdrawalData] = useState<WithdrawalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper function to get authorized student IDs
  const getAuthorizedStudentIds = async (parentId: string): Promise<string | null> => {
    try {
      const { data: studentIds } = await supabase
        .from('student_parents')
        .select('student_id')
        .eq('parent_id', parentId);
      
      return studentIds && studentIds.length > 0 ? studentIds.map(s => s.student_id).join(',') : null;
    } catch (error) {
      logger.error('Error getting authorized student IDs:', error);
      return null;
    }
  };

  const loadWithdrawalHistory = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get current parent ID (cached)
      const parentId = await getCurrentParentIdCached();
      if (!parentId) {
        logger.warn('No parent ID found for current user');
        setWithdrawalData([]);
        return;
      }

      const allRecords: WithdrawalRecord[] = [];

      // First, get student IDs for the parent to optimize the query
      const authorizedStudentIds = await getAuthorizedStudentIds(parentId);
      
      // Optimized query 1: Get pickup history with students data
      const { data: pickupHistoryData, error: pickupError } = await supabase
        .from('pickup_history')
        .select(`
          id,
          student_id,
          parent_id,
          completed_time,
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
        .or(`parent_id.eq.${parentId}${authorizedStudentIds ? `,student_id.in.(${authorizedStudentIds})` : ''}`)
        .order('completed_time', { ascending: false })
        .limit(200); // Limit to 200 most recent records for performance

      if (pickupError) {
        logger.error('Error fetching pickup history:', pickupError);
      } else if (pickupHistoryData) {
        // Get all unique parent IDs and authorization data in parallel
        const uniqueParentIds = [...new Set(pickupHistoryData.map(record => record.parent_id))];
        const studentIds = pickupHistoryData.map(record => record.student_id);
        
        const [parentsData, authorizationsData] = await Promise.all([
          // Get parent names using optimized operation
          (async () => {
            const { secureOperations } = await import('@/services/encryption');
            const { data: parents } = await secureOperations.getParentsByIdsSecure(uniqueParentIds);
            return {
              data: parents?.map(p => ({ id: p.id, name: p.name })) || [],
              error: null
            };
          })(),
          // Get authorizations
          supabase
            .from('pickup_authorizations')
            .select(`
              student_id,
              authorized_parent_id,
              authorizing_parent_id,
              parents!pickup_authorizations_authorized_parent_id_fkey (
                id,
                name
              )
            `)
            .eq('authorizing_parent_id', parentId)
            .in('student_id', studentIds)
        ]);

        // Create lookup maps
        const parentMap = new Map();
        parentsData.data?.forEach(parent => {
          parentMap.set(parent.id, parent.name);
        });

        const authMap = new Map();
        authorizationsData.data?.forEach(auth => {
          authMap.set(`${auth.student_id}-${auth.authorized_parent_id}`, auth);
        });

        // Process pickup records
        for (const record of pickupHistoryData) {
          const isOwnPickup = record.parent_id === parentId;
          const authKey = `${record.student_id}-${record.parent_id}`;
          const authorization = authMap.get(authKey);

          if (isOwnPickup || authorization) {
            allRecords.push({
              id: record.id,
              studentId: record.student_id,
              studentName: record.students?.name || 'Unknown Student',
              studentAvatar: record.students?.avatar,
              className: record.students?.classes ? 
                `${record.students.classes.name} - Grade ${record.students.classes.grade}` : undefined,
              date: new Date(record.completed_time),
              type: isOwnPickup ? 'self_pickup' : 'authorized_pickup',
              parentName: isOwnPickup ? parentMap.get(record.parent_id) : undefined,
              authorizedParentName: !isOwnPickup ? authorization?.parents?.name : undefined
            });
          }
        }
      }

      // Optimized query 2: Get self-checkout departures and authorizations separately
      const [selfCheckoutDepartures, selfCheckoutAuthorizations] = await Promise.all([
        supabase
          .from('student_departures')
          .select(`
            id,
            student_id,
            departed_at,
            notes,
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
          .order('departed_at', { ascending: false })
          .limit(200),
        supabase
          .from('self_checkout_authorizations')
          .select('student_id, id')
          .eq('authorizing_parent_id', parentId)
      ]);

      const selfCheckoutError = selfCheckoutDepartures.error;
      const selfCheckoutData = selfCheckoutDepartures.data;

      if (selfCheckoutError || selfCheckoutAuthorizations.error) {
        logger.error('Error fetching self-checkout data:', selfCheckoutError || selfCheckoutAuthorizations.error);
      } else if (selfCheckoutData && selfCheckoutAuthorizations.data) {
        // Create a set of authorized student IDs for fast lookup
        const authorizedStudentIds = new Set(
          selfCheckoutAuthorizations.data.map(auth => auth.student_id)
        );

        // Filter departures to only include those for authorized students
        for (const departure of selfCheckoutData) {
          if (authorizedStudentIds.has(departure.student_id)) {
            allRecords.push({
              id: departure.id,
              studentId: departure.student_id,
              studentName: departure.students?.name || 'Unknown Student',
              studentAvatar: departure.students?.avatar,
              className: departure.students?.classes ? 
                `${departure.students.classes.name} - Grade ${departure.students.classes.grade}` : undefined,
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
      logger.error('Error loading withdrawal history:', error);
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