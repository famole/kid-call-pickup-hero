
import { useState } from 'react';
import { ParentInput, ParentWithStudents } from '@/types/parent';
import { createParent } from '@/services/parentService';
import { useToast } from "@/components/ui/use-toast";

interface UseAddParentFormProps {
  onParentAdded: (newParent: ParentWithStudents) => void;
  defaultRole?: 'parent' | 'teacher' | 'admin';
}

export const useAddParentForm = ({ onParentAdded, defaultRole = 'parent' }: UseAddParentFormProps) => {
  const { toast } = useToast();
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [newParent, setNewParent] = useState<ParentInput>({ 
    name: '', 
    email: '', 
    phone: '',
    role: defaultRole
  });

  const openAddParentSheet = () => {
    setNewParent({ name: '', email: '', phone: '', role: defaultRole });
    setIsAddSheetOpen(true);
  };

  const closeAddParentSheet = () => {
    setIsAddSheetOpen(false);
  };

  const handleNewParentChange = (parent: ParentInput) => {
    setNewParent(parent);
  };

  const handleAddParentSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
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
      const userTypeLabel = createdParent.role === 'teacher' ? 'Teacher' : 
                           createdParent.role === 'admin' ? 'Admin' : 'Parent';
      toast({
        title: "Success",
        description: `${userTypeLabel} ${createdParent.name} has been created`,
      });
      closeAddParentSheet();
    } catch (error) {
      const userTypeLabel = newParent.role === 'teacher' ? 'teacher' : 
                           newParent.role === 'admin' ? 'admin' : 'parent';
      toast({
        title: "Error",
        description: `Failed to create ${userTypeLabel}`,
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
