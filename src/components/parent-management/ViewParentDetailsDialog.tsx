
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

interface ViewParentDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  selectedParent: ParentWithStudents | null;
}

const ViewParentDetailsDialog: React.FC<ViewParentDetailsDialogProps> = ({
  isOpen,
  onOpenChange,
  selectedParent,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Parent Details</DialogTitle>
          <DialogDescription>
            View details and assigned students
          </DialogDescription>
        </DialogHeader>
        
        {selectedParent && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Contact Information</h3>
              <div className="mt-2 space-y-1 text-sm">
                <p><strong>Name:</strong> {selectedParent.name}</p>
                <p><strong>Email:</strong> {selectedParent.email}</p>
                <p><strong>Phone:</strong> {selectedParent.phone || "Not provided"}</p>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium">Assigned Students</h3>
              {selectedParent.students && selectedParent.students.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {selectedParent.students.map(student => (
                    <div key={student.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      <span>{student.name}</span>
                      {student.isPrimary && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded dark:bg-green-800 dark:text-green-100">
                          Primary
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">No students assigned</p>
              )}
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button 
            onClick={() => onOpenChange(false)} 
            className="w-full sm:w-auto"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ViewParentDetailsDialog;
