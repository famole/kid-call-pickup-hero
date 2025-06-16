
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
  };

  const markAsCalled = async (requestId: string) => {
    try {
      console.log(`Marking request ${requestId} as called`);
      await updatePickupRequestStatus(requestId, 'called');
      
      // Note: Auto-completion is now handled by the server-side cron job
      console.log('Request marked as called. Server will auto-complete after 5 minutes.');
      
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
          console.log('Real-time pickup request change detected:', payload);
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
