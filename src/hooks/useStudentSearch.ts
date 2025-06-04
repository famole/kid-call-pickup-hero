
import { useState, useMemo } from 'react';
import { Child } from '@/types';

export const useStudentSearch = (students: Child[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('all');

  const filteredStudents = useMemo(() => {
    let filtered = students;

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by class
    if (selectedClassId !== 'all') {
      filtered = filtered.filter(student => student.classId === selectedClassId);
    }

    return filtered;
  }, [students, searchTerm, selectedClassId]);

  return {
    searchTerm,
    setSearchTerm,
    selectedClassId,
    setSelectedClassId,
    filteredStudents
  };
};
