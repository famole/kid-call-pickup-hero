
import React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
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
    parentsWhoShareStudents,
    showOnlySharedParents,
    toggleParentFilter,
    loading,
    formData,
    updateFormData,
    handleSubmit,
  } = useAddAuthorizationDialog(isOpen, onAuthorizationAdded, onOpenChange);

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="h-full w-[400px] ml-auto fixed right-0 top-0 rounded-l-lg">
        <div className="mx-auto w-full max-w-sm p-6 h-full overflow-y-auto">
          <DrawerHeader className="px-0">
            <DrawerTitle>Add Pickup Authorization</DrawerTitle>
            <DrawerDescription>
              Allow another parent to pick up your child within a specific date range. 
              You can choose from all parents in the system.
              {parentsWhoShareStudents.length > 0 && (
                <span className="block mt-1 text-school-primary">
                  {parentsWhoShareStudents.length} parent(s) share children with you and can be filtered for easier selection.
                </span>
              )}
            </DrawerDescription>
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
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default AddAuthorizationDialog;
