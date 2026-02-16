
import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ParentWithStudents } from '@/types/parent';
import { Child } from '@/types';
import { getParentsWithStudents } from '@/services/parentService';
import { getAllStudents } from '@/services/studentService';

interface UseAdminParentsDataProps {
  userRole?: 'parent' | 'teacher' | 'admin' | 'superadmin';
}

export const useAdminParentsData = ({ userRole = 'parent' }: UseAdminParentsDataProps) => {
  const queryClient = useQueryClient();

  const { data: parents = [], isLoading: parentsLoading } = useQuery({
    queryKey: ['admin-parents'],
    queryFn: getParentsWithStudents,
  });

  const { data: allStudents = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['admin-students'],
    queryFn: () => getAllStudents(),
  });

  const isLoading = parentsLoading || studentsLoading;

  // Filter parents by role
  const filteredParentsByRole = useMemo(() => 
    parents.filter(parent => 
      parent.role === userRole || (!parent.role && userRole === 'parent')
    ),
    [parents, userRole]
  );

  const setParents = (updateFn: ((prev: ParentWithStudents[]) => ParentWithStudents[]) | ParentWithStudents[]) => {
    if (typeof updateFn === 'function') {
      queryClient.setQueryData<ParentWithStudents[]>(['admin-parents'], prev => updateFn(prev || []));
    } else {
      queryClient.setQueryData(['admin-parents'], updateFn);
    }
  };

  const onParentAdded = (newParent: ParentWithStudents) => {
    queryClient.setQueryData<ParentWithStudents[]>(['admin-parents'], prev => [...(prev || []), newParent]);
  };

  const onParentUpdated = (updatedParent: ParentWithStudents) => {
    queryClient.setQueryData<ParentWithStudents[]>(['admin-parents'], prev => 
      (prev || []).map(p => p.id === updatedParent.id ? updatedParent : p)
    );
  };

  const onImportCompleted = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-parents'] });
  };

  return {
    parents,
    setParents,
    filteredParentsByRole,
    isLoading,
    allStudents,
    onParentAdded,
    onParentUpdated,
    onImportCompleted,
  };
};
