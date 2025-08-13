import { useCallback } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { reactivateParent } from '@/services/parentService';
import { reactivateStudent } from '@/services/studentService';
import { ParentWithStudents } from '@/types/parent';
import { Child } from '@/types';

interface UseReactivationActionsProps {
  onParentUpdated?: (parent: ParentWithStudents) => void;
  onStudentUpdated?: (student: Child) => void;
  refreshData?: () => Promise<void>;
}

export const useReactivationActions = ({ 
  onParentUpdated, 
  onStudentUpdated, 
  refreshData 
}: UseReactivationActionsProps) => {
  const { toast } = useToast();

  const handleReactivateParent = useCallback(async (parentId: string, parentName: string) => {
    try {
      const reactivatedParent = await reactivateParent(parentId);
      
      if (onParentUpdated) {
        onParentUpdated({
          ...reactivatedParent,
          students: [], // Will be populated by refresh
        });
      }
      
      if (refreshData) {
        await refreshData();
      }
      
      toast({
        title: "Success",
        description: `${parentName} has been reactivated`,
      });
    } catch (error) {
      console.error('Error reactivating parent:', error);
      toast({
        title: "Error",
        description: `Failed to reactivate ${parentName}`,
        variant: "destructive",
      });
    }
  }, [onParentUpdated, refreshData, toast]);

  const handleReactivateStudent = useCallback(async (studentId: string, studentName: string) => {
    try {
      const reactivatedStudent = await reactivateStudent(studentId);
      
      if (onStudentUpdated) {
        onStudentUpdated(reactivatedStudent);
      }
      
      if (refreshData) {
        await refreshData();
      }
      
      toast({
        title: "Success",
        description: `${studentName} has been reactivated`,
      });
    } catch (error) {
      console.error('Error reactivating student:', error);
      toast({
        title: "Error",
        description: `Failed to reactivate ${studentName}`,
        variant: "destructive",
      });
    }
  }, [onStudentUpdated, refreshData, toast]);

  return {
    handleReactivateParent,
    handleReactivateStudent,
  };
};