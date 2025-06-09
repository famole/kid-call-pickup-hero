
import { useState, useEffect, useMemo } from 'react';
import { ParentWithStudents } from '@/types/parent';
import { Class } from '@/types';
import { getAllClasses } from '@/services/classService';

interface UseParentClassFilterProps {
  parents: ParentWithStudents[];
}

export const useParentClassFilter = ({ parents }: UseParentClassFilterProps) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);

  // Load all classes
  useEffect(() => {
    const loadClasses = async () => {
      setIsLoadingClasses(true);
      try {
        const classesData = await getAllClasses();
        setClasses(classesData);
      } catch (error) {
        console.error('Failed to load classes:', error);
      } finally {
        setIsLoadingClasses(false);
      }
    };

    loadClasses();
  }, []);

  // Filter parents by selected class
  const filteredParentsByClass = useMemo(() => {
    if (selectedClassId === 'all') {
      return parents;
    }

    return parents.filter(parent => {
      // Check if any of the parent's students belong to the selected class
      return parent.students?.some(student => student.classId === selectedClassId);
    });
  }, [parents, selectedClassId]);

  return {
    classes,
    selectedClassId,
    setSelectedClassId,
    filteredParentsByClass,
    isLoadingClasses,
  };
};
