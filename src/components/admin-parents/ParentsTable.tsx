
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ParentWithStudents } from '@/types/parent';
import ParentTableRow from './ParentTableRow';

interface ParentsTableProps {
  parents: ParentWithStudents[];
  isLoading: boolean;
  searchTerm: string;
  onEditParent: (parent: ParentWithStudents) => void;
  onDeleteParent: (parentId: string) => void;
  onManageStudents: (parent: ParentWithStudents) => void;
  userRole?: 'parent' | 'teacher' | 'admin';
}

const ParentsTable: React.FC<ParentsTableProps> = ({
  parents,
  isLoading,
  searchTerm,
  onEditParent,
  onDeleteParent,
  onManageStudents,
  userRole = 'parent',
}) => {
  const getUserTypeLabel = () => {
    switch (userRole) {
      case 'teacher':
        return 'teachers';
      case 'admin':
        return 'admins';
      default:
        return 'parents';
    }
  };

  const shouldShowStudentsColumn = userRole === 'parent';

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          {shouldShowStudentsColumn && <TableHead>Students</TableHead>}
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={shouldShowStudentsColumn ? 5 : 4} className="text-center">
              Loading {getUserTypeLabel()}...
            </TableCell>
          </TableRow>
        ) : parents.length === 0 ? (
          <TableRow>
            <TableCell colSpan={shouldShowStudentsColumn ? 5 : 4} className="text-center">
              {searchTerm ? `No ${getUserTypeLabel()} found matching "${searchTerm}".` : `No ${getUserTypeLabel()} found. Add one to get started.`}
            </TableCell>
          </TableRow>
        ) : (
          parents.map((parent) => (
            <ParentTableRow
              key={parent.id}
              parent={parent}
              onEdit={() => onEditParent(parent)}
              onDelete={onDeleteParent}
              onManageStudents={() => onManageStudents(parent)}
              userRole={userRole}
              showStudentsColumn={shouldShowStudentsColumn}
            />
          ))
        )}
      </TableBody>
    </Table>
  );
};

export default ParentsTable;
