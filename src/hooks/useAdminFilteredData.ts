import { useState, useCallback, useEffect } from 'react';
import { useOptimizedParentsData } from './useOptimizedParentsData';
import { ParentWithStudents } from '@/types/parent';
import { Child } from '@/types';
import { logger } from '@/utils/logger';

interface UseAdminFilteredDataProps {
  userRole: 'parent' | 'teacher' | 'admin' | 'superadmin' | 'family';
  includedRoles?: ('parent' | 'teacher' | 'admin' | 'superadmin' | 'family' | 'other')[];
}

export const useAdminFilteredData = ({ userRole, includedRoles }: UseAdminFilteredDataProps) => {
  const [statusFilter, setStatusFilter] = useState<'active' | 'deleted' | 'all'>('active');
  const [isFilterChanging, setIsFilterChanging] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  
  // Determine if we should include deleted records
  const includeDeleted = statusFilter === 'deleted' || statusFilter === 'all';
  
  const {
    parents,
    setParents,
    filteredParentsByRole,
    isLoading,
    allStudents,
    loadingProgress,
    totalCount,
    onParentAdded,
    onParentUpdated,
    onImportCompleted,
    refetch
  } = useOptimizedParentsData({ 
    userRole, 
    includeDeleted, 
    includedRoles,
    searchTerm,
    currentPage,
    pageSize
  });

  // Debug logging to check deleted filtering
  logger.log('Status filter:', statusFilter);
  logger.log('Include deleted:', includeDeleted);
  logger.log('Total parents before filtering:', filteredParentsByRole.length);
  logger.log('Parents with deletedAt:', filteredParentsByRole.filter(p => p.deletedAt).length);

  // Apply status filter to parents - but don't double filter if we already fetched the right data
  const statusFilteredParents = filteredParentsByRole.filter(parent => {
    // If we're showing deleted only and includeDeleted is true, 
    // the query already filtered correctly, so just show deleted ones
    if (statusFilter === 'deleted') {
      return !!parent.deletedAt;
    }
    // If we're showing active only, show non-deleted
    if (statusFilter === 'active') {
      return !parent.deletedAt;
    }
    // For 'all', show everything we fetched
    return true;
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
    logger.log('Status filter changing from', statusFilter, 'to', newFilter);
    setStatusFilter(newFilter);
    setIsFilterChanging(true);
  }, [statusFilter]);

  // Effect to handle refetch when includeDeleted changes and reset loading state
  useEffect(() => {
    if (isFilterChanging) {
      refetch().finally(() => {
        setIsFilterChanging(false);
        logger.log('Filter change completed, loading state reset');
      });
    }
  }, [includeDeleted, isFilterChanging, refetch]);

  const refreshData = useCallback(() => {
    return refetch();
  }, [refetch]);

  const handleSearchChange = useCallback((search: string) => {
    setSearchTerm(search);
    setCurrentPage(1); // Reset to page 1 on search
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to page 1 on page size change
  }, []);

  return {
    parents,
    setParents,
    filteredParentsByRole: statusFilteredParents,
    isLoading: isLoading || isFilterChanging,
    allStudents: statusFilteredStudents,
    loadingProgress: isFilterChanging ? `Filtering ${statusFilter} records...` : loadingProgress,
    onParentAdded,
    onParentUpdated,
    onImportCompleted,
    statusFilter,
    handleStatusFilterChange,
    refreshData,
    // Pagination and search
    searchTerm,
    onSearchChange: handleSearchChange,
    currentPage,
    pageSize,
    totalCount: totalCount || 0,
    onPageChange: handlePageChange,
    onPageSizeChange: handlePageSizeChange,
  };
};