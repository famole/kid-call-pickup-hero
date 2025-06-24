
import { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentlyCalled } from '@/services/supabaseService';
import { PickupRequestWithDetails } from '@/types/supabase';
import { supabase } from "@/integrations/supabase/client";

export const useCalledStudents = (classId?: string) => {
  const [childrenByClass, setChildrenByClass] = useState<{ [key: string]: PickupRequestWithDetails[] }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const subscriptionRef = useRef<any>(null);

  const fetchCalledStudents = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Fetching called students...');
      const calledStudents = await getCurrentlyCalled(classId);
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
    } catch (error) {
      console.error('Error fetching called students:', error);
      setChildrenByClass({});
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchCalledStudents();
    
    // Clean up existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
    
    // Set up real-time subscription for called students
    const channel = supabase
      .channel('called_students_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pickup_requests'
        },
        async (payload) => {
          console.log('Called students real-time change detected:', payload.eventType, payload);
          
          // Immediate refresh
          fetchCalledStudents();
        }
      )
      .subscribe((status) => {
        console.log('Called students subscription status:', status);
      });

    subscriptionRef.current = channel;

    return () => {
      console.log('Cleaning up called students subscription');
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [fetchCalledStudents]);

  return {
    childrenByClass,
    loading,
    refetch: fetchCalledStudents
  };
};
