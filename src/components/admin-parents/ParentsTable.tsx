
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
import { ParentAuthStatus } from '@/services/authStatusService';
import ParentTableRow from './ParentTableRow';

interface ParentsTableProps {
  parents: ParentWithStudents[];
  isLoading: boolean;
  searchTerm: string;
  onEditParent: (parent: ParentWithStudents) => void;
  onDeleteParent: (parentId: string) => void;
  onManageStudents: (parent: ParentWithStudents) => void;
  onReactivateParent?: (parentId: string, parentName: string) => void;
  onResetParentPassword?: (email: string, name: string) => void;
  userRole?: 'parent' | 'teacher' | 'admin' | 'superadmin';
  authStatuses?: Map<string, ParentAuthStatus>;
}

const ParentsTable: React.FC<ParentsTableProps> = ({
  parents,
  isLoading,
  searchTerm,
  onEditParent,
  onDeleteParent,
  onManageStudents,
  onReactivateParent,
  onResetParentPassword,
  userRole = 'parent',
  authStatuses,
}) => {
  const getUserTypeLabel = () => {
    switch (userRole) {
      case 'superadmin':
        return 'superadmins';
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
              onDelete={() => onDeleteParent(parent.id)}
              onManageStudents={() => onManageStudents(parent)}
              onReactivate={onReactivateParent ? () => onReactivateParent(parent.id, parent.name) : undefined}
              onResetPassword={onResetParentPassword ? () => onResetParentPassword(parent.email, parent.name) : undefined}
              userRole={userRole}
              showStudentsColumn={shouldShowStudentsColumn}
              authStatus={authStatuses?.get(parent.email.toLowerCase())}
            />
          ))
        )}
      </TableBody>
    </Table>
  );
};

export default ParentsTable;
