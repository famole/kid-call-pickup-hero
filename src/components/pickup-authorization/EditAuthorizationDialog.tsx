import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
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
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[540px] sm:max-w-[540px] p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="px-6 py-4 border-b flex-shrink-0">
            <SheetTitle className="text-left">{t('pickupAuthorizations.editPickupAuthorization')}</SheetTitle>
            <SheetDescription className="text-left">{t('pickupAuthorizations.editPickupAuthorizationDescription')}</SheetDescription>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-4">
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
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EditAuthorizationDialog;
