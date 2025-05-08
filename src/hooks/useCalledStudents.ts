
import { useState, useEffect, useMemo } from 'react';
import { getCurrentlyCalled } from '@/services/pickupService';
import { supabase } from "@/integrations/supabase/client";
import { PickupRequestWithDetails } from '@/types/supabase';
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
        const data = await getCurrentlyCalled(selectedClass);
        setCalledChildren(data);
        console.log("Fetched called children:", data);
      } catch (error) {
        console.error("Error fetching called children:", error);
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
          // Refetch data when there's a change, passing the current class filter
          try {
            const data = await getCurrentlyCalled(selectedClass);
            setCalledChildren(data);
          } catch (error) {
            console.error("Error fetching called children after update:", error);
          }
        }
      )
      .subscribe();
    
    // Set up realtime subscription for students table
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
          // Refetch data when student data changes
          try {
            const data = await getCurrentlyCalled(selectedClass);
            setCalledChildren(data);
          } catch (error) {
            console.error("Error fetching called children after student update:", error);
          }
        }
      )
      .subscribe();
    
    // Set up realtime subscription for classes table
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
          // Refetch class data
          try {
            const classData = await getAllClasses();
            setClasses(classData);
            
            // Refetch called children data
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
  }, [selectedClass]); // Now we want to re-fetch when selectedClass changes

  // Group children by class
  const childrenByClass = useMemo(() => {
    const grouped: Record<string, PickupRequestWithDetails[]> = {};
    
    calledChildren.forEach(item => {
      if (!item.child || !item.class) {
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
