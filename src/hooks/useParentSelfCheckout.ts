
import { useCallback } from 'react';
import { useAuth } from '@/context/auth/AuthProvider';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  getSelfCheckoutAuthorizationsForParent, 
  getTodayDepartureForStudent,
  StudentDeparture 
} from '@/services/selfCheckoutService';

interface SelfCheckoutStudent {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatar?: string;
  className: string;
  classGrade: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  departedAt?: Date;
  notes?: string;
}

export const useParentSelfCheckout = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isActive = useCallback((startDate: string, endDate: string) => {
    const today = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    return today >= start && today <= end;
  }, []);

  const { data: selfCheckoutStudents = [], isLoading: loading } = useQuery({
    queryKey: ['parent-self-checkout', user?.email],
    queryFn: async (): Promise<SelfCheckoutStudent[]> => {
      const authorizations = await getSelfCheckoutAuthorizationsForParent();
      const activeAuthorizations = authorizations.filter(auth => 
        auth.isActive && isActive(auth.startDate, auth.endDate)
      );

      const studentsWithStatus: SelfCheckoutStudent[] = [];
      
      for (const auth of activeAuthorizations) {
        if (!auth.student) continue;

        let departureInfo: StudentDeparture | null = null;
        try {
          departureInfo = await getTodayDepartureForStudent(auth.student.id);
        } catch (error) {
          console.warn('Failed to get departure info for student:', auth.student.id, error);
        }

        studentsWithStatus.push({
          id: auth.id,
          studentId: auth.student.id,
          studentName: auth.student.name,
          studentAvatar: auth.student.avatar || undefined,
          className: auth.class?.name || 'Unknown Class',
          classGrade: auth.class?.grade || 'Unknown',
          startDate: auth.startDate,
          endDate: auth.endDate,
          isActive: auth.isActive && isActive(auth.startDate, auth.endDate),
          departedAt: departureInfo ? new Date(departureInfo.departedAt) : undefined,
          notes: departureInfo?.notes || undefined
        });
      }

      return studentsWithStatus;
    },
    enabled: !!user?.email,
  });

  return {
    selfCheckoutStudents,
    loading,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['parent-self-checkout'] })
  };
};
