import { useState, useMemo } from 'react';

interface UseAdminPaginationProps<T> {
  data: T[];
  defaultPageSize?: number;
}

export const useAdminPagination = <T>({ 
  data, 
  defaultPageSize = 25 
}: UseAdminPaginationProps<T>) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Calculate paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, pageSize]);

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const changePageSize = (newPageSize: number) => {
    setPageSize(newPageSize);
    // Reset to first page when changing page size
    setCurrentPage(1);
  };

  // Reset pagination when data changes significantly
  const resetPagination = () => {
    setCurrentPage(1);
  };

  return {
    // Data
    paginatedData,
    totalItems,
    totalPages,
    currentPage,
    pageSize,
    
    // Navigation
    goToPage,
    goToNextPage,
    goToPreviousPage,
    changePageSize,
    resetPagination,
    
    // State
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    startIndex: (currentPage - 1) * pageSize + 1,
    endIndex: Math.min(currentPage * pageSize, totalItems),
  };
};