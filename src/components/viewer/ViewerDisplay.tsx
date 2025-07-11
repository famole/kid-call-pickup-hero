
import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllClasses } from '@/services/classService';
import { getCalledStudentsOptimized } from '@/services/pickup/optimizedPickupQueries';
import { PickupRequestWithDetails } from '@/types/supabase';
import ViewerHeader from './ViewerHeader';
import ClassFilter from './ClassFilter';
import NoStudents from './NoStudents';
import ClassGroup from './ClassGroup';
import { Skeleton } from '@/components/ui/skeleton';
import CardSkeleton from '@/components/ui/skeletons/CardSkeleton';
import { supabase } from "@/integrations/supabase/client";

const ViewerDisplay: React.FC = () => {
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const subscriptionRef = useRef<any>(null);

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => getAllClasses(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: calledStudents = [], isLoading: studentsLoading, refetch } = useQuery({
    queryKey: ['called-students-optimized', selectedClass],
    queryFn: () => getCalledStudentsOptimized(selectedClass),
    refetchInterval: 5000, // Reduced frequency - real-time will handle immediate updates
    staleTime: 1000, // Short stale time for better responsiveness
  });

  // Set up real-time subscription for immediate updates
  useEffect(() => {
    // Clean up existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    const channel = supabase
      .channel(`viewer_display_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pickup_requests'
        },
        async (payload) => {
          console.log('Viewer display real-time change detected:', payload.eventType, payload);
          
          // Only refetch when relevant to called students
          if (payload.eventType === 'UPDATE' && 
              (payload.new?.status === 'called' || payload.old?.status === 'called')) {
            refetch();
          }
        }
      )
      .subscribe((status) => {
        console.log('Viewer display subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Viewer display successfully subscribed to changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Viewer display subscription failed');
        }
      });

    subscriptionRef.current = channel;

    return () => {
      console.log('Cleaning up viewer display subscription');
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [refetch]);

  // Group students by class for display
  const groupedByClass = calledStudents.reduce((groups: { [key: string]: PickupRequestWithDetails[] }, item: PickupRequestWithDetails) => {
    const classId = item.child?.classId || 'unknown';
    if (!groups[classId]) {
      groups[classId] = [];
    }
    groups[classId].push(item);
    return groups;
  }, {});

  const handleClassChange = (value: string) => {
    setSelectedClass(value);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ViewerHeader />
      
      <main className="container mx-auto py-6 px-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Called Students</h2>
            <p className="text-muted-foreground">
              {studentsLoading ? (
                <Skeleton className="h-4 w-48" />
              ) : (
                `${calledStudents.length} student${calledStudents.length !== 1 ? 's' : ''} currently called`
              )}
            </p>
          </div>
          
          {classesLoading ? (
            <Skeleton className="h-10 w-48" />
          ) : (
            <ClassFilter
              selectedClass={selectedClass}
              classes={classes}
              onChange={handleClassChange}
            />
          )}
        </div>

        {studentsLoading ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <CardSkeleton key={index} contentHeight="h-48" />
            ))}
          </div>
        ) : Object.keys(groupedByClass).length === 0 ? (
          <NoStudents />
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByClass).map(([classId, students]) => (
              <ClassGroup key={classId} classId={classId} students={students} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ViewerDisplay;
