
import React from 'react';
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Users, UserPlus } from "lucide-react";
import { ParentWithStudents } from '@/types/parent';

interface ParentTableRowProps {
  parent: ParentWithStudents;
  onEdit: () => void;
  onDelete: (parentId: string) => void;
  onManageStudents: () => void;
  onAddStudentToParent: () => void;
  userRole?: 'parent' | 'teacher' | 'admin';
  showStudentsColumn: boolean;
}

const ParentTableRow: React.FC<ParentTableRowProps> = ({
  parent,
  onEdit,
  onDelete,
  onManageStudents,
  onAddStudentToParent,
  userRole = 'parent',
  showStudentsColumn,
}) => {
  return (
    <TableRow>
      <TableCell className="font-medium">{parent.name}</TableCell>
      <TableCell>{parent.email}</TableCell>
      <TableCell>{parent.phone || 'N/A'}</TableCell>
      {showStudentsColumn && (
        <TableCell>{parent.students?.length || 0} students</TableCell>
      )}
      <TableCell>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onDelete(parent.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          {showStudentsColumn && (
            <>
              <Button variant="outline" size="sm" onClick={onManageStudents}>
                <Users className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={onAddStudentToParent}>
                <UserPlus className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

export default ParentTableRow;
