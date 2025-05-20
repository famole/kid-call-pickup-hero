
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
import { ParentWithStudents, ParentInput } from '@/types/parent';

interface EditParentSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  selectedParent: ParentWithStudents | null;
  onSelectedParentChange: (parent: ParentWithStudents) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

const EditParentSheet: React.FC<EditParentSheetProps> = ({
  isOpen,
  onOpenChange,
  selectedParent,
  onSelectedParentChange,
  onSubmit,
}) => {
  if (!selectedParent) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit Parent</SheetTitle>
          <SheetDescription>
            Update parent information.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input 
              id="edit-name" 
              placeholder="Enter parent name" 
              value={selectedParent.name}
              onChange={(e) => onSelectedParentChange({...selectedParent, name: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input 
              id="edit-email" 
              type="email" 
              placeholder="Enter email address" 
              value={selectedParent.email}
              onChange={(e) => onSelectedParentChange({...selectedParent, email: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Phone (optional)</Label>
            <Input 
              id="edit-phone" 
              placeholder="Enter phone number" 
              value={selectedParent.phone || ''}
              onChange={(e) => onSelectedParentChange({...selectedParent, phone: e.target.value})}
            />
          </div>
          <SheetFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Update Parent</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default EditParentSheet;
