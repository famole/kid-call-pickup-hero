import React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
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
    <Drawer open={isOpen} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="h-full w-[400px] ml-auto fixed right-0 top-0 rounded-l-lg">
        <div className="mx-auto w-full max-w-sm p-6 h-full overflow-y-auto">
          <DrawerHeader className="px-0">
            <DrawerTitle>{t('pickupAuthorizations.inviteFamilyMember')}</DrawerTitle>
            <DrawerDescription>
              {t('pickupAuthorizations.familyMembersDescription')}
            </DrawerDescription>
          </DrawerHeader>

          <InvitationForm
            children={children}
            formData={formData}
            loading={loading}
            onSubmit={handleSubmit}
            onUpdateFormData={updateFormData}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default InvitationDialog;