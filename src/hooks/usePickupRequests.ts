
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getActivePickupRequestsForParent } from '@/services/pickupService';
import { supabase } from '@/integrations/supabase/client';
import { PickupRequest, Child } from '@/types';

interface ChildWithType extends Child {
  isAuthorized?: boolean;
}

// Function to check if a string is a valid UUID
const isValidUUID = (id: string): boolean => {
  if (!id) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

export const usePickupRequests = (children: ChildWithType[]) => {
  const { user } = useAuth();
  const [activeRequests, setActiveRequests] = useState<PickupRequest[]>([]);

  const fetchPickupRequests = async () => {
    if (!user) return;

    try {
      const parentActiveRequests = await getActivePickupRequestsForParent(user.id);
      
      // Also check for called requests for authorized children
      const authorizedChildIds = children
        .filter(child => child.isAuthorized)
        .map(child => child.id);
      
      const additionalCalledRequests: PickupRequest[] = [];
      
      if (authorizedChildIds.length > 0) {
        const { data: calledRequests, error: calledError } = await supabase
          .from('pickup_requests')
          .select('*')
          .in('student_id', authorizedChildIds)
          .eq('status', 'called');
        
        if (!calledError && calledRequests) {
          // Filter out requests with invalid IDs and map to our format
          const validCalledRequests = calledRequests
            .filter(req => isValidUUID(req.student_id) && isValidUUID(req.parent_id))
            .map(req => ({
              id: req.id,
              studentId: req.student_id,
              parentId: req.parent_id,
              requestTime: new Date(req.request_time),
              status: req.status as 'pending' | 'called' | 'completed' | 'cancelled'
            }));
          
          additionalCalledRequests.push(...validCalledRequests);
        }
      }
      
      // Combine both sets of requests, avoiding duplicates
      const combinedRequests = [...parentActiveRequests];
      additionalCalledRequests.forEach(req => {
        if (!combinedRequests.some(existing => existing.id === req.id)) {
          combinedRequests.push(req);
        }
      });
      
      setActiveRequests(combinedRequests);
    } catch (error) {
      console.error('Error fetching pickup requests:', error);
    }
  };

  useEffect(() => {
    fetchPickupRequests();

    // Set up a refresh interval
    const interval = setInterval(fetchPickupRequests, 5000);
    return () => clearInterval(interval);
  }, [user, children]);

  return { activeRequests, refreshPickupRequests: fetchPickupRequests };
};
