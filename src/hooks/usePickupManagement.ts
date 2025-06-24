
import { useState, useEffect, useCallback } from 'react';
import { getActivePickupRequests, updatePickupRequestStatus } from '@/services/pickup';
import { getStudentById } from '@/services/studentService';
import { getClassById } from '@/services/classService';
import { PickupRequestWithDetails } from '@/types/supabase';
import { supabase } from "@/integrations/supabase/client";

export const usePickupManagement = (classId?: string) => {
  const [pendingRequests, setPendingRequests] = useState<PickupRequestWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchPendingRequests = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Fetching pending pickup requests...');
      
      // Get all pending pickup requests
      const activeRequests = await getActivePickupRequests();
      const pendingOnly = activeRequests.filter(req => req.status === 'pending');
      
      console.log(`Found ${pendingOnly.length} pending requests`);
      
      // Get student and class details for each request with better error handling
      const requestsWithDetails = await Promise.all(pendingOnly.map(async (req) => {
        try {
          console.log(`Fetching details for request ${req.id}`);
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
  }, [classId]);

  const markAsCalled = async (requestId: string) => {
    try {
      console.log(`Marking request ${requestId} as called`);
      await updatePickupRequestStatus(requestId, 'called');
      
      // Optimistically remove from pending requests immediately
      setPendingRequests(prev => prev.filter(req => req.request.id !== requestId));
      
      console.log('Request marked as called. Server will auto-complete after 5 minutes.');
    } catch (error) {
      console.error("Error marking request as called:", error);
      // Refresh on error to get correct state
      await fetchPendingRequests();
      throw error;
    }
  };

  useEffect(() => {
    fetchPendingRequests();
    
    // Set up realtime subscription for pickup_requests table with better filtering
    const channel = supabase
      .channel('pickup_requests_pending_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pickup_requests'
        },
        async (payload) => {
          console.log('Real-time pickup request change detected:', payload.eventType, payload);
          
          // Force refresh after any change to ensure consistency
          setTimeout(() => {
            fetchPendingRequests();
          }, 100);
        }
      )
      .subscribe((status) => {
        console.log('Pickup management subscription status:', status);
      });

    return () => {
      console.log('Cleaning up pickup management subscription');
      supabase.removeChannel(channel);
    };
  }, [fetchPendingRequests]);

  return {
    pendingRequests,
    loading,
    markAsCalled,
    refetch: fetchPendingRequests
  };
};
