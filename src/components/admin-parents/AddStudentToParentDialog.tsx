
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { Child, Class } from '@/types';

interface AddStudentToParentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  selectedParentName: string | undefined;
  allStudents: Child[];
  classes: Class[];
  selectedStudentId: string;
  onSelectedStudentIdChange: (id: string) => void;
  relationship: string;
  onRelationshipChange: (relationship: string) => void;
  isPrimary: boolean;
  onIsPrimaryChange: (isPrimary: boolean) => void;
  onSubmit: () => Promise<void>;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  selectedClassFilter: string;
  onClassFilterChange: (classId: string) => void;
  filteredStudents: Child[];
}

const AddStudentToParentDialog: React.FC<AddStudentToParentDialogProps> = ({
  isOpen,
  onOpenChange,
  selectedParentName,
  allStudents,
  classes,
  selectedStudentId,
  onSelectedStudentIdChange,
  relationship,
  onRelationshipChange,
  isPrimary,
  onIsPrimaryChange,
  onSubmit,
  searchTerm,
  onSearchTermChange,
  selectedClassFilter,
  onClassFilterChange,
  filteredStudents,
}) => {
  const studentId = React.useId();
  const relationshipId = React.useId();
  const primaryId = React.useId();
  const searchId = React.useId();
  const classFilterId = React.useId();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Student to Parent</DialogTitle>
          <DialogDescription>
            Associate a student with {selectedParentName || 'the selected parent'}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Search and Filter Section */}
          <div className="space-y-3 border-b pb-4">
            <div className="space-y-2">
              <Label htmlFor={searchId}>Search Students</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id={searchId}
                  placeholder="Search by student name..."
                  value={searchTerm}
                  onChange={(e) => onSearchTermChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={classFilterId}>Filter by Class</Label>
              <Select value={selectedClassFilter} onValueChange={onClassFilterChange}>
                <SelectTrigger id={classFilterId}>
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} - {cls.grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Student Selection */}
          <div className="space-y-2">
            <Label htmlFor={studentId}>Student ({filteredStudents.length} available)</Label>
            <Select value={selectedStudentId} onValueChange={onSelectedStudentIdChange}>
              <SelectTrigger id={studentId}>
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {filteredStudents.length === 0 ? (
                  <SelectItem value="no-students-available" disabled>
                    No students match your filters
                  </SelectItem>
                ) : (
                  filteredStudents.map(student => {
                    const studentClass = classes.find(cls => cls.id === student.classId);
                    return (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} {studentClass ? `(${studentClass.name})` : ''}
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={relationshipId}>Relationship (optional)</Label>
            <Input
              id={relationshipId}
              placeholder="e.g., Mother, Father, Guardian" 
              value={relationship}
              onChange={(e) => onRelationshipChange(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={primaryId}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              checked={isPrimary}
              onChange={(e) => onIsPrimaryChange(e.target.checked)}
            />
            <Label htmlFor={primaryId}>Primary Parent/Guardian</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={!selectedStudentId || selectedStudentId === "no-students-available"}>
            Add Student
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddStudentToParentDialog;
