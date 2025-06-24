import React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
import { useEditAuthorizationDialog } from '@/hooks/useEditAuthorizationDialog';
import AddAuthorizationForm from './AddAuthorizationForm';
import { PickupAuthorizationWithDetails } from '@/services/pickupAuthorizationService';

interface EditAuthorizationDialogProps {
  authorization: PickupAuthorizationWithDetails | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthorizationUpdated: () => void;
}

const EditAuthorizationDialog: React.FC<EditAuthorizationDialogProps> = ({
  authorization,
  isOpen,
  onOpenChange,
  onAuthorizationUpdated
}) => {
  const {
    children,
    allParents,
    parentsWhoShareStudents,
    showOnlySharedParents,
    toggleParentFilter,
    loading,
    formData,
    updateFormData,
    handleSubmit
  } = useEditAuthorizationDialog(authorization, isOpen, onAuthorizationUpdated, onOpenChange);

  if (!authorization) return null;

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="h-full w-[400px] ml-auto fixed right-0 top-0 rounded-l-lg">
        <div className="mx-auto w-full max-w-sm p-6 h-full overflow-y-auto">
          <DrawerHeader className="px-0">
            <DrawerTitle>Edit Pickup Authorization</DrawerTitle>
            <DrawerDescription>Update the authorization details.</DrawerDescription>
          </DrawerHeader>
          <AddAuthorizationForm
            children={children}
            allParents={allParents}
            formData={formData}
            loading={loading}
            onSubmit={handleSubmit}
            onUpdateFormData={updateFormData}
            onCancel={() => onOpenChange(false)}
            showOnlySharedParents={showOnlySharedParents}
            onToggleParentFilter={toggleParentFilter}
            parentsWhoShareStudents={parentsWhoShareStudents}
            submitLabel="Update Authorization"
            loadingLabel="Updating..."
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default EditAuthorizationDialog;
