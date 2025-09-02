
import React from 'react';
import AddParentSheet from './AddParentSheet';
import EditParentSheet from './EditParentSheet';
import StudentManagementModal from './StudentManagementModal';
import { ParentWithStudents, ParentInput } from '@/types/parent';
import { Child, Class } from '@/types';

interface ParentModalsProps {
  // Add Parent Sheet
  isAddSheetOpen: boolean;
  newParent: ParentInput;
  onNewParentChange: (parent: ParentInput) => void;
  onAddParentSubmit: (e?: React.FormEvent) => Promise<void>;
  onAddSheetOpenChange: (isOpen: boolean) => void;
  isSubmitting?: boolean;
  getFieldError?: (fieldName: string) => any;
  hasFieldError?: (fieldName: string) => boolean;

  // Edit Parent Sheet
  isEditSheetOpen: boolean;
  editingParent: ParentWithStudents | null;
  onEditingParentChange: (parent: ParentWithStudents) => void;
  onEditParentSubmit: (e?: React.FormEvent) => Promise<void>;
  onEditSheetOpenChange: (isOpen: boolean) => void;

  // Student Management Modal
  isStudentModalOpen: boolean;
  selectedParent: ParentWithStudents | null;
  allStudents: Child[];
  onStudentModalOpenChange: (isOpen: boolean) => void;
  onAddStudent: (studentId: string, relationship: string) => Promise<void>;
  onRemoveStudent: (studentId: string) => Promise<void>;
  onTogglePrimary: (studentId: string) => Promise<void>;

  classes: Class[];
  userRole?: 'parent' | 'teacher' | 'admin' | 'superadmin' | 'family';
}

const ParentModals: React.FC<ParentModalsProps> = ({
  // Add Parent Sheet props
  isAddSheetOpen,
  newParent,
  onNewParentChange,
  onAddParentSubmit,
  onAddSheetOpenChange,
  isSubmitting,
  getFieldError,
  hasFieldError,

  // Edit Parent Sheet props
  isEditSheetOpen,
  editingParent,
  onEditingParentChange,
  onEditParentSubmit,
  onEditSheetOpenChange,

  // Student Management Modal props
  isStudentModalOpen,
  selectedParent,
  allStudents,
  onStudentModalOpenChange,
  onAddStudent,
  onRemoveStudent,
  onTogglePrimary,

  classes,

  userRole = 'parent',
}) => {
  return (
    <>
      <AddParentSheet
        isOpen={isAddSheetOpen}
        onOpenChange={onAddSheetOpenChange}
        newParent={newParent}
        onNewParentChange={onNewParentChange}
        onSubmit={onAddParentSubmit}
        userRole={userRole}
        isSubmitting={isSubmitting}
        getFieldError={getFieldError}
        hasFieldError={hasFieldError}
      />

      <EditParentSheet
        isOpen={isEditSheetOpen}
        onOpenChange={onEditSheetOpenChange}
        editingParent={editingParent}
        onEditingParentChange={onEditingParentChange}
        onSubmit={onEditParentSubmit}
        userRole={userRole}
      />

      <StudentManagementModal
        isOpen={isStudentModalOpen}
        onOpenChange={onStudentModalOpenChange}
        parent={selectedParent}
        allStudents={allStudents}
        classes={classes}
        onAddStudent={async (parentId: string, studentId: string, relationship: string, isPrimary: boolean) => {
          await onAddStudent(studentId, relationship);
        }}
        onRemoveStudent={async (studentRelationshipId: string, parentId: string, studentId: string) => {
          await onRemoveStudent(studentId);
        }}
        onTogglePrimary={async (studentRelationshipId: string, parentId: string, currentIsPrimary: boolean, currentRelationship?: string) => {
          const student = selectedParent?.students?.find(s => s.parentRelationshipId === studentRelationshipId);
          if (student) {
            await onTogglePrimary(student.id);
          }
        }}
      />

    </>
  );
};

export default ParentModals;
