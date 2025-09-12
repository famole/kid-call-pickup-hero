import { useState, useCallback } from 'react';
import { useOptimizedParentsData } from './useOptimizedParentsData';
import { ParentWithStudents } from '@/types/parent';
import { Child } from '@/types';

interface UseAdminFilteredDataProps {
  userRole: 'parent' | 'teacher' | 'admin' | 'superadmin' | 'family';
  includedRoles?: ('parent' | 'teacher' | 'admin' | 'superadmin' | 'family' | 'other')[];
}

export const useAdminFilteredData = ({ userRole, includedRoles }: UseAdminFilteredDataProps) => {
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
  } = useOptimizedParentsData({ userRole, includeDeleted, includedRoles });

  // Debug logging to check deleted filtering
  console.log('Status filter:', statusFilter);
  console.log('Include deleted:', includeDeleted);
  console.log('Total parents before filtering:', filteredParentsByRole.length);
  console.log('Parents with deletedAt:', filteredParentsByRole.filter(p => p.deletedAt).length);

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
    console.log('Status filter changed to:', newFilter);
    setStatusFilter(newFilter);
    // Force refetch when filter changes to ensure we get the right data
    setTimeout(() => refetch(), 100);
  }, [refetch]);

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