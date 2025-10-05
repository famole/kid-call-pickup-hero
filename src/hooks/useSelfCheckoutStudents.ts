
import { useState, useEffect } from 'react';
import { getActiveSelfCheckoutAuthorizations, SelfCheckoutAuthorizationWithDetails } from '@/services/selfCheckoutService';

export const useSelfCheckoutStudents = (classId?: string, teacherClassIds?: string[]) => {
  const [authorizations, setAuthorizations] = useState<SelfCheckoutAuthorizationWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAuthorizations = async () => {
      // Don't fetch if classId is null (waiting for teacher classes to load)
      if (classId === null) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getActiveSelfCheckoutAuthorizations();
        
        // Filter by teacher's classes first if applicable
        let filteredData = data;
        if (teacherClassIds && teacherClassIds.length > 0) {
          filteredData = data.filter(auth => 
            auth.student?.classId && teacherClassIds.includes(auth.student.classId)
          );
        }
        
        // Then filter by selected class if specified
        if (classId && classId !== 'all') {
          filteredData = filteredData.filter(auth => 
            auth.student && auth.class && String(auth.student.classId) === String(classId)
          );
        }
        
        setAuthorizations(filteredData);
      } catch (error) {
        console.error('Error fetching self-checkout authorizations:', error);
        setAuthorizations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAuthorizations();
  }, [classId, teacherClassIds]);

  return {
    authorizations,
    loading,
    refetch: () => {
      const fetchAuthorizations = async () => {
        // Don't fetch if classId is null (waiting for teacher classes to load)
        if (classId === null) {
          setLoading(false);
          return;
        }

        try {
          setLoading(true);
          const data = await getActiveSelfCheckoutAuthorizations();
          
          // Filter by teacher's classes first if applicable
          let filteredData = data;
          if (teacherClassIds && teacherClassIds.length > 0) {
            filteredData = data.filter(auth => 
              auth.student?.classId && teacherClassIds.includes(auth.student.classId)
            );
          }
          
          // Then filter by selected class if specified
          if (classId && classId !== 'all') {
            filteredData = filteredData.filter(auth => 
              auth.student && auth.class && String(auth.student.classId) === String(classId)
            );
          }
          
          setAuthorizations(filteredData);
        } catch (error) {
          console.error('Error fetching self-checkout authorizations:', error);
          setAuthorizations([]);
        } finally {
          setLoading(false);
        }
      };
      fetchAuthorizations();
    }
  };
};
