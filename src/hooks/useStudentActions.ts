
import { useToast } from '@/hooks/use-toast';
import { createStudent, updateStudent, deleteStudent as apiDeleteStudent } from '@/services/studentService';
import { Child, Class } from '@/types';
import { isValidUUID } from '@/utils/validators';
import React from 'react';

interface UseStudentActionsProps {
  studentList: Child[];
  setStudentList: React.Dispatch<React.SetStateAction<Child[]>>;
  classList: Class[];
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  resetStudentForm: () => void;
  setIsAddDialogOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  setIsEditDialogOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  setIsDeleteDialogOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentStudent?: React.Dispatch<React.SetStateAction<Child | null>>;
}

export const useStudentActions = ({
  studentList,
  setStudentList,
  classList,
  setIsLoading,
  resetStudentForm,
  setIsAddDialogOpen,
  setIsEditDialogOpen,
  setIsDeleteDialogOpen,
  setCurrentStudent,
}: UseStudentActionsProps) => {
  const { toast } = useToast();

  const handleAddStudentAction = async (studentData: Partial<Child>) => {
    if (!studentData.name || !studentData.classId) {
      toast({
        title: "Error",
        description: "Name and Class are required",
        variant: "destructive"
      });
      return;
    }
    if (!classList.find(c => c.id === studentData.classId)) {
      toast({
        title: "Invalid Class",
        description: "The selected class ID does not exist. Please refresh or select a valid class.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      const validParentIds = studentData.parentIds?.filter(id => isValidUUID(id)) || [];
      const studentToAdd = {
        name: studentData.name,
        classId: studentData.classId,
        parentIds: validParentIds,
        avatar: studentData.avatar
      };

      const createdStudent = await createStudent(studentToAdd);
      setStudentList(prev => [...prev, createdStudent]);
      toast({
        title: "Student Added",
        description: `${createdStudent.name} has been added successfully`,
      });
      resetStudentForm();
      if (setIsAddDialogOpen) setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Error adding student:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to add student";
      toast({
        title: "Error Adding Student",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStudentAction = async (currentStudentId: string, studentData: Partial<Child>) => {
    if (!currentStudentId || !studentData.name || !studentData.classId) {
      toast({
        title: "Error",
        description: "Name and Class are required",
        variant: "destructive"
      });
      return;
    }
    if (!classList.find(c => c.id === studentData.classId)) {
      toast({
        title: "Invalid Class",
        description: "The selected class ID does not exist. Please refresh or select a valid class.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      const validParentIds = studentData.parentIds?.filter(id => isValidUUID(id)) || [];
      const updatedStudentData: Partial<Omit<Child, 'id'>> = {
        name: studentData.name,
        classId: studentData.classId,
        parentIds: validParentIds,
        avatar: studentData.avatar
      };
      
      const updatedStudent = await updateStudent(currentStudentId, updatedStudentData);
      setStudentList(studentList.map(s => s.id === updatedStudent.id ? updatedStudent : s));
      toast({
        title: "Student Updated",
        description: `${updatedStudent.name} has been updated successfully`,
      });
      resetStudentForm();
      if (setIsEditDialogOpen) setIsEditDialogOpen(false);
      if (setCurrentStudent) setCurrentStudent(null);
    } catch (error) {
      console.error('Error updating student:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update student";
      toast({
        title: "Error Updating Student",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStudentAction = async (studentToDelete: Child | null) => {
    if (!studentToDelete) return;

    try {
      setIsLoading(true);
      await apiDeleteStudent(studentToDelete.id);
      setStudentList(studentList.filter(s => s.id !== studentToDelete.id));
      toast({
        title: "Student Deleted",
        description: `${studentToDelete.name} has been deleted successfully`,
      });
      if (setIsDeleteDialogOpen) setIsDeleteDialogOpen(false);
      if (setCurrentStudent) setCurrentStudent(null);
    } catch (error) {
      console.error('Error deleting student:', error);
      toast({
        title: "Error",
        description: "Failed to delete student from database",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleAddStudentAction,
    handleUpdateStudentAction,
    handleDeleteStudentAction,
  };
};
