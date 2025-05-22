
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
import { Loader2 } from 'lucide-react'; // Import Loader2

interface DeleteStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Child | null;
  onDelete: () => void;
  isLoading?: boolean; // Add isLoading prop
}

const DeleteStudentDialog = ({
  open,
  onOpenChange,
  student,
  onDelete,
  isLoading = false // Destructure with a default value
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
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isLoading} // Disable if loading
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={onDelete} 
            disabled={isLoading} // Disable if loading
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteStudentDialog;

