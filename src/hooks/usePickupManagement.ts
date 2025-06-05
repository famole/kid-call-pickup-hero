
import { useState, useEffect } from 'react';
import { getActivePickupRequests, updatePickupRequestStatus } from '@/services/pickup';
import { getStudentById } from '@/services/studentService';
import { getClassById } from '@/services/classService';
import { PickupRequestWithDetails } from '@/types/supabase';
import { supabase } from "@/integrations/supabase/client";

export const usePickupManagement = (classId?: string) => {
  const [pendingRequests, setPendingRequests] = useState<PickupRequestWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchPendingRequests = async () => {
    setLoading(true);
    try {
      
      // Get all pending pickup requests
      const activeRequests = await getActivePickupRequests();
      const pendingOnly = activeRequests.filter(req => req.status === 'pending');
      
      
      // Get student and class details for each request with better error handling
      const requestsWithDetails = await Promise.all(pendingOnly.map(async (req) => {
        try {
          
          const student = await getStudentById(req.studentId);
          let classInfo = null;
          
          if (student && student.classId) {
            try {
              classInfo = await getClassById(student.classId);
            } catch (classError) {
              console.error(`Error fetching class ${student.classId}:`, classError);
            }
          }
          
          return {
            request: req,
            child: student,
            class: classInfo
          };
        } catch (error) {
          console.error(`Error fetching details for request ${req.id}:`, error);
          // Return request with null child and class if there's an error
          return {
            request: req,
            child: null,
            class: null
          };
        }
      }));

      // Filter by class if specified
      let filteredRequests = requestsWithDetails;
      if (classId && classId !== 'all') {
        filteredRequests = requestsWithDetails.filter(item => 
          item.child && item.class && String(item.child.classId) === String(classId)
        );
      }

      setPendingRequests(filteredRequests);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      setPendingRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsCalled = async (requestId: string) => {
    try {
      
      await updatePickupRequestStatus(requestId, 'called');
      
      // Schedule automatic completion after 5 minutes
      const timeoutId = setTimeout(async () => {
        try {
          
          // Check if the request is still in 'called' status before completing
          const currentRequests = await getActivePickupRequests();
          const currentRequest = currentRequests.find(req => req.id === requestId);
          
          if (currentRequest && currentRequest.status === 'called') {
            await updatePickupRequestStatus(requestId, 'completed');
            
            // Refresh the pending requests after auto-completion
            await fetchPendingRequests();
          } else {
          }
        } catch (error) {
          console.error(`Error auto-completing request ${requestId}:`, error);
          // Even if auto-completion fails, we should still refresh to get current state
          try {
            await fetchPendingRequests();
          } catch (refreshError) {
            console.error(`Error refreshing requests after failed auto-completion:`, refreshError);
          }
        }
      }, 5 * 60 * 1000); // 5 minutes

      // Store the timeout ID for potential cleanup

      // Refresh the pending requests immediately
      await fetchPendingRequests();
    } catch (error) {
      console.error("Error marking request as called:", error);
      throw error;
    }
  };

  useEffect(() => {
    fetchPendingRequests();
    
    // Set up realtime subscription for pickup_requests table
    const channel = supabase
      .channel('pickup_requests_pending')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pickup_requests',
          filter: 'status=eq.pending'
        },
        async (payload) => {
          await fetchPendingRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId]);

  return {
    pendingRequests,
    loading,
    markAsCalled,
    refetch: fetchPendingRequests
  };
};
