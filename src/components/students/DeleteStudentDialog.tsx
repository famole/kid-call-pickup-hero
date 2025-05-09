
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Child } from '@/types';

interface DeleteStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Child | null;
  onDelete: () => void;
}

const DeleteStudentDialog = ({
  open,
  onOpenChange,
  student,
  onDelete
}: DeleteStudentDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Student</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {student?.name}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={onDelete}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteStudentDialog;
