
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

interface AddParentSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  newParent: ParentInput;
  onNewParentChange: (parent: ParentInput) => void;
  onSubmit: (e?: React.FormEvent) => Promise<void>;
  userRole?: 'parent' | 'teacher' | 'admin' | 'superadmin';
}

const AddParentSheet: React.FC<AddParentSheetProps> = ({
  isOpen,
  onOpenChange,
  newParent,
  onNewParentChange,
  onSubmit,
  userRole = 'parent',
}) => {
  const { t } = useTranslation();
  const nameId = React.useId();
  const emailId = React.useId();
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
        return ['parent', 'teacher', 'admin', 'superadmin'];
      case 'admin':
        return ['parent', 'teacher', 'admin'];
      case 'teacher':
        return ['parent', 'teacher'];
      default:
        return ['parent'];
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
            <Label htmlFor={nameId}>{t('addParentSheet.name')}</Label>
            <Input
              id={nameId}
              placeholder={t('addParentSheet.namePlaceholder')} 
              value={newParent.name}
              onChange={(e) => onNewParentChange({...newParent, name: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={emailId}>{t('addParentSheet.email')}</Label>
            <Input
              id={emailId}
              type="email" 
              placeholder={t('addParentSheet.emailPlaceholder')} 
              value={newParent.email}
              onChange={(e) => onNewParentChange({...newParent, email: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={phoneId}>{t('addParentSheet.phone')}</Label>
            <Input
              id={phoneId}
              placeholder={t('addParentSheet.phonePlaceholder')} 
              value={newParent.phone || ''}
              onChange={(e) => onNewParentChange({...newParent, phone: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={roleId}>{t('addParentSheet.role')}</Label>
            <Select
              value={newParent.role || 'parent'}
              onValueChange={(value: 'parent' | 'teacher' | 'admin' | 'superadmin') => 
                onNewParentChange({...newParent, role: value})
              }
            >
              <SelectTrigger>
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
          </div>
          <SheetFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('addParentSheet.cancel')}</Button>
            <Button type="submit" className="bg-school-primary">
              {t('addParentSheet.addUser', { role: newParent.role?.charAt(0).toUpperCase() + newParent.role?.slice(1) || 'User' })}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default AddParentSheet;
