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
      
      // Get student and class details for each request
      const requestsWithDetails = await Promise.all(pendingOnly.map(async (req) => {
        const student = await getStudentById(req.childId);
        const classInfo = student ? await getClassById(student.classId) : null;
        
        return {
          request: req,
          child: student,
          class: classInfo
        };
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
      
      // Schedule automatic status reset after 5 minutes
      setTimeout(async () => {
        try {
          await updatePickupRequestStatus(requestId, 'completed');
          console.log(`Request ${requestId} automatically completed after 5 minutes`);
        } catch (error) {
          console.error(`Error auto-completing request ${requestId}:`, error);
        }
      }, 5 * 60 * 1000); // 5 minutes

      // Refresh the pending requests
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
          console.log('Realtime update received for pending pickup requests:', payload);
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
