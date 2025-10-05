
import { useState } from 'react';
import { ParentInput, ParentWithStudents } from '@/types/parent';
import { updateParent } from '@/services/parentService';
import { useToast } from "@/hooks/use-toast";
import { logger } from '@/utils/logger';

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
        role: editingParent.role,
      };
      const updatedParentData = await updateParent(editingParent.id, parentInputData);
      
      // Preserve students data from the original editingParent object
      const fullyUpdatedParent: ParentWithStudents = {
        ...editingParent, // Keeps original students, createdAt, etc.
        ...updatedParentData, // Overwrites name, email, phone, updatedAt with fresh data
      };

      onParentUpdated(fullyUpdatedParent);
      
      const userTypeLabel = updatedParentData.role === 'teacher' ? 'Teacher' : 
                           updatedParentData.role === 'admin' ? 'Admin' : 'Parent';
      toast({
        title: "Success",
        description: `${userTypeLabel} ${updatedParentData.name} has been updated`,
      });
      closeEditParentSheet();
    } catch (error: any) {
      logger.error('Error updating parent:', error);
      const userTypeLabel = editingParent.role === 'teacher' ? 'teacher' : 
                           editingParent.role === 'admin' ? 'admin' : 'parent';
      
      // Handle specific database constraint violations
      if (error.code === '23505' && error.message?.includes('parents_email_key')) {
        toast({
          title: "Email Already Exists",
          description: `A ${userTypeLabel} with this email address already exists. Please use a different email.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Unable to Update Account",
          description: `We encountered an issue while updating the ${userTypeLabel} account. Please check your information and try again.`,
          variant: "destructive",
        });
      }
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
