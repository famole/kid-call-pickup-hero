
import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from "@/components/ui/use-toast";
import { ParentWithStudents } from '@/types/parent';
import { Child } from '@/types';
import { getParentsWithStudentsOptimized } from '@/services/parent/optimizedParentQueries';
import { getAllStudents } from '@/services/studentService';
import { logger } from '@/utils/logger';

interface UseOptimizedParentsDataProps {
  userRole?: 'parent' | 'teacher' | 'admin' | 'superadmin' | 'family';
  includeDeleted?: boolean;
  deletedOnly?: boolean;
  includedRoles?: ('parent' | 'teacher' | 'admin' | 'superadmin' | 'family' | 'other')[];
  searchTerm?: string;
  currentPage?: number;
  pageSize?: number;
}

export const useOptimizedParentsData = ({ 
  userRole = 'parent', 
  includeDeleted = false,
  deletedOnly = false,
  includedRoles,
  searchTerm = '',
  currentPage = 1,
  pageSize = 50
}: UseOptimizedParentsDataProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Only use search term if it's 3+ characters
  const effectiveSearch = searchTerm.trim().length >= 3 ? searchTerm : '';

  const { data: parentsResult, isLoading: parentsLoading } = useQuery({
    queryKey: ['optimized-parents', includeDeleted, deletedOnly, includedRoles, currentPage, pageSize, effectiveSearch],
    queryFn: async () => {
      const startTime = performance.now();
      const result = await getParentsWithStudentsOptimized(
        includeDeleted,
        deletedOnly,
        includedRoles,
        currentPage,
        pageSize,
        effectiveSearch || undefined
      );
      const loadTime = performance.now() - startTime;
      logger.info(`Loaded ${result.parents.length} of ${result.totalCount} parents in ${loadTime.toFixed(0)}ms`);
      if (loadTime > 2000) {
        toast({
          title: "Performance Notice",
          description: `Parents loaded in ${(loadTime / 1000).toFixed(1)}s. Data has been optimized.`,
        });
      }
      return result;
    },
    staleTime: 5000,
  });

  const parents = parentsResult?.parents || [];
  const totalCount = parentsResult?.totalCount || 0;

  const { data: allStudents = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['admin-all-students', includeDeleted],
    queryFn: () => getAllStudents(includeDeleted),
  });

  const isLoading = parentsLoading || studentsLoading;

  // Parents are pre-filtered by backend
  const filteredParentsByRole = parents;
  const loadingProgress = isLoading ? 'Loading...' : `Loaded ${parents.length} of ${totalCount} parents`;

  const setParents = (updateFn: ((prev: ParentWithStudents[]) => ParentWithStudents[]) | ParentWithStudents[]) => {
    const queryKey = ['optimized-parents', includeDeleted, deletedOnly, includedRoles, currentPage, pageSize, effectiveSearch];
    if (typeof updateFn === 'function') {
      queryClient.setQueryData(queryKey, (prev: any) => {
        const newParents = updateFn(prev?.parents || []);
        return prev ? { ...prev, parents: newParents } : { parents: newParents, totalCount: newParents.length };
      });
    } else {
      queryClient.setQueryData(queryKey, (prev: any) => prev ? { ...prev, parents: updateFn } : { parents: updateFn, totalCount: updateFn.length });
    }
  };

  const onParentAdded = useCallback((newParent: ParentWithStudents) => {
    queryClient.invalidateQueries({ queryKey: ['optimized-parents'] });
  }, [queryClient]);

  const onParentUpdated = useCallback((updatedParent: ParentWithStudents) => {
    queryClient.invalidateQueries({ queryKey: ['optimized-parents'] });
  }, [queryClient]);

  const onImportCompleted = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['optimized-parents'] });
  }, [queryClient]);

  const refetch = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: ['optimized-parents'] });
  }, [queryClient]);

  return {
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
  };
};
