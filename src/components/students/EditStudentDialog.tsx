
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Class, Child } from '@/types';

interface EditStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classList: Class[];
  student: Partial<Child>;
  setStudent: React.Dispatch<React.SetStateAction<Partial<Child>>>;
  onUpdate: () => void;
}

const EditStudentDialog = ({
  open,
  onOpenChange,
  classList,
  student,
  setStudent,
  onUpdate
}: EditStudentDialogProps) => {
  const nameId = React.useId();
  const classId = React.useId();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Student</DialogTitle>
          <DialogDescription>
            Update student information
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor={nameId}>Student Name</Label>
            <Input
              id={nameId}
              value={student.name}
              onChange={e => setStudent({...student, name: e.target.value})}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={classId}>Class</Label>
            <Select
              value={student.classId}
              onValueChange={(value) => setStudent({...student, classId: value})}
            >
              <SelectTrigger id={classId}>
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classList.map((classItem) => (
                  <SelectItem key={classItem.id} value={classItem.id}>
                    {classItem.name} ({classItem.grade})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onUpdate}>Update Student</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditStudentDialog;
