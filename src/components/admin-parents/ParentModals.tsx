
import React from 'react';
import AddParentSheet from './AddParentSheet';
import EditParentSheet from './EditParentSheet';
import StudentManagementModal from './StudentManagementModal';
import AddStudentToParentDialog from './AddStudentToParentDialog';
import { ParentWithStudents, ParentInput } from '@/types/parent';
import { Child, Class } from '@/types';

interface ParentModalsProps {
  // Add Parent Sheet
  isAddSheetOpen: boolean;
  newParent: ParentInput;
  onNewParentChange: (parent: ParentInput) => void;
  onAddParentSubmit: (e?: React.FormEvent) => Promise<void>;
  onAddSheetOpenChange: (isOpen: boolean) => void;

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

  // Add Student to Parent Dialog
  isAddStudentDialogOpen: boolean;
  addStudentForm: any; // Using any for now since it's a complex hook type
  classes: Class[];

  userRole?: 'parent' | 'teacher' | 'admin' | 'superadmin';
}

const ParentModals: React.FC<ParentModalsProps> = ({
  // Add Parent Sheet props
  isAddSheetOpen,
  newParent,
  onNewParentChange,
  onAddParentSubmit,
  onAddSheetOpenChange,

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

  // Add Student to Parent Dialog props
  isAddStudentDialogOpen,
  addStudentForm,
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

      <AddStudentToParentDialog
        isOpen={isAddStudentDialogOpen}
        onOpenChange={addStudentForm.closeAddStudentDialog}
        selectedParentName={addStudentForm.targetParentName}
        allStudents={allStudents}
        classes={classes}
        selectedStudentId={addStudentForm.selectedStudentId}
        onSelectedStudentIdChange={addStudentForm.setSelectedStudentId}
        relationship={addStudentForm.relationship}
        onRelationshipChange={addStudentForm.setRelationship}
        isPrimary={addStudentForm.isPrimary}
        onIsPrimaryChange={addStudentForm.setIsPrimary}
        onSubmit={addStudentForm.handleAddStudentToParentSubmit}
        searchTerm={addStudentForm.searchTerm}
        onSearchTermChange={addStudentForm.setSearchTerm}
        selectedClassFilter={addStudentForm.selectedClassFilter}
        onClassFilterChange={addStudentForm.setSelectedClassFilter}
        filteredStudents={addStudentForm.availableStudents}
      />
    </>
  );
};

export default ParentModals;
