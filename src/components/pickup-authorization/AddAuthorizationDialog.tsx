
import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:w-[540px] sm:max-w-[540px] p-0">
          <div className="flex flex-col h-full">
            <SheetHeader className="px-6 py-4 border-b flex-shrink-0">
              <SheetTitle className="text-left">
                {selectedType === 'existing' 
                  ? t('pickupAuthorizations.addPickupAuthorization')
                  : t('pickupAuthorizations.addAuthorization')
                }
              </SheetTitle>
              <SheetDescription className="text-left">
                {selectedType === 'existing' 
                  ? t('pickupAuthorizations.addPickupAuthorizationDescription')
                  : t('pickupAuthorizations.selectAuthorizationTypeDescription')
                }
                {selectedType === 'existing' && parentsWhoShareStudents.length > 0 && (
                  <span className="block mt-1 text-school-primary">
                    {t('pickupAuthorizations.parentsSharingMessage', { count: parentsWhoShareStudents.length })}
                  </span>
                )}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4">
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
          </div>
        </SheetContent>
      </Sheet>

      <InvitationDialog
        isOpen={showInvitationDialog}
        onOpenChange={handleInvitationDialogClose}
        onInvitationSent={handleInvitationSent}
      />
    </>
  );
};

export default AddAuthorizationDialog;
