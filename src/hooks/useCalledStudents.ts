
import { useState, useEffect, useCallback, useRef } from 'react';
import { getCalledStudentsOptimized } from '@/services/pickup/optimizedPickupQueries';
import { PickupRequestWithDetails } from '@/types/supabase';
import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/utils/logger';

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

    // Don't fetch if classId is null (waiting for teacher classes to load)
    if (classId === null) {
      logger.info('Skipping called students fetch - classId is null, waiting for teacher classes to load');
      setLoading(false);
      return;
    }

    try {
      logger.info('Fetching called students with teacherClassIds:', teacherClassIds);
      const calledStudents = await getCalledStudentsOptimized(classId, teacherClassIds);
      logger.info(`Found ${calledStudents.length} called students`);
      
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
      logger.error('Error fetching called students:', error);
      setChildrenByClass({});
    } finally {
      setLoading(false);
    }
  }, [classId, teacherClassIds]);

  useEffect(() => {
    fetchCalledStudents(true);

    // Set up periodic polling as a fallback in case realtime fails (every 20 seconds)
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => fetchCalledStudents(true), 20000);

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
          logger.info('Called students real-time change detected:', payload.eventType, payload);
          
          // Handle specific changes for better performance
          if (payload.eventType === 'UPDATE') {
            const newStatus = payload.new?.status;
            const oldStatus = payload.old?.status;
            const studentId = payload.new?.student_id;
            
            if (newStatus === 'called' && oldStatus !== 'called') {
              // Student was just called - refresh to get full details
              logger.info(`Student ${studentId} was called, refreshing called students`);
              fetchCalledStudents(true);
            } else if (oldStatus === 'called' && newStatus !== 'called') {
              // Student was picked up or cancelled - remove from called list
              logger.info(`Student ${studentId} no longer called, removing from list`);
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
              logger.info(`Request for student ${studentId} deleted, removing from called list`);
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
        logger.info('Called students subscription status:', status);
        if (status === 'SUBSCRIBED') {
          logger.info('Successfully subscribed to called students changes');
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Called students subscription failed');
        }
      });

    subscriptionRef.current = channel;

    return () => {
      logger.info('Cleaning up called students subscription');
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
