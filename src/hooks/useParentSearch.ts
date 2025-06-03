
import { useState, useMemo } from 'react';
import { ParentWithStudents } from '@/types/parent';

export const useParentSearch = (parents: ParentWithStudents[]) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredParents = useMemo(() => {
    if (!searchTerm.trim()) {
      return parents;
    }

    const term = searchTerm.toLowerCase().trim();

    return parents.filter(parent => {
      // Search by parent name
      if (parent.name.toLowerCase().includes(term)) {
        return true;
      }

      // Search by parent email
      if (parent.email.toLowerCase().includes(term)) {
        return true;
      }

      // Search by children names
      if (parent.students && parent.students.length > 0) {
        const hasMatchingChild = parent.students.some(student =>
          student.name.toLowerCase().includes(term)
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
