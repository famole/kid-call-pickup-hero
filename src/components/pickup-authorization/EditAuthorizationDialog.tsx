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
import { useTranslation } from '@/hooks/useTranslation';

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
  const { t } = useTranslation();
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
            <DrawerTitle>{t('pickupAuthorizations.editPickupAuthorization')}</DrawerTitle>
            <DrawerDescription>{t('pickupAuthorizations.editPickupAuthorizationDescription')}</DrawerDescription>
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
            submitLabel={t('pickupAuthorizations.updateAuthorization')}
            loadingLabel={t('pickupAuthorizations.updating')}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default EditAuthorizationDialog;
