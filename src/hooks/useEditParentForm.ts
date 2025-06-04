
import { useState } from 'react';
import { ParentInput, ParentWithStudents } from '@/types/parent';
import { updateParent } from '@/services/parentService';
import { useToast } from "@/components/ui/use-toast"; // Corrected import path

interface UseEditParentFormProps {
  onParentUpdated: (updatedParent: ParentWithStudents) => void;
}

export const useEditParentForm = ({ onParentUpdated }: UseEditParentFormProps) => {
  const { toast } = useToast();
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<ParentWithStudents | null>(null);

  const openEditParentSheet = (parent: ParentWithStudents) => {
    setEditingParent(parent);
    setIsEditSheetOpen(true);
  };

  const closeEditParentSheet = () => {
    setIsEditSheetOpen(false);
    setEditingParent(null);
  };

  const handleEditingParentChange = (parent: ParentWithStudents) => {
    setEditingParent(parent);
  };
  
  const handleEditParentSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editingParent) return;

    try {
      const parentInputData: ParentInput = {
        name: editingParent.name,
        email: editingParent.email,
        phone: editingParent.phone,
      };
      const updatedParentData = await updateParent(editingParent.id, parentInputData);
      
      // Preserve students data from the original editingParent object
      const fullyUpdatedParent: ParentWithStudents = {
        ...editingParent, // Keeps original students, createdAt, etc.
        ...updatedParentData, // Overwrites name, email, phone, updatedAt with fresh data
      };

      onParentUpdated(fullyUpdatedParent);
      
      toast({
        title: "Success",
        description: `Parent ${updatedParentData.name} has been updated`,
      });
      closeEditParentSheet();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update parent",
        variant: "destructive",
      });
    }
  };

  return {
    isEditSheetOpen,
    editingParent,
    openEditParentSheet,
    closeEditParentSheet,
    handleEditingParentChange,
    handleEditParentSubmit,
  };
};
