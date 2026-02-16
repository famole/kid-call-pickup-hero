
import { useState, useMemo } from 'react';
import { Child } from '@/types';
import { matchesSearch } from '@/utils/textUtils';

export type StudentStatusFilter = 'active' | 'graduated' | 'all';

export const useStudentSearch = (students: Child[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StudentStatusFilter>('active');

  const filteredStudents = useMemo(() => {
    let filtered = students;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(student => (student.status || 'active') === statusFilter);
    }

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
  }, [students, searchTerm, selectedClassId, statusFilter]);

  return {
    searchTerm,
    setSearchTerm,
    selectedClassId,
    setSelectedClassId,
    statusFilter,
    setStatusFilter,
    filteredStudents
  };
};
