
import { useState } from 'react';
import { ParentInput, ParentWithStudents } from '@/types/parent';
import { createParent } from '@/services/parentService';
import { useToast } from "@/components/ui/use-toast"; // Corrected import path

interface UseAddParentFormProps {
  onParentAdded: (newParent: ParentWithStudents) => void;
}

export const useAddParentForm = ({ onParentAdded }: UseAddParentFormProps) => {
  const { toast } = useToast();
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [newParent, setNewParent] = useState<ParentInput>({ 
    name: '', 
    email: '', 
    phone: '',
    role: 'parent'
  });

  const openAddParentSheet = () => {
    setNewParent({ name: '', email: '', phone: '', role: 'parent' }); // Reset form with default role
    setIsAddSheetOpen(true);
  };

  const closeAddParentSheet = () => {
    setIsAddSheetOpen(false);
  };

  const handleNewParentChange = (parent: ParentInput) => {
    setNewParent(parent);
  };

  const handleAddParentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParent.name || !newParent.email) {
      toast({
        title: "Error",
        description: "Name and email are required",
        variant: "destructive",
      });
      return;
    }
    try {
      const createdParent = await createParent(newParent);
      const createdParentWithStudents: ParentWithStudents = {
        ...createdParent,
        students: []
      };
      onParentAdded(createdParentWithStudents);
      toast({
        title: "Success",
        description: `${createdParent.role === 'teacher' ? 'Teacher' : createdParent.role === 'admin' ? 'Admin' : 'Parent'} ${createdParent.name} has been created`,
      });
      closeAddParentSheet();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to create ${newParent.role || 'parent'}`,
        variant: "destructive",
      });
    }
  };

  return {
    isAddSheetOpen,
    openAddParentSheet,
    closeAddParentSheet,
    newParent,
    handleNewParentChange,
    handleAddParentSubmit,
  };
};
