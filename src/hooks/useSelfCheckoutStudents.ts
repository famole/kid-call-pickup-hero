
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getActiveSelfCheckoutAuthorizations, SelfCheckoutAuthorizationWithDetails } from '@/services/selfCheckoutService';
import { useMemo } from 'react';

export const useSelfCheckoutStudents = (classId?: string, teacherClassIds?: string[]) => {
  const queryClient = useQueryClient();

  const { data: rawAuthorizations = [], isLoading: loading } = useQuery({
    queryKey: ['self-checkout-students', classId, teacherClassIds],
    queryFn: () => getActiveSelfCheckoutAuthorizations(),
    enabled: classId !== null, // Don't fetch if classId is null (waiting for teacher classes)
  });

  const authorizations = useMemo(() => {
    let filteredData = rawAuthorizations;
    if (teacherClassIds && teacherClassIds.length > 0) {
      filteredData = rawAuthorizations.filter(auth => 
        auth.student?.classId && teacherClassIds.includes(auth.student.classId)
      );
    }
    if (classId && classId !== 'all') {
      filteredData = filteredData.filter(auth => 
        auth.student && auth.class && String(auth.student.classId) === String(classId)
      );
    }
    return filteredData;
  }, [rawAuthorizations, classId, teacherClassIds]);

  return {
    authorizations,
    loading,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['self-checkout-students'] })
  };
};
