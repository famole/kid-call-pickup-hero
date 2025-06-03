
import React from 'react';
import { ParentInput, ParentWithStudents } from '@/types/parent';
import { Child } from '@/types';
import AddParentSheet from './AddParentSheet';
import EditParentSheet from './EditParentSheet';
import StudentManagementModal from './StudentManagementModal';

interface ParentModalsProps {
  isAddSheetOpen: boolean;
  newParent: ParentInput;
  onNewParentChange: (parent: ParentInput) => void;
  onAddParentSubmit: (e: React.FormEvent) => Promise<void>;
  onAddSheetOpenChange: (open: boolean) => void;
  isEditSheetOpen: boolean;
  editingParent: ParentWithStudents | null;
  onEditingParentChange: (parent: ParentWithStudents) => void;
  onEditParentSubmit: (e: React.FormEvent) => Promise<void>;
  onEditSheetOpenChange: (open: boolean) => void;
  isStudentModalOpen: boolean;
  selectedParent: ParentWithStudents | null;
  allStudents: Child[];
  onStudentModalOpenChange: (open: boolean) => void;
  onAddStudent: (studentId: string, relationship: string) => Promise<void>;
  onRemoveStudent: (studentId: string) => Promise<void>;
  onTogglePrimary: (studentId: string) => Promise<void>;
  userRole?: 'parent' | 'teacher' | 'admin';
}

const ParentModals: React.FC<ParentModalsProps> = ({
  isAddSheetOpen,
  newParent,
  onNewParentChange,
  onAddParentSubmit,
  onAddSheetOpenChange,
  isEditSheetOpen,
  editingParent,
  onEditingParentChange,
  onEditParentSubmit,
  onEditSheetOpenChange,
  isStudentModalOpen,
  selectedParent,
  allStudents,
  onStudentModalOpenChange,
  onAddStudent,
  onRemoveStudent,
  onTogglePrimary,
  userRole = 'parent',
}) => {
  return (
    <>
      <AddParentSheet
        isOpen={isAddSheetOpen}
        parent={newParent}
        onParentChange={onNewParentChange}
        onSubmit={onAddParentSubmit}
        onOpenChange={onAddSheetOpenChange}
        userRole={userRole}
      />

      <EditParentSheet
        isOpen={isEditSheetOpen}
        parent={editingParent}
        onParentChange={onEditingParentChange}
        onSubmit={onEditParentSubmit}
        onOpenChange={onEditSheetOpenChange}
        userRole={userRole}
      />

      {userRole === 'parent' && (
        <StudentManagementModal
          isOpen={isStudentModalOpen}
          parent={selectedParent}
          allStudents={allStudents}
          onOpenChange={onStudentModalOpenChange}
          onAddStudent={onAddStudent}
          onRemoveStudent={onRemoveStudent}
          onTogglePrimary={onTogglePrimary}
        />
      )}
    </>
  );
};

export default ParentModals;
