
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();

  const { data: historyData = { authorizations: [], pickupAuthorizations: [] }, isLoading: loading } = useQuery({
    queryKey: ['self-checkout-history', user?.email],
    queryFn: async (): Promise<SelfCheckoutHistoryData> => {
      const parentData = await getCurrentParentIdCached();
      if (!parentData) {
        logger.log('No parent ID found for current user');
        return { authorizations: [], pickupAuthorizations: [] };
      }

      const { data: selfCheckoutData, error: selfCheckoutError } = await supabase
        .from('self_checkout_authorizations')
        .select(`*, students (id, name, avatar, classes (id, name, grade))`)
        .eq('authorizing_parent_id', parentData)
        .order('created_at', { ascending: false });

      if (selfCheckoutError) throw new Error(selfCheckoutError.message);

      const { data: pickupData, error: pickupError } = await supabase
        .from('pickup_authorizations')
        .select(`*, students (id, name, avatar, classes (id, name, grade)), authorized_parent:parents!pickup_authorizations_authorized_parent_id_fkey (id, name, email)`)
        .eq('authorizing_parent_id', parentData)
        .order('created_at', { ascending: false });

      if (pickupError) throw new Error(pickupError.message);

      const authorizationsWithDepartures = await Promise.all(
        (selfCheckoutData || []).map(async (auth: any) => {
          const { data: departures } = await supabase
            .from('student_departures')
            .select('*')
            .eq('student_id', auth.student_id)
            .gte('departed_at', auth.start_date)
            .lte('departed_at', auth.end_date)
            .order('departed_at', { ascending: false });

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
              id: dep.id, departedAt: dep.departed_at, notes: dep.notes, markedByUserId: dep.marked_by_user_id
            }))
          };
        })
      );

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

      return { authorizations: authorizationsWithDepartures, pickupAuthorizations: pickupAuthorizationsWithClass };
    },
    enabled: !!user?.email,
  });

  return {
    historyData,
    loading,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['self-checkout-history'] })
  };
};
