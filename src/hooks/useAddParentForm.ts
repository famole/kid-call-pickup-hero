
import { useState } from 'react';
import { ParentInput, ParentWithStudents } from '@/types/parent';
import { addParent } from '@/services/parentService';
import { useToast } from "@/components/ui/use-toast";

interface UseAddParentFormProps {
  onParentAdded: (newParent: ParentWithStudents) => void;
  defaultRole?: 'parent' | 'teacher' | 'admin' | 'superadmin';
}

export const useAddParentForm = ({ onParentAdded, defaultRole = 'parent' }: UseAddParentFormProps) => {
  const { toast } = useToast();
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [newParent, setNewParent] = useState<ParentInput>({
    name: '',
    email: '',
    phone: '',
    role: defaultRole,
  });

  const openAddParentSheet = () => {
    setNewParent({
      name: '',
      email: '',
      phone: '',
      role: defaultRole,
    });
    setIsAddSheetOpen(true);
  };

  const closeAddParentSheet = () => {
    setIsAddSheetOpen(false);
  };

  const handleNewParentChange = (parent: ParentInput) => {
    setNewParent(parent);
  };

  const handleAddParentSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    try {
      const addedParent = await addParent(newParent);
      onParentAdded(addedParent);
      toast({
        title: "Success",
        description: `${newParent.role?.charAt(0).toUpperCase() + newParent.role?.slice(1) || 'User'} has been added`,
      });
      closeAddParentSheet();
    } catch (error) {
      console.error('Error adding parent:', error);
      toast({
        title: "Error",
        description: `Failed to add ${newParent.role || 'user'}`,
        variant: "destructive",
      });
    }
  };

  return {
    isAddSheetOpen,
    newParent,
    openAddParentSheet,
    closeAddParentSheet,
    handleNewParentChange,
    handleAddParentSubmit,
  };
};
