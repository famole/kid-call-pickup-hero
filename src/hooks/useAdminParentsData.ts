
import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { ParentWithStudents } from '@/types/parent';
import { Child } from '@/types';
import { getParentsWithStudents } from '@/services/parentService';
import { getAllStudents } from '@/services/studentService';

interface UseAdminParentsDataProps {
  userRole?: 'parent' | 'teacher' | 'admin' | 'superadmin';
}

export const useAdminParentsData = ({ userRole = 'parent' }: UseAdminParentsDataProps) => {
  const { toast } = useToast();
  const [parents, setParents] = useState<ParentWithStudents[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allStudents, setAllStudents] = useState<Child[]>([]);

  // Filter parents by role
  const filteredParentsByRole = parents.filter(parent => 
    parent.role === userRole || (!parent.role && userRole === 'parent')
  );

  const loadParents = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getParentsWithStudents();
      setParents(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load parents data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const loadStudents = useCallback(async () => {
    try {
      const studentsData = await getAllStudents();
      setAllStudents(studentsData);
    } catch (error) {
      console.error('Failed to load students:', error);
      toast({
        title: "Error",
        description: "Failed to load students data",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    loadParents();
    loadStudents();
  }, [loadParents, loadStudents]);

  const onParentAdded = (newParent: ParentWithStudents) => {
    setParents(prev => [...prev, newParent]);
  };

  const onParentUpdated = (updatedParent: ParentWithStudents) => {
    setParents(prev => prev.map(p => p.id === updatedParent.id ? updatedParent : p));
  };

  const onImportCompleted = () => {
    loadParents();
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
