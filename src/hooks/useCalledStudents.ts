
import { useState, useEffect, useMemo } from 'react';
import { getCurrentlyCalled } from '@/services/supabaseService';
import { supabase } from "@/integrations/supabase/client";
import { PickupRequestWithDetails } from '@/types/supabase';
import { isValidUUID } from '@/utils/validators';
import { getAllClasses } from '@/services/classService';
import { Class } from '@/types';

export const useCalledStudents = () => {
  const [calledChildren, setCalledChildren] = useState<PickupRequestWithDetails[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  
  // Fetch all classes for the filter
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const classData = await getAllClasses();
        setClasses(classData);
      } catch (error) {
        console.error('Error fetching classes:', error);
      }
    };
    
    fetchClasses();
  }, []);
  
  // Fetch data whenever the selectedClass changes
  useEffect(() => {
    const fetchCalledChildren = async () => {
      setLoading(true);
      try {
        // Pass the selectedClass to the service
        console.log(`Fetching called students with classId filter: ${selectedClass}`);
        const data = await getCurrentlyCalled(selectedClass);
        console.log("Fetched called children:", data);
        setCalledChildren(data);
      } catch (error) {
        console.error("Error fetching called children:", error);
        setCalledChildren([]); // Set empty array on error to prevent UI issues
      } finally {
        setLoading(false);
      }
    };
    
    fetchCalledChildren();
    
    // Set up realtime subscription for pickup_requests table
    const channel = supabase
      .channel('public:pickup_requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pickup_requests',
          filter: 'status=eq.called'
        },
        async (payload) => {
          console.log('Realtime update received for pickup requests:', payload);
          const newRow: any = payload.new;
          if (
            newRow &&
            isValidUUID(newRow.student_id) &&
            isValidUUID(newRow.parent_id)
          ) {
            try {
              const data = await getCurrentlyCalled(selectedClass);
              setCalledChildren(data);
            } catch (error) {
              console.error("Error fetching called children after update:", error);
            }
          } else {
            console.warn('Ignored pickup request with invalid IDs', payload);
          }
        }
      )
      .subscribe();
    
    // Set up realtime subscriptions for students and classes tables
    const studentsChannel = supabase
      .channel('public:students')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students'
        },
        async () => {
          console.log('Student data updated');
          try {
            const data = await getCurrentlyCalled(selectedClass);
            setCalledChildren(data);
          } catch (error) {
            console.error("Error fetching called children after student update:", error);
          }
        }
      )
      .subscribe();
    
    const classesChannel = supabase
      .channel('public:classes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'classes'
        },
        async () => {
          console.log('Class data updated');
          try {
            const classData = await getAllClasses();
            setClasses(classData);
            
            const data = await getCurrentlyCalled(selectedClass);
            setCalledChildren(data);
          } catch (error) {
            console.error("Error updating after class changes:", error);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(studentsChannel);
      supabase.removeChannel(classesChannel);
    };
  }, [selectedClass]);

  // Group children by class
  const childrenByClass = useMemo(() => {
    console.log("Grouping children by class, total children:", calledChildren.length);
    const grouped: Record<string, PickupRequestWithDetails[]> = {};
    
    calledChildren.forEach(item => {
      if (!item.child || !item.class) {
        console.log("Skipping item with missing child or class data", item);
        return;
      }
      
      const classId = String(item.class.id);
      
      if (!grouped[classId]) {
        grouped[classId] = [];
      }
      
      grouped[classId].push(item);
    });
    
    console.log("Grouped children by class:", grouped);
    return grouped;
  }, [calledChildren]);

  // Handle class change with logging
  const handleClassChange = (value: string) => {
    console.log("Selected class changed to:", value);
    setSelectedClass(value);
  };

  return {
    classes,
    selectedClass,
    childrenByClass,
    handleClassChange,
    loading,
  };
};
