
import { useState } from 'react';
import { ParentWithStudents } from '@/types/parent';
import { Child } from '@/types';
import { addStudentToParent, removeStudentFromParent, updateStudentParentRelationship } from '@/services/parentService';
import { useToast } from "@/components/ui/use-toast";

interface UseStudentManagementProps {
  allStudents: Child[];
  onParentUpdated: (updatedParent: ParentWithStudents) => void;
  parents: ParentWithStudents[];
  setParents: (parents: ParentWithStudents[]) => void;
}

export const useStudentManagement = ({ 
  allStudents, 
  onParentUpdated, 
  parents, 
  setParents 
}: UseStudentManagementProps) => {
  const { toast } = useToast();
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<ParentWithStudents | null>(null);

  const openStudentModal = (parent: ParentWithStudents) => {
    setSelectedParent(parent);
    setIsStudentModalOpen(true);
  };

  const closeStudentModal = () => {
    setIsStudentModalOpen(false);
    setSelectedParent(null);
  };

  const handleAddStudentToParent = async (parentId: string, studentId: string, relationship: string, isPrimary: boolean) => {
    const parent = parents.find(p => p.id === parentId);
    if (!parent) return;

    const exists = parent.students?.some(s => s.id === studentId);
    if (exists) {
      toast({
        title: "Error",
        description: "This student is already associated with this parent",
        variant: "destructive",
      });
      return;
    }

    try {
      const newRelationship = await addStudentToParent(
        parentId,
        studentId,
        relationship || undefined,
        isPrimary
      );

      const studentInfo = allStudents.find(s => s.id === studentId);
      const newStudentEntry = {
        id: studentId,
        name: studentInfo ? studentInfo.name : 'Unknown Student',
        isPrimary,
        relationship: relationship || undefined,
        parentRelationshipId: newRelationship.id,
      };
      
      const updatedParent: ParentWithStudents = {
        ...parent,
        students: [...(parent.students || []), newStudentEntry],
      };

      setParents(prev => prev.map(p => p.id === parentId ? updatedParent : p));
      setSelectedParent(updatedParent);
      
      toast({
        title: "Success",
        description: "Student added to parent successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add student to parent",
        variant: "destructive",
      });
    }
  };

  const handleRemoveStudent = async (studentRelationshipId: string, parentId: string, studentId: string) => {
    const parent = parents.find(p => p.id === parentId);
    if (!parent || !parent.students) return;
    
    if (!confirm("Are you sure you want to remove this student from the parent?")) {
      return;
    }
    
    try {
      await removeStudentFromParent(studentRelationshipId);
      const updatedParent = {
        ...parent,
        students: parent.students.filter(s => s.parentRelationshipId !== studentRelationshipId),
      };
      
      setParents(prev => prev.map(p => p.id === parentId ? updatedParent : p));
      setSelectedParent(updatedParent);
      
      toast({
        title: "Success",
        description: "Student removed from parent successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove student from parent",
        variant: "destructive",
      });
    }
  };

  const handleTogglePrimary = async (studentRelationshipId: string, parentId: string, currentIsPrimary: boolean, currentRelationship?: string) => {
    const parent = parents.find(p => p.id === parentId);
    if (!parent || !parent.students) return;
        
    try {
      await updateStudentParentRelationship(
        studentRelationshipId, 
        !currentIsPrimary, 
        currentRelationship
      );
      
      const updatedStudents = parent.students.map(s => {
        if (s.parentRelationshipId === studentRelationshipId) {
          return { ...s, isPrimary: !s.isPrimary };
        } else if (!currentIsPrimary && s.isPrimary) {
          return { ...s, isPrimary: false };
        }
        return s;
      });

      const updatedParent = {
        ...parent,
        students: updatedStudents,
      };
      
      setParents(prev => prev.map(p => p.id === parentId ? updatedParent : p));
      setSelectedParent(updatedParent);
      
      toast({
        title: "Success",
        description: "Primary status updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update primary status",
        variant: "destructive",
      });
    }
  };

  return {
    isStudentModalOpen,
    selectedParent,
    openStudentModal,
    closeStudentModal,
    handleAddStudentToParent,
    handleRemoveStudent,
    handleTogglePrimary,
  };
};
