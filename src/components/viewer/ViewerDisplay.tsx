
import React, { useState } from 'react';
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

const ViewerDisplay: React.FC = () => {
  const [selectedClass, setSelectedClass] = useState<string>('all');

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => getAllClasses(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const { data: calledStudents = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['called-students-optimized', selectedClass],
    queryFn: () => getCalledStudentsOptimized(selectedClass),
    refetchInterval: 2000,
    staleTime: 1000,
  });

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
