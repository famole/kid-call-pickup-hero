
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
  parent: ParentInput;
  onParentChange: (parent: ParentInput) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  userRole?: 'parent' | 'teacher' | 'admin';
}

const AddParentSheet: React.FC<AddParentSheetProps> = ({
  isOpen,
  onOpenChange,
  parent,
  onParentChange,
  onSubmit,
  userRole = 'parent',
}) => {
  const nameId = React.useId();
  const emailId = React.useId();
  const phoneId = React.useId();
  const roleId = React.useId();
  
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add New User</SheetTitle>
          <SheetDescription>
            Create a new parent or teacher account. They can be associated with students if needed.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor={nameId}>Name</Label>
            <Input
              id={nameId}
              placeholder="Enter full name" 
              value={parent.name}
              onChange={(e) => onParentChange({...parent, name: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={emailId}>Email</Label>
            <Input
              id={emailId}
              type="email" 
              placeholder="Enter email address" 
              value={parent.email}
              onChange={(e) => onParentChange({...parent, email: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={phoneId}>Phone (optional)</Label>
            <Input
              id={phoneId}
              placeholder="Enter phone number" 
              value={parent.phone || ''}
              onChange={(e) => onParentChange({...parent, phone: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={roleId}>Role</Label>
            <Select
              value={parent.role || 'parent'}
              onValueChange={(value: 'parent' | 'teacher' | 'admin') => 
                onParentChange({...parent, role: value})
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <SheetFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">
              Add {parent.role === 'teacher' ? 'Teacher' : parent.role === 'admin' ? 'Admin' : 'Parent'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default AddParentSheet;
