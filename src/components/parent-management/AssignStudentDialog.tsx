
import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog";
import { ParentWithStudents } from '@/types/parent';
import { Child } from '@/types';

interface AssignStudentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  selectedParent: ParentWithStudents | null;
  unassignedStudents: Child[];
  onAssignStudent: (parentId: string, studentId: string) => Promise<void>;
}

const AssignStudentDialog: React.FC<AssignStudentDialogProps> = ({
  isOpen,
  onOpenChange,
  selectedParent,
  unassignedStudents,
  onAssignStudent,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Student to Parent</DialogTitle>
          <DialogDescription>
            {selectedParent && `Select a student to assign to ${selectedParent.name}`}
          </DialogDescription>
        </DialogHeader>
        
        {selectedParent && (
          <>
            {unassignedStudents.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500 dark:text-gray-400">No unassigned students available</p>
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto space-y-2 p-1">
                {unassignedStudents.map(student => (
                  <div 
                    key={student.id}
                    className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    <span>{student.name}</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onAssignStudent(selectedParent.id, student.id)}
                    >
                      Assign
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        
        <DialogFooter>
          <Button 
            onClick={() => onOpenChange(false)} 
            className="w-full sm:w-auto"
            variant="outline"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignStudentDialog;
