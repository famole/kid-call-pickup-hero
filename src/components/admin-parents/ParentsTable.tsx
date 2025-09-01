
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
import { useTranslation } from '@/hooks/useTranslation';

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
  totalItems?: number;
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
  totalItems,
}) => {
  const { t } = useTranslation();

  const getUserTypeKey = (): string => {
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
    <div className="space-y-4">
      {totalItems !== undefined && (
        <div className="text-sm text-muted-foreground">
          {t('parentsManagement.totalCount', { 
            count: totalItems, 
            type: t(`parentsManagement.${getUserTypeKey()}`) 
          })}
        </div>
      )}
      <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('parentsManagement.tableHeaders.name', { defaultValue: 'Name' })}</TableHead>
          <TableHead>{t('parentsManagement.tableHeaders.email', { defaultValue: 'Email' })}</TableHead>
          <TableHead>{t('parentsManagement.tableHeaders.phone', { defaultValue: 'Phone' })}</TableHead>
          {shouldShowStudentsColumn && <TableHead>{t('parentsManagement.tableHeaders.students', { defaultValue: 'Students' })}</TableHead>}
          <TableHead>{t('parentsManagement.tableHeaders.actions', { defaultValue: 'Actions' })}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={shouldShowStudentsColumn ? 5 : 4} className="text-center">
              {t(`parentsManagement.loading.${getUserTypeKey()}`)}
            </TableCell>
          </TableRow>
        ) : parents.length === 0 ? (
          <TableRow>
            <TableCell colSpan={shouldShowStudentsColumn ? 5 : 4} className="text-center">
              {searchTerm 
                ? t(`parentsManagement.noResultsSearch.${getUserTypeKey()}`, { searchTerm })
                : `${t(`parentsManagement.noResults.${getUserTypeKey()}`)}. ${t(`parentsManagement.addToStart.${getUserTypeKey()}`)}`
              }
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
    </div>
  );
};

export default ParentsTable;
