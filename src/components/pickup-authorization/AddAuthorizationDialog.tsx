
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAddAuthorizationDialog } from '@/hooks/useAddAuthorizationDialog';
import AddAuthorizationForm from './AddAuthorizationForm';

interface AddAuthorizationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthorizationAdded: () => void;
}

const AddAuthorizationDialog: React.FC<AddAuthorizationDialogProps> = ({
  isOpen,
  onOpenChange,
  onAuthorizationAdded,
}) => {
  const {
    children,
    allParents,
    loading,
    formData,
    updateFormData,
    handleSubmit,
  } = useAddAuthorizationDialog(isOpen, onAuthorizationAdded, onOpenChange);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Pickup Authorization</DialogTitle>
          <DialogDescription>
            Allow another parent to pick up your child within a specific date range.
          </DialogDescription>
        </DialogHeader>

        <AddAuthorizationForm
          children={children}
          allParents={allParents}
          formData={formData}
          loading={loading}
          onSubmit={handleSubmit}
          onUpdateFormData={updateFormData}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AddAuthorizationDialog;
