
import React from 'react';
import AddParentSheet from './AddParentSheet';
import EditParentSheet from './EditParentSheet';
import FamilyMemberDetailScreen from './FamilyMemberDetailScreen';
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

  // Family Member Detail Screen
  isStudentModalOpen: boolean;
  selectedParent: ParentWithStudents | null;
  allStudents: Child[];
  allParents: ParentWithStudents[];
  onStudentModalOpenChange: (isOpen: boolean) => void;
  onAddStudent: (parentId: string, studentId: string, relationship: string, isPrimary: boolean) => Promise<void>;
  onRemoveStudent: (studentRelationshipId: string, parentId: string, studentId: string) => void;
  onTogglePrimary: (studentRelationshipId: string, parentId: string, currentIsPrimary: boolean, currentRelationship?: string) => void;

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

  // Family Member Detail Screen props
  isStudentModalOpen,
  selectedParent,
  allStudents,
  allParents,
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

      <FamilyMemberDetailScreen
        isOpen={isStudentModalOpen}
        onOpenChange={onStudentModalOpenChange}
        parent={selectedParent}
        allStudents={allStudents}
        allParents={allParents}
        classes={classes}
        onAddStudent={onAddStudent}
        onRemoveStudent={onRemoveStudent}
        onTogglePrimary={onTogglePrimary}
      />

    </>
  );
};

export default ParentModals;
