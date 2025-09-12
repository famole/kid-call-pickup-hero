
import { useState, useMemo } from 'react';
import { ParentWithStudents } from '@/types/parent';
import { matchesSearch } from '@/utils/textUtils';

export const useParentSearch = (parents: ParentWithStudents[]) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredParents = useMemo(() => {
    if (!searchTerm.trim()) {
      return parents;
    }

    return parents.filter(parent => {
      // Search by parent name
      if (matchesSearch(parent.name, searchTerm)) {
        return true;
      }

      // Search by parent email
      if (matchesSearch(parent.email, searchTerm)) {
        return true;
      }

      // Search by parent username
      if (matchesSearch(parent.username, searchTerm)) {
        return true;
      }

      // Search by children names
      if (parent.students && parent.students.length > 0) {
        const hasMatchingChild = parent.students.some(student =>
          matchesSearch(student.name, searchTerm)
        );
        if (hasMatchingChild) {
          return true;
        }
      }

      return false;
    });
  }, [parents, searchTerm]);

  return {
    searchTerm,
    setSearchTerm,
    filteredParents,
  };
};
