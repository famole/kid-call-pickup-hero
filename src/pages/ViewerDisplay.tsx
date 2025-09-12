
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import ViewerHeader from '@/components/viewer/ViewerHeader';
import ClassFilter from '@/components/viewer/ClassFilter';
import ClassGroup from '@/components/viewer/ClassGroup';
import NoStudents from '@/components/viewer/NoStudents';
import { useCalledStudents } from '@/hooks/useCalledStudents';
import { getAllClasses } from '@/services/classService';
import { Class } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { logger } from '@/utils/logger';

const ViewerDisplay: React.FC = () => {
  const { t } = useTranslation();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');

  const { childrenByClass, loading } = useCalledStudents(selectedClass);

  // Fetch all classes for the filter
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const classData = await getAllClasses();
        setClasses(classData);
      } catch (error) {
        logger.error('Error fetching classes:', error);
      }
    };
    
    fetchClasses();
  }, []);

  const handleClassChange = (value: string) => {
    setSelectedClass(value);
  };

  return (
    <div className="min-h-screen flex flex-col bg-school-background">
      <ViewerHeader />
      
      <div className="container mx-auto flex-1 py-6 px-4">
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">{t('viewer.currentlyCalledForPickup')}</h2>
              <p className="text-base sm:text-lg text-muted-foreground">{t('viewer.studentsShouldComeToPickupArea')}</p>
            </div>
            <ClassFilter 
              selectedClass={selectedClass} 
              classes={classes} 
              onChange={handleClassChange} 
            />
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">{t('viewer.loadingStudents')}</p>
          </div>
        ) : Object.keys(childrenByClass).length === 0 ? (
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
              <h3 className="text-lg font-semibold mb-2">{t('viewer.viewInformation')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('viewer.viewInformationDescription')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <footer className="bg-gray-100 py-4 px-4 text-center">
        <div className="container mx-auto text-sm text-muted-foreground">
          {t('viewer.schoolPickupSystem')}
        </div>
      </footer>
    </div>
  );
};

export default ViewerDisplay;
