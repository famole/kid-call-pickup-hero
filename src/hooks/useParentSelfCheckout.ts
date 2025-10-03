import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/auth/AuthProvider';
import { 
  getSelfCheckoutAuthorizationsForParent, 
  getTodayDepartureForStudent,
  SelfCheckoutAuthorizationWithDetails,
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
  const [selfCheckoutStudents, setSelfCheckoutStudents] = useState<SelfCheckoutStudent[]>([]);
  const [loading, setLoading] = useState(true);

  const isActive = useCallback((startDate: string, endDate: string) => {
    const today = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    return today >= start && today <= end;
  }, []);

  const loadSelfCheckoutData = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get all self-checkout authorizations for the parent
      const authorizations = await getSelfCheckoutAuthorizationsForParent();
      
      // Filter for active authorizations only
      const activeAuthorizations = authorizations.filter(auth => 
        auth.isActive && isActive(auth.startDate, auth.endDate)
      );

      // For each active authorization, check if student has departed today and get notes
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

      setSelfCheckoutStudents(studentsWithStatus);
    } catch (error) {
      console.error('Error loading self-checkout data:', error);
      setSelfCheckoutStudents([]);
    } finally {
      setLoading(false);
    }
  }, [user?.email, isActive]);

  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return; // prevent StrictMode double-invoke in dev
    didInitRef.current = true;
    loadSelfCheckoutData();
  }, [loadSelfCheckoutData]);

  const refetch = useCallback(() => {
    loadSelfCheckoutData();
  }, [loadSelfCheckoutData]);

  return {
    selfCheckoutStudents,
    loading,
    refetch
  };
};