
import React from 'react';
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Users, Star } from "lucide-react";
import { ParentWithStudents } from '@/types/parent';

interface ParentTableRowProps {
  parent: ParentWithStudents;
  onEdit: (parent: ParentWithStudents) => void;
  onDelete: (parentId: string) => void;
  onManageStudents: (parent: ParentWithStudents) => void;
}

const ParentTableRow: React.FC<ParentTableRowProps> = ({
  parent,
  onEdit,
  onDelete,
  onManageStudents,
}) => {
  return (
    <TableRow key={parent.id}>
      <TableCell>{parent.name}</TableCell>
      <TableCell>{parent.email}</TableCell>
      <TableCell>{parent.phone || '-'}</TableCell>
      <TableCell>
        {parent.students && parent.students.length > 0 ? (
          <div className="space-y-1">
            {parent.students.map(student => (
              <div key={student.parentRelationshipId} className="flex items-center bg-gray-50 dark:bg-gray-800 p-2 rounded text-sm">
                <div className="flex items-center">
                  {student.isPrimary ? <Star className="h-3 w-3 text-yellow-500 mr-1" /> : null}
                  <span>{student.name}</span>
                  {student.relationship && <span className="text-xs text-gray-500 ml-1">({student.relationship})</span>}
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="mt-2 h-8"
              onClick={() => onManageStudents(parent)}
            >
              <Users className="h-4 w-4 mr-1" /> Manage Students ({parent.students.length})
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <span className="text-gray-400">No students</span>
            <Button
              variant="outline"
              size="sm"
              className="mt-1 h-8"
              onClick={() => onManageStudents(parent)}
            >
              <Users className="h-4 w-4 mr-1" /> Manage Students
            </Button>
          </div>
        )}
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
