
import React from 'react';
import { ParentWithStudents } from '@/types/parent';
import { Child } from '@/types';
import AddParentSheet from './AddParentSheet';
import EditParentSheet from './EditParentSheet';
import StudentManagementModal from './StudentManagementModal';

interface ParentModalsProps {
  // Add Parent Sheet
  isAddSheetOpen: boolean;
  newParent: any;
  onNewParentChange: (parent: any) => void;
  onAddParentSubmit: (e: React.FormEvent) => Promise<void>;
  onAddSheetOpenChange: (open: boolean) => void;

  // Edit Parent Sheet
  isEditSheetOpen: boolean;
  editingParent: ParentWithStudents | null;
  onEditingParentChange: (parent: ParentWithStudents) => void;
  onEditParentSubmit: (e: React.FormEvent) => Promise<void>;
  onEditSheetOpenChange: (open: boolean) => void;

  // Student Management Modal
  isStudentModalOpen: boolean;
  selectedParent: ParentWithStudents | null;
  allStudents: Child[];
  onStudentModalOpenChange: () => void;
  onAddStudent: (parentId: string, studentId: string, relationship: string, isPrimary: boolean) => Promise<void>;
  onRemoveStudent: (studentRelationshipId: string, parentId: string, studentId: string) => void;
  onTogglePrimary: (studentRelationshipId: string, parentId: string, currentIsPrimary: boolean, currentRelationship?: string) => void;
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
}) => {
  return (
    <>
      <AddParentSheet
        isOpen={isAddSheetOpen}
        onOpenChange={onAddSheetOpenChange}
        newParent={newParent}
        onNewParentChange={onNewParentChange}
        onSubmit={onAddParentSubmit}
      />

      {editingParent && (
        <EditParentSheet
          isOpen={isEditSheetOpen}
          onOpenChange={onEditSheetOpenChange}
          selectedParent={editingParent}
          onSelectedParentChange={onEditingParentChange}
          onSubmit={onEditParentSubmit}
        />
      )}
      
      <StudentManagementModal
        isOpen={isStudentModalOpen}
        onOpenChange={onStudentModalOpenChange}
        parent={selectedParent}
        allStudents={allStudents}
        onAddStudent={onAddStudent}
        onRemoveStudent={onRemoveStudent}
        onTogglePrimary={onTogglePrimary}
      />
    </>
  );
};

export default ParentModals;
