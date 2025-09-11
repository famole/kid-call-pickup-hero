
import React from 'react';
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Users, RotateCcw, KeyRound, Info } from "lucide-react";
import { ParentWithStudents } from '@/types/parent';
import { ParentAuthStatus } from '@/services/authStatusService';
import AuthStatusBadge from './AuthStatusBadge';
import { useTranslation } from '@/hooks/useTranslation';

interface ParentTableRowProps {
  parent: ParentWithStudents;
  onEdit: () => void;
  onDelete: () => void;
  onManageStudents: () => void;
  onReactivate?: () => void;
  onResetPassword?: () => void;
  userRole?: 'parent' | 'teacher' | 'admin' | 'superadmin' | 'family';
  showStudentsColumn: boolean;
  showPhoneColumn: boolean;
  authStatus?: ParentAuthStatus;
}

const ParentTableRow: React.FC<ParentTableRowProps> = ({
  parent,
  onEdit,
  onDelete,
  onManageStudents,
  onReactivate,
  onResetPassword,
  userRole = 'parent',
  showStudentsColumn,
  showPhoneColumn,
  authStatus,
}) => {
  const { t } = useTranslation();
  const isDeleted = !!parent.deletedAt;
  
  return (
    <TableRow className={isDeleted ? "opacity-60 bg-muted/20" : ""}>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {parent.name}
          {isDeleted && (
            <Badge variant="secondary" className="text-xs">
              {t('parentsManagement.deleted')}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {userRole === 'family' ? (parent.username?.trim() || parent.email?.trim() || '') : parent.email}
          <AuthStatusBadge authStatus={authStatus} />
        </div>
      </TableCell>
      {showPhoneColumn && (
        <TableCell>{parent.phone || t('parentsManagement.notAvailable')}</TableCell>
      )}
      {showStudentsColumn && (
        <TableCell>
          {t('parentsManagement.studentsCount', { 
            count: parent.students?.length || 0,
            defaultValue: `${parent.students?.length || 0} students`
          })}
        </TableCell>
      )}
      <TableCell>
        <div className="flex space-x-2">
          {isDeleted ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onReactivate}
              className="text-green-600 hover:text-green-700"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              {showStudentsColumn && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onManageStudents}
                  title={parent.role === 'family' ? 'View Family Member Details' : 'Manage Students'}
                  className="flex items-center gap-1"
                >
                  {parent.role === 'family' ? <Info className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                  <span className="hidden sm:inline text-xs">
                    {parent.role === 'family' ? 'Details' : 'Students'}
                  </span>
                </Button>
              )}
              {onResetPassword && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onResetPassword}
                  className="text-orange-600 hover:text-orange-700"
                >
                  <KeyRound className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

export default ParentTableRow;
