import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useInvitationDialog } from '@/hooks/useInvitationDialog';
import InvitationForm from './InvitationForm';
import { useTranslation } from '@/hooks/useTranslation';

interface InvitationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onInvitationSent: () => void;
}

const InvitationDialog: React.FC<InvitationDialogProps> = ({
  isOpen,
  onOpenChange,
  onInvitationSent,
}) => {
  const { t } = useTranslation();
  const {
    children,
    loading,
    formData,
    updateFormData,
    handleSubmit,
  } = useInvitationDialog(isOpen, onInvitationSent, onOpenChange);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[540px] sm:max-w-[540px] p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="px-6 py-4 border-b flex-shrink-0">
            <SheetTitle className="text-left">{t('pickupAuthorizations.inviteFamilyMember')}</SheetTitle>
            <SheetDescription className="text-left">
              {t('pickupAuthorizations.familyMembersDescription')}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <InvitationForm
              children={children}
              formData={formData}
              loading={loading}
              onSubmit={handleSubmit}
              onUpdateFormData={updateFormData}
              onCancel={() => onOpenChange(false)}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default InvitationDialog;