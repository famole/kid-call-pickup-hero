
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription, 
  SheetFooter 
} from "@/components/ui/sheet";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ParentInput } from '@/types/parent';
import { useTranslation } from '@/hooks/useTranslation';
import { ValidationError } from '@/utils/parentValidation';

interface AddParentSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  newParent: ParentInput;
  onNewParentChange: (parent: ParentInput) => void;
  onSubmit: (e?: React.FormEvent) => Promise<void>;
  userRole?: 'parent' | 'teacher' | 'admin' | 'superadmin' | 'family';
  isSubmitting?: boolean;
  getFieldError?: (fieldName: string) => ValidationError | undefined;
  hasFieldError?: (fieldName: string) => boolean;
}

const AddParentSheet: React.FC<AddParentSheetProps> = ({
  isOpen,
  onOpenChange,
  newParent,
  onNewParentChange,
  onSubmit,
  userRole = 'parent',
  isSubmitting = false,
  getFieldError,
  hasFieldError,
}) => {
  const { t } = useTranslation();
  const nameId = React.useId();
  const emailId = React.useId();
  const usernameId = React.useId();
  const phoneId = React.useId();
  const roleId = React.useId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(e);
  };

  // Determine available roles based on current user's role
  const getAvailableRoles = () => {
    switch (userRole) {
      case 'superadmin':
        return ['parent', 'family', 'teacher', 'admin', 'superadmin'];
      case 'admin':
        return ['parent', 'family', 'teacher', 'admin'];
      case 'teacher':
        return ['parent', 'family', 'teacher'];
      default:
        return ['parent', 'family'];
    }
  };

  const availableRoles = getAvailableRoles();
  
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t('addParentSheet.title')}</SheetTitle>
          <SheetDescription>
            {t('addParentSheet.description')}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label 
              htmlFor={nameId}
              className={hasFieldError?.('name') ? 'text-destructive' : ''}
            >
              {t('addParentSheet.name')}
            </Label>
            <Input
              id={nameId}
              placeholder={t('addParentSheet.namePlaceholder')} 
              value={newParent.name}
              onChange={(e) => onNewParentChange({...newParent, name: e.target.value})}
              className={hasFieldError?.('name') ? 'border-destructive focus-visible:ring-destructive' : ''}
              required
            />
            {getFieldError?.('name') && (
              <p className="text-sm text-destructive">
                {t(getFieldError('name')!.key)}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label 
              htmlFor={emailId}
              className={hasFieldError?.('email') ? 'text-destructive' : ''}
            >
              {t('addParentSheet.email')} {t('common.optional')}
            </Label>
            <Input
              id={emailId}
              type="email" 
              placeholder={t('addParentSheet.emailPlaceholder')} 
              value={newParent.email || ''}
              onChange={(e) => onNewParentChange({...newParent, email: e.target.value})}
              className={hasFieldError?.('email') ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {getFieldError?.('email') && (
              <p className="text-sm text-destructive">
                {t(getFieldError('email')!.key)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label 
              htmlFor={usernameId}
              className={hasFieldError?.('username') ? 'text-destructive' : ''}
            >
              {t('admin.username')} {t('common.optional')}
            </Label>
            <Input
              id={usernameId}
              placeholder="Enter username" 
              value={newParent.username || ''}
              onChange={(e) => onNewParentChange({...newParent, username: e.target.value})}
              className={hasFieldError?.('username') ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {getFieldError?.('username') && (
              <p className="text-sm text-destructive">
                {t(getFieldError('username')!.key)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label 
              htmlFor={phoneId}
              className={hasFieldError?.('phone') ? 'text-destructive' : ''}
            >
              {t('addParentSheet.phone')}
            </Label>
            <Input
              id={phoneId}
              placeholder={t('addParentSheet.phonePlaceholder')} 
              value={newParent.phone || ''}
              onChange={(e) => onNewParentChange({...newParent, phone: e.target.value})}
              className={hasFieldError?.('phone') ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {getFieldError?.('phone') && (
              <p className="text-sm text-destructive">
                {t(getFieldError('phone')!.key)}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label 
              htmlFor={roleId}
              className={hasFieldError?.('role') ? 'text-destructive' : ''}
            >
              {t('addParentSheet.role')}
            </Label>
            <Select
              value={newParent.role || 'parent'}
              onValueChange={(value: 'parent' | 'teacher' | 'admin' | 'superadmin' | 'family') => 
                onNewParentChange({...newParent, role: value})
              }
            >
              <SelectTrigger className={hasFieldError?.('role') ? 'border-destructive focus-visible:ring-destructive' : ''}>
                <SelectValue placeholder={t('addParentSheet.selectRole')} />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {getFieldError?.('role') && (
              <p className="text-sm text-destructive">
                {t(getFieldError('role')!.key)}
              </p>
            )}
          </div>
          <SheetFooter className="pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t('addParentSheet.cancel')}
            </Button>
            <Button 
              type="submit" 
              className="bg-school-primary"
              disabled={isSubmitting}
            >
              {isSubmitting 
                ? t('addParentSheet.adding', { role: newParent.role?.charAt(0).toUpperCase() + newParent.role?.slice(1) || 'User' })
                : (newParent.role === 'family' ? t('admin.addFamilyMember') : t('admin.addParent'))
              }
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default AddParentSheet;
