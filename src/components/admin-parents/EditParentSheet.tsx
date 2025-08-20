
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
import { ParentWithStudents, ParentInput } from '@/types/parent';
import { useAuth } from '@/context/auth/AuthProvider';
import { useTranslation } from '@/hooks/useTranslation';

interface EditParentSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  editingParent: ParentWithStudents | null;
  onEditingParentChange: (parent: ParentWithStudents) => void;
  onSubmit: (e?: React.FormEvent) => Promise<void>;
  userRole?: 'parent' | 'teacher' | 'admin' | 'superadmin';
}

const EditParentSheet: React.FC<EditParentSheetProps> = ({
  isOpen,
  onOpenChange,
  editingParent,
  onEditingParentChange,
  onSubmit,
  userRole = 'parent',
}) => {
  const { user } = useAuth();
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

  // Check if current user can edit this parent's role
  const canEditRole = () => {
    if (!editingParent || !user) return false;
    
    // Users can't change their own role
    if (editingParent.email === user.email) return false;
    
    // Role hierarchy: superadmin > admin > teacher > parent
    const roleHierarchy = { parent: 1, teacher: 2, admin: 3, superadmin: 4 };
    const currentUserLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] || 0;
    const targetUserLevel = roleHierarchy[editingParent.role as keyof typeof roleHierarchy] || 0;
    
    return currentUserLevel > targetUserLevel;
  };

  const availableRoles = getAvailableRoles();
  const roleEditable = canEditRole();
  
  if (!editingParent) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t('editParentSheet.title')}</SheetTitle>
          <SheetDescription>
            {t('editParentSheet.description')}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor={nameId}>{t('editParentSheet.name')}</Label>
            <Input
              id={nameId}
              placeholder={t('editParentSheet.namePlaceholder')} 
              value={editingParent.name}
              onChange={(e) => onEditingParentChange({...editingParent, name: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={emailId}>{t('editParentSheet.email')}</Label>
            <Input
              id={emailId}
              type="email" 
              placeholder={t('editParentSheet.emailPlaceholder')} 
              value={editingParent.email}
              onChange={(e) => onEditingParentChange({...editingParent, email: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={phoneId}>{t('editParentSheet.phone')}</Label>
            <Input
              id={phoneId}
              placeholder={t('editParentSheet.phonePlaceholder')} 
              value={editingParent.phone || ''}
              onChange={(e) => onEditingParentChange({...editingParent, phone: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={roleId}>{t('editParentSheet.role')}</Label>
            <Select
              value={editingParent.role || 'parent'}
              onValueChange={(value: 'parent' | 'teacher' | 'admin' | 'superadmin') => 
                onEditingParentChange({...editingParent, role: value})
              }
              disabled={!roleEditable}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('editParentSheet.selectRole')} />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!roleEditable && (
              <p className="text-xs text-muted-foreground">
                {t('editParentSheet.roleEditRestriction')}
              </p>
            )}
          </div>
          <SheetFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('editParentSheet.cancel')}</Button>
            <Button type="submit" className="bg-school-primary">
              {t('editParentSheet.updateUser', { role: editingParent.role?.charAt(0).toUpperCase() + editingParent.role?.slice(1) || 'User' })}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default EditParentSheet;
