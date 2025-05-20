
import React from 'react';
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, UserPlus, Star, StarOff } from "lucide-react";
import { ParentWithStudents } from '@/types/parent';

interface ParentTableRowProps {
  parent: ParentWithStudents;
  onEdit: (parent: ParentWithStudents) => void;
  onDelete: (parentId: string) => void;
  onAddStudent: (parent: ParentWithStudents) => void;
  onTogglePrimary: (studentRelationshipId: string, parentId: string, currentIsPrimary: boolean, currentRelationship?: string) => void;
  onRemoveStudent: (studentRelationshipId: string, parentId: string, studentId: string) => void;
}

const ParentTableRow: React.FC<ParentTableRowProps> = ({
  parent,
  onEdit,
  onDelete,
  onAddStudent,
  onTogglePrimary,
  onRemoveStudent,
}) => {
  return (
    <TableRow key={parent.id}>
      <TableCell>{parent.name}</TableCell>
      <TableCell>{parent.email}</TableCell>
      <TableCell>{parent.phone || '-'}</TableCell>
      <TableCell>
        {parent.students && parent.students.length > 0 ? (
          <div className="space-y-2">
            {parent.students.map(student => (
              <div key={student.parentRelationshipId} className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-2 rounded">
                <div className="flex items-center">
                  {student.isPrimary ? <Star className="h-4 w-4 text-yellow-500 mr-1" /> : null}
                  <span>{student.name}</span>
                  {student.relationship && <span className="text-xs text-gray-500 ml-1">({student.relationship})</span>}
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
          <span className="text-gray-400">No students</span>
        )}
        <Button
          variant="link"
          size="sm"
          className="mt-2 px-0 text-primary"
          onClick={() => onAddStudent(parent)}
        >
          <UserPlus className="h-4 w-4 mr-1" /> Add Student
        </Button>
      </TableCell>
      <TableCell>
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="sm"
            title="Edit parent"
            onClick={() => onEdit(parent)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Delete parent"
            onClick={() => onDelete(parent.id)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default ParentTableRow;
