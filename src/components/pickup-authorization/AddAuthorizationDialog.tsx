
import React, { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useAddAuthorizationDialog } from '@/hooks/useAddAuthorizationDialog';
import AddAuthorizationForm from './AddAuthorizationForm';
import AuthorizationTypeSelector from './AuthorizationTypeSelector';
import InvitationDialog from './InvitationDialog';
import { useTranslation } from '@/hooks/useTranslation';

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
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<'existing' | 'invitation' | null>(null);
  const [showInvitationDialog, setShowInvitationDialog] = useState(false);
  
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

  const handleTypeSelect = (type: 'existing' | 'invitation') => {
    if (type === 'existing') {
      setSelectedType(type);
    } else if (type === 'invitation') {
      setShowInvitationDialog(true);
      onOpenChange(false); // Close main dialog
    }
  };

  const handleGoBack = () => {
    setSelectedType(null);
  };

  const handleInvitationDialogClose = (open: boolean) => {
    setShowInvitationDialog(open);
    if (!open) {
      onOpenChange(true); // Reopen main dialog when invitation dialog closes
    }
  };

  const handleInvitationSent = () => {
    onAuthorizationAdded(); // Refresh authorizations list
    setShowInvitationDialog(false);
  };

  return (
    <>
      <Drawer open={isOpen} onOpenChange={onOpenChange} direction="right">
        <DrawerContent className="h-full w-[400px] ml-auto fixed right-0 top-0 rounded-l-lg">
          <div className="mx-auto w-full max-w-sm p-6 h-full overflow-y-auto">
            <DrawerHeader className="px-0">
              <DrawerTitle>
                {selectedType === 'existing' 
                  ? t('pickupAuthorizations.addPickupAuthorization')
                  : t('pickupAuthorizations.addAuthorization')
                }
              </DrawerTitle>
              <DrawerDescription>
                {selectedType === 'existing' 
                  ? t('pickupAuthorizations.addPickupAuthorizationDescription')
                  : t('pickupAuthorizations.selectAuthorizationTypeDescription')
                }
                {selectedType === 'existing' && parentsWhoShareStudents.length > 0 && (
                  <span className="block mt-1 text-school-primary">
                    {t('pickupAuthorizations.parentsSharingMessage', { count: parentsWhoShareStudents.length })}
                  </span>
                )}
              </DrawerDescription>
            </DrawerHeader>

            {!selectedType ? (
              <AuthorizationTypeSelector
                onSelectType={handleTypeSelect}
                onCancel={() => onOpenChange(false)}
              />
            ) : (
              <AddAuthorizationForm
                children={children}
                allParents={allParents}
                formData={formData}
                loading={loading}
                onSubmit={handleSubmit}
                onUpdateFormData={updateFormData}
                onCancel={handleGoBack}
                showOnlySharedParents={showOnlySharedParents}
                onToggleParentFilter={toggleParentFilter}
                parentsWhoShareStudents={parentsWhoShareStudents}
              />
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <InvitationDialog
        isOpen={showInvitationDialog}
        onOpenChange={handleInvitationDialogClose}
        onInvitationSent={handleInvitationSent}
      />
    </>
  );
};

export default AddAuthorizationDialog;
