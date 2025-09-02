import { useState, useCallback } from 'react';
import { useOptimizedParentsData } from './useOptimizedParentsData';
import { ParentWithStudents } from '@/types/parent';
import { Child } from '@/types';

interface UseAdminFilteredDataProps {
  userRole: 'parent' | 'teacher' | 'admin' | 'superadmin' | 'family';
}

export const useAdminFilteredData = ({ userRole }: UseAdminFilteredDataProps) => {
  const [statusFilter, setStatusFilter] = useState<'active' | 'deleted' | 'all'>('active');
  
  // Determine if we should include deleted records
  const includeDeleted = statusFilter === 'deleted' || statusFilter === 'all';
  
  const {
    parents,
    setParents,
    filteredParentsByRole,
    isLoading,
    allStudents,
    loadingProgress,
    onParentAdded,
    onParentUpdated,
    onImportCompleted,
    refetch
  } = useOptimizedParentsData({ userRole, includeDeleted });

  // Apply status filter to parents
  const statusFilteredParents = filteredParentsByRole.filter(parent => {
    switch (statusFilter) {
      case 'active':
        return !parent.deletedAt;
      case 'deleted':
        return !!parent.deletedAt;
      case 'all':
        return true;
      default:
        return true;
    }
  });

  // Apply status filter to students
  const statusFilteredStudents = allStudents.filter(student => {
    switch (statusFilter) {
      case 'active':
        return !student.deletedAt;
      case 'deleted':
        return !!student.deletedAt;
      case 'all':
        return true;
      default:
        return true;
    }
  });

  const handleStatusFilterChange = useCallback((newFilter: 'active' | 'deleted' | 'all') => {
    setStatusFilter(newFilter);
  }, []);

  const refreshData = useCallback(() => {
    return refetch();
  }, [refetch]);

  return {
    parents,
    setParents,
    filteredParentsByRole: statusFilteredParents,
    isLoading,
    allStudents: statusFilteredStudents,
    loadingProgress,
    onParentAdded,
    onParentUpdated,
    onImportCompleted,
    statusFilter,
    handleStatusFilterChange,
    refreshData,
  };
};