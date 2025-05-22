
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
import { Loader2 } from "lucide-react";
import { isValidUUID } from '@/utils/validators';

interface AddStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classList: Class[];
  newStudent: Partial<Child>;
  setNewStudent: React.Dispatch<React.SetStateAction<Partial<Child>>>;
  onSave: () => void;
  isLoading?: boolean;
}

const AddStudentDialog = ({
  open,
  onOpenChange,
  classList,
  newStudent,
  setNewStudent,
  onSave,
  isLoading = false
}: AddStudentDialogProps) => {
  const studentNameId = React.useId();
  const studentClassId = React.useId();
  // Validate that the classId is a valid UUID before setting it
  const handleClassChange = (classId: string) => {
    if (isValidUUID(classId)) {
      setNewStudent({...newStudent, classId});
    } else {
      console.error("Invalid class ID format:", classId);
      // Try to find the actual UUID for this class in the list
      const classItem = classList.find(c => c.id === classId || c.name === classId);
      if (classItem && isValidUUID(classItem.id)) {
        setNewStudent({...newStudent, classId: classItem.id});
      } else {
        console.error("Could not find a valid UUID for class:", classId);
      }
    }
  };

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
            <Label htmlFor={studentNameId} className="required">Student Name</Label>
            <Input
              id={studentNameId}
              value={newStudent.name || ''}
              onChange={e => setNewStudent({...newStudent, name: e.target.value})}
              placeholder="e.g. John Doe"
              required
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={studentClassId} className="required">Class</Label>
            <Select
              value={newStudent.classId || ''}
              onValueChange={handleClassChange}
              required
            >
              <SelectTrigger id={studentClassId}>
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
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={onSave}
            disabled={!newStudent.name || !newStudent.classId || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Student"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddStudentDialog;
