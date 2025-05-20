
import { useState } from 'react';
import { ParentWithStudents } from '@/types/parent';
import { Child } from '@/types';
import { addStudentToParent } from '@/services/parentService';
import { useToast } from "@/components/ui/use-toast"; // Corrected import path

interface UseAddStudentToParentFormProps {
  allStudents: Child[];
  onStudentAddedToParent: (updatedParent: ParentWithStudents) => void;
}

export const useAddStudentToParentForm = ({ allStudents, onStudentAddedToParent }: UseAddStudentToParentFormProps) => {
  const { toast } = useToast();
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [targetParent, setTargetParent] = useState<ParentWithStudents | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [relationship, setRelationship] = useState<string>('');
  const [isPrimary, setIsPrimary] = useState(false);

  const openAddStudentDialog = (parent: ParentWithStudents) => {
    setTargetParent(parent);
    setSelectedStudentId('');
    setRelationship('');
    setIsPrimary(false);
    setIsStudentDialogOpen(true);
  };

  const closeAddStudentDialog = () => {
    setIsStudentDialogOpen(false);
    setTargetParent(null);
  };

  const handleAddStudentToParentSubmit = async () => {
    if (!targetParent || !selectedStudentId) {
      toast({
        title: "Error",
        description: "Please select a student",
        variant: "destructive",
      });
      return;
    }

    const exists = targetParent.students?.some(s => s.id === selectedStudentId);
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
        targetParent.id,
        selectedStudentId,
        relationship || undefined,
        isPrimary
      );

      const studentInfo = allStudents.find(s => s.id === selectedStudentId);
      const newStudentEntry = {
        id: selectedStudentId,
        name: studentInfo ? studentInfo.name : 'Unknown Student',
        isPrimary,
        relationship: relationship || undefined,
        parentRelationshipId: newRelationship.id,
      };
      
      const updatedParent: ParentWithStudents = {
        ...targetParent,
        students: [...(targetParent.students || []), newStudentEntry],
      };

      onStudentAddedToParent(updatedParent);
      
      toast({
        title: "Success",
        description: "Student added to parent successfully",
      });
      closeAddStudentDialog();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add student to parent",
        variant: "destructive",
      });
    }
  };
  
  const availableStudents = targetParent
    ? allStudents.filter(s => !targetParent.students?.find(ps => ps.id === s.id))
    : allStudents;


  return {
    isStudentDialogOpen,
    targetParentName: targetParent?.name,
    availableStudents,
    openAddStudentDialog,
    closeAddStudentDialog,
    selectedStudentId,
    setSelectedStudentId,
    relationship,
    setRelationship,
    isPrimary,
    setIsPrimary,
    handleAddStudentToParentSubmit,
  };
};
