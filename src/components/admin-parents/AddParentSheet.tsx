
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
          <SheetTitle>Add New User</SheetTitle>
          <SheetDescription>
            Create a new user account. They can be associated with students if needed.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor={nameId}>Name</Label>
            <Input
              id={nameId}
              placeholder="Enter full name" 
              value={newParent.name}
              onChange={(e) => onNewParentChange({...newParent, name: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={emailId}>Email</Label>
            <Input
              id={emailId}
              type="email" 
              placeholder="Enter email address" 
              value={newParent.email}
              onChange={(e) => onNewParentChange({...newParent, email: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={phoneId}>Phone (optional)</Label>
            <Input
              id={phoneId}
              placeholder="Enter phone number" 
              value={newParent.phone || ''}
              onChange={(e) => onNewParentChange({...newParent, phone: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={roleId}>Role</Label>
            <Select
              value={newParent.role || 'parent'}
              onValueChange={(value: 'parent' | 'teacher' | 'admin' | 'superadmin') => 
                onNewParentChange({...newParent, role: value})
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-school-primary">
              Add {newParent.role?.charAt(0).toUpperCase() + newParent.role?.slice(1) || 'User'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default AddParentSheet;
