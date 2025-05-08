
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import ViewerHeader from '@/components/viewer/ViewerHeader';
import ClassFilter from '@/components/viewer/ClassFilter';
import ClassGroup from '@/components/viewer/ClassGroup';
import NoStudents from '@/components/viewer/NoStudents';
import { useCalledStudents } from '@/hooks/useCalledStudents';

const ViewerDisplay: React.FC = () => {
  const { classes, selectedClass, childrenByClass, handleClassChange } = useCalledStudents();

  return (
    <div className="min-h-screen flex flex-col bg-school-background">
      <ViewerHeader />
      
      <div className="container mx-auto flex-1 py-6 px-4">
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Currently Called for Pickup</h2>
              <p className="text-base sm:text-lg text-muted-foreground">Students should come to the pickup area</p>
            </div>
            <ClassFilter 
              selectedClass={selectedClass} 
              classes={classes} 
              onChange={handleClassChange} 
            />
          </div>
        </div>
        
        {Object.keys(childrenByClass).length === 0 ? (
          <NoStudents />
        ) : (
          <div className="space-y-8">
            {Object.entries(childrenByClass).map(([classId, students]) => (
              <ClassGroup key={classId} classId={classId} students={students} />
            ))}
          </div>
        )}
        
        <div className="mt-8">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold mb-2">View Information</h3>
              <p className="text-sm text-muted-foreground">
                This screen shows students who have been called for pickup, grouped by class. 
                The display updates automatically in real-time whenever students are called or picked up.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <footer className="bg-gray-100 py-4 px-4 text-center">
        <div className="container mx-auto text-sm text-muted-foreground">
          School Pickup System — Please wait until your name appears on screen
        </div>
      </footer>
    </div>
  );
};

export default ViewerDisplay;
