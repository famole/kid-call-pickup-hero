
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
import { Star, StarOff, Trash2, UserPlus } from "lucide-react";
import { ParentWithStudents } from '@/types/parent';
import { Child } from '@/types';

interface StudentManagementModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  parent: ParentWithStudents | null;
  allStudents: Child[];
  onAddStudent: (parentId: string, studentId: string, relationship: string, isPrimary: boolean) => Promise<void>;
  onRemoveStudent: (studentRelationshipId: string, parentId: string, studentId: string) => void;
  onTogglePrimary: (studentRelationshipId: string, parentId: string, currentIsPrimary: boolean, currentRelationship?: string) => void;
}

const StudentManagementModal: React.FC<StudentManagementModalProps> = ({
  isOpen,
  onOpenChange,
  parent,
  allStudents,
  onAddStudent,
  onRemoveStudent,
  onTogglePrimary,
}) => {
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [selectedStudentId, setSelectedStudentId] = React.useState('');
  const [relationship, setRelationship] = React.useState('');
  const [isPrimary, setIsPrimary] = React.useState(false);

  const studentId = React.useId();
  const relationshipId = React.useId();
  const primaryId = React.useId();

  const availableStudents = parent
    ? allStudents.filter(s => !parent.students?.find(ps => ps.id === s.id))
    : allStudents;

  const handleAddStudent = async () => {
    if (!parent || !selectedStudentId) return;
    
    await onAddStudent(parent.id, selectedStudentId, relationship, isPrimary);
    setShowAddForm(false);
    setSelectedStudentId('');
    setRelationship('');
    setIsPrimary(false);
  };

  const handleClose = () => {
    setShowAddForm(false);
    setSelectedStudentId('');
    setRelationship('');
    setIsPrimary(false);
    onOpenChange(false);
  };

  if (!parent) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Students for {parent.name}</DialogTitle>
          <DialogDescription>
            Add, remove, or modify student relationships for this parent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Students */}
          <div>
            <h3 className="font-medium mb-3">Current Students ({parent.students?.length || 0})</h3>
            {parent.students && parent.students.length > 0 ? (
              <div className="space-y-2">
                {parent.students.map(student => (
                  <div key={student.parentRelationshipId} className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-3 rounded">
                    <div className="flex items-center">
                      {student.isPrimary ? <Star className="h-4 w-4 text-yellow-500 mr-2" /> : null}
                      <div>
                        <span className="font-medium">{student.name}</span>
                        {student.relationship && (
                          <span className="text-sm text-gray-500 ml-2">({student.relationship})</span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title={student.isPrimary ? "Unset as primary" : "Set as primary"}
                        onClick={() => onTogglePrimary(student.parentRelationshipId, parent.id, student.isPrimary, student.relationship)}
                      >
                        {student.isPrimary ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Remove student"
                        onClick={() => onRemoveStudent(student.parentRelationshipId, parent.id, student.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No students associated with this parent.</p>
            )}
          </div>

          {/* Add Student Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Add Student</h3>
              {!showAddForm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddForm(true)}
                  disabled={availableStudents.length === 0}
                >
                  <UserPlus className="h-4 w-4 mr-1" /> Add Student
                </Button>
              )}
            </div>

            {showAddForm ? (
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="space-y-2">
                  <Label htmlFor={studentId}>Student</Label>
                  <select
                    id={studentId}
                    className="w-full border rounded p-2 bg-background text-foreground"
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    required
                  >
                    <option value="">Select a student</option>
                    {availableStudents.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor={relationshipId}>Relationship (optional)</Label>
                  <Input
                    id={relationshipId}
                    placeholder="e.g., Mother, Father, Guardian" 
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={primaryId}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                  />
                  <Label htmlFor={primaryId}>Primary Parent/Guardian</Label>
                </div>
                
                <div className="flex space-x-2 pt-2">
                  <Button onClick={handleAddStudent} disabled={!selectedStudentId}>
                    Add Student
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : availableStudents.length === 0 ? (
              <p className="text-gray-500 text-sm">No available students to add.</p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StudentManagementModal;
