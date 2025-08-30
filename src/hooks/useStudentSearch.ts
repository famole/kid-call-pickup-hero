
import { useState, useMemo } from 'react';
import { Child } from '@/types';
import { matchesSearch } from '@/utils/textUtils';

export const useStudentSearch = (students: Child[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('all');

  const filteredStudents = useMemo(() => {
    let filtered = students;

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(student =>
        matchesSearch(student.name, searchTerm)
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
