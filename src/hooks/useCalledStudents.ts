
import { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentlyCalled } from '@/services/supabaseService';
import { PickupRequestWithDetails } from '@/types/supabase';
import { supabase } from "@/integrations/supabase/client";

export const useCalledStudents = (classId?: string, teacherClassIds?: string[]) => {
  const [childrenByClass, setChildrenByClass] = useState<{ [key: string]: PickupRequestWithDetails[] }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const subscriptionRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<number>(0);

  const fetchCalledStudents = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && now - lastFetchRef.current < 1000) {
      return;
    }

    try {
      console.log('Fetching called students...');
      const calledStudents = await getCurrentlyCalled(classId, teacherClassIds);
      console.log(`Found ${calledStudents.length} called students`);
      
      // Group students by class for display
      const groupedByClass = calledStudents.reduce((groups: { [key: string]: PickupRequestWithDetails[] }, item: PickupRequestWithDetails) => {
        const classIdKey = item.child?.classId || 'unknown';
        if (!groups[classIdKey]) {
          groups[classIdKey] = [];
        }
        groups[classIdKey].push(item);
        return groups;
      }, {});

      setChildrenByClass(groupedByClass);
      lastFetchRef.current = now;
    } catch (error) {
      console.error('Error fetching called students:', error);
      setChildrenByClass({});
    } finally {
      setLoading(false);
    }
  }, [classId, teacherClassIds]);

  useEffect(() => {
    fetchCalledStudents(true);

    // Set up periodic polling as a fallback in case realtime fails
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => fetchCalledStudents(true), 5000);

    // Clean up existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
    
    // Set up real-time subscription for called students
    const channel = supabase
      .channel(`called_students_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pickup_requests'
        },
        async (payload) => {
          console.log('Called students real-time change detected:', payload.eventType, payload);
          
          // Handle specific changes for better performance
          if (payload.eventType === 'UPDATE') {
            const newStatus = payload.new?.status;
            const oldStatus = payload.old?.status;
            const studentId = payload.new?.student_id;
            
            if (newStatus === 'called' && oldStatus !== 'called') {
              // Student was just called - refresh to get full details
              console.log(`Student ${studentId} was called, refreshing called students`);
              fetchCalledStudents(true);
            } else if (oldStatus === 'called' && newStatus !== 'called') {
              // Student was picked up or cancelled - remove from called list
              console.log(`Student ${studentId} no longer called, removing from list`);
              if (studentId) {
                setChildrenByClass(prev => {
                  const updated = { ...prev };
                  Object.keys(updated).forEach(classKey => {
                    updated[classKey] = updated[classKey].filter(student => student.request.studentId !== studentId);
                    if (updated[classKey].length === 0) {
                      delete updated[classKey];
                    }
                  });
                  return updated;
                });
              }
            }
          } else if (payload.eventType === 'DELETE') {
            // Request was deleted - remove if it was called
            const studentId = payload.old?.student_id;
            if (studentId) {
              console.log(`Request for student ${studentId} deleted, removing from called list`);
              setChildrenByClass(prev => {
                const updated = { ...prev };
                Object.keys(updated).forEach(classKey => {
                  updated[classKey] = updated[classKey].filter(student => student.request.studentId !== studentId);
                  if (updated[classKey].length === 0) {
                    delete updated[classKey];
                  }
                });
                return updated;
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Called students subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to called students changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Called students subscription failed');
        }
      });

    subscriptionRef.current = channel;

    return () => {
      console.log('Cleaning up called students subscription');
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchCalledStudents]);

  return {
    childrenByClass,
    loading,
    refetch: () => fetchCalledStudents(true)
  };
};
