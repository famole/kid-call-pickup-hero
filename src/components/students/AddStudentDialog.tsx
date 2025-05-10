
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

interface AddStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classList: Class[];
  newStudent: Partial<Child>;
  setNewStudent: React.Dispatch<React.SetStateAction<Partial<Child>>>;
  onSave: () => void;
}

const AddStudentDialog = ({
  open,
  onOpenChange,
  classList,
  newStudent,
  setNewStudent,
  onSave
}: AddStudentDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
          <DialogDescription>
            Add a new student to your school. Fill in the required fields.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="studentName" className="required">Student Name</Label>
            <Input 
              id="studentName" 
              value={newStudent.name || ''} 
              onChange={e => setNewStudent({...newStudent, name: e.target.value})}
              placeholder="e.g. John Doe"
              required
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="studentClass" className="required">Class</Label>
            <Select
              value={newStudent.classId || ''}
              onValueChange={(value) => setNewStudent({...newStudent, classId: value})}
              required
            >
              <SelectTrigger id="studentClass">
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
          <Button 
            variant="outline" 
            onClick={() => {
              setNewStudent({ name: '', classId: '', parentIds: [] });
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={onSave}
            disabled={!newStudent.name || !newStudent.classId}
          >
            Save Student
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddStudentDialog;
