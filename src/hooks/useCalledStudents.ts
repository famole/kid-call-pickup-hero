
import { useState, useEffect, useCallback } from 'react';
import { getCurrentlyCalled } from '@/services/supabaseService';
import { PickupRequestWithDetails } from '@/types/supabase';
import { supabase } from "@/integrations/supabase/client";

export const useCalledStudents = (classId?: string) => {
  const [childrenByClass, setChildrenByClass] = useState<{ [key: string]: PickupRequestWithDetails[] }>({});
  const [loading, setLoading] = useState<boolean>(true);

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
          
          // Refresh called students immediately
          setTimeout(() => {
            fetchCalledStudents();
          }, 100);
        }
      )
      .subscribe((status) => {
        console.log('Called students subscription status:', status);
      });

    return () => {
      console.log('Cleaning up called students subscription');
      supabase.removeChannel(channel);
    };
  }, [fetchCalledStudents]);

  return {
    childrenByClass,
    loading,
    refetch: fetchCalledStudents
  };
};
