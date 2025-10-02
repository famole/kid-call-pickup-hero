import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { getCurrentParentIdCached } from '@/services/parent/getCurrentParentId';

interface StudentDeparture {
  id: string;
  departedAt: string;
  notes?: string;
  markedByUserId: string;
}

interface Student {
  id: string;
  name: string;
  avatar?: string;
}

interface Class {
  id: string;
  name: string;
  grade: string;
}

interface Parent {
  id: string;
  name: string;
  email: string;
}

interface SelfCheckoutAuthorizationHistory {
  id: string;
  studentId: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  student?: Student;
  class?: Class;
  departures?: StudentDeparture[];
}

interface PickupAuthorizationHistory {
  id: string;
  studentId: string;
  authorizedParentId: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  student?: Student;
  class?: Class;
  authorizedParent?: Parent;
}

interface SelfCheckoutHistoryData {
  authorizations: SelfCheckoutAuthorizationHistory[];
  pickupAuthorizations: PickupAuthorizationHistory[];
}

export const useSelfCheckoutHistory = () => {
  const { user } = useAuth();
  const [historyData, setHistoryData] = useState<SelfCheckoutHistoryData>({
    authorizations: [],
    pickupAuthorizations: []
  });
  const [loading, setLoading] = useState(true);

  const loadHistoryData = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get current parent ID (cached)
      const parentData = await getCurrentParentIdCached();
      if (!parentData) {
        logger.log('No parent ID found for current user');
        setHistoryData({ authorizations: [], pickupAuthorizations: [] });
        return;
      }

      // Fetch self-checkout authorizations with student and class info
      const { data: selfCheckoutData, error: selfCheckoutError } = await supabase
        .from('self_checkout_authorizations')
        .select(`
          *,
          students (
            id,
            name,
            avatar,
            classes (
              id,
              name,
              grade
            )
          )
        `)
        .eq('authorizing_parent_id', parentData)
        .order('created_at', { ascending: false });

      if (selfCheckoutError) {
        logger.error('Error fetching self-checkout authorizations:', selfCheckoutError);
        throw new Error(selfCheckoutError.message);
      }

      // Fetch pickup authorizations for students where current parent is authorizing
      const { data: pickupData, error: pickupError } = await supabase
        .from('pickup_authorizations')
        .select(`
          *,
          students (
            id,
            name,
            avatar,
            classes (
              id,
              name,
              grade
            )
          ),
          authorized_parent:parents!pickup_authorizations_authorized_parent_id_fkey (
            id,
            name,
            email
          )
        `)
        .eq('authorizing_parent_id', parentData)
        .order('created_at', { ascending: false });

      if (pickupError) {
        logger.error('Error fetching pickup authorizations:', pickupError);
        throw new Error(pickupError.message);
      }

      // For each self-checkout authorization, fetch departures
      const authorizationsWithDepartures = await Promise.all(
        (selfCheckoutData || []).map(async (auth: any) => {
          const { data: departures, error: departuresError } = await supabase
            .from('student_departures')
            .select('*')
            .eq('student_id', auth.student_id)
            .gte('departed_at', auth.start_date)
            .lte('departed_at', auth.end_date)
            .order('departed_at', { ascending: false });

          if (departuresError) {
            logger.warn('Error fetching departures for student:', auth.student_id, departuresError);
          }

          return {
            id: auth.id,
            studentId: auth.student_id,
            startDate: auth.start_date,
            endDate: auth.end_date,
            isActive: auth.is_active,
            createdAt: auth.created_at,
            student: auth.students,
            class: auth.students?.classes,
            departures: (departures || []).map(dep => ({
              id: dep.id,
              departedAt: dep.departed_at,
              notes: dep.notes,
              markedByUserId: dep.marked_by_user_id
            }))
          };
        })
      );

      // Transform pickup data to include class info
      const pickupAuthorizationsWithClass = (pickupData || []).map((auth: any) => ({
        id: auth.id,
        studentId: auth.student_id,
        authorizedParentId: auth.authorized_parent_id,
        startDate: auth.start_date,
        endDate: auth.end_date,
        isActive: auth.is_active,
        createdAt: auth.created_at,
        student: auth.students,
        class: auth.students?.classes,
        authorizedParent: auth.authorized_parent
      }));

      setHistoryData({
        authorizations: authorizationsWithDepartures,
        pickupAuthorizations: pickupAuthorizationsWithClass
      });

    } catch (error) {
      logger.error('Error loading self-checkout history:', error);
      setHistoryData({ authorizations: [], pickupAuthorizations: [] });
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    loadHistoryData();
  }, [loadHistoryData]);

  const refetch = useCallback(() => {
    loadHistoryData();
  }, [loadHistoryData]);

  return {
    historyData,
    loading,
    refetch
  };
};