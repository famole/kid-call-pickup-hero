
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllClasses } from '@/services/classService';
import { getCurrentlyCalled } from '@/services/pickup/getCurrentlyCalled';
import { PickupRequestWithDetails } from '@/types/supabase';
import { Class } from '@/types';
import ViewerHeader from './ViewerHeader';
import ClassFilter from './ClassFilter';
import NoStudents from './NoStudents';
import ClassGroup from './ClassGroup';
import { Skeleton } from '@/components/ui/skeleton';
import CardSkeleton from '@/components/ui/skeletons/CardSkeleton';

const ViewerDisplay: React.FC = () => {
  const [selectedClass, setSelectedClass] = useState<string>('all');

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: getAllClasses,
  });

  const { data: calledStudents = [], isLoading: studentsLoading, refetch } = useQuery({
    queryKey: ['currently-called'],
    queryFn: getCurrentlyCalled,
    refetchInterval: 2000,
    staleTime: 1000,
  });

  console.log('ViewerDisplay: Called students data:', calledStudents);
  console.log('ViewerDisplay: Selected class:', selectedClass);

  // Filter students by selected class
  const filteredStudents = selectedClass === 'all' 
    ? calledStudents 
    : calledStudents.filter((item: PickupRequestWithDetails) => {
        console.log(`Comparing student class ${item.child?.classId} with selected ${selectedClass}`);
        return String(item.child?.classId) === selectedClass;
      });

  console.log('ViewerDisplay: Filtered students:', filteredStudents);

  // Group students by class for display
  const groupedByClass = filteredStudents.reduce((groups: { [key: string]: PickupRequestWithDetails[] }, item: PickupRequestWithDetails) => {
    const classId = item.child?.classId || 'unknown';
    if (!groups[classId]) {
      groups[classId] = [];
    }
    groups[classId].push(item);
    return groups;
  }, {});

  console.log('ViewerDisplay: Grouped by class:', groupedByClass);

  const handleClassChange = (value: string) => {
    console.log("ViewerDisplay: Class filter changed to:", value);
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
                `${filteredStudents.length} student${filteredStudents.length !== 1 ? 's' : ''} currently called`
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
