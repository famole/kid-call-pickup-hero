
import { useState, useEffect } from 'react';
import { getActiveSelfCheckoutAuthorizations, SelfCheckoutAuthorizationWithDetails } from '@/services/selfCheckoutService';

export const useSelfCheckoutStudents = (classId?: string) => {
  const [authorizations, setAuthorizations] = useState<SelfCheckoutAuthorizationWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAuthorizations = async () => {
      try {
        setLoading(true);
        const data = await getActiveSelfCheckoutAuthorizations();
        
        // Filter by class if specified
        let filteredData = data;
        if (classId && classId !== 'all') {
          filteredData = data.filter(auth => 
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
  }, [classId]);

  return {
    authorizations,
    loading,
    refetch: () => {
      const fetchAuthorizations = async () => {
        try {
          setLoading(true);
          const data = await getActiveSelfCheckoutAuthorizations();
          
          // Filter by class if specified
          let filteredData = data;
          if (classId && classId !== 'all') {
            filteredData = data.filter(auth => 
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
