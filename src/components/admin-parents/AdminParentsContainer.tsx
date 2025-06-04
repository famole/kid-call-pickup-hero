
import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { ParentWithStudents } from '@/types/parent';
import { Child } from '@/types';

// Import components
import ParentsHeader from './ParentsHeader';
import ParentSearch from './ParentSearch';
import ParentClassFilter from './ParentClassFilter';
import ParentsTable from './ParentsTable';
import ParentModals from './ParentModals';
import LoadingIndicator from './LoadingIndicator';

// Import hooks
import { useAddParentForm } from '@/hooks/useAddParentForm';
import { useEditParentForm } from '@/hooks/useEditParentForm';
import { useImportParents } from '@/hooks/useImportParents';
import { useStudentManagement } from '@/hooks/useStudentManagement';
import { useParentSearch } from '@/hooks/useParentSearch';
import { useParentClassFilter } from '@/hooks/useParentClassFilter';
import { useAddStudentToParentForm } from '@/hooks/useAddStudentToParentForm';

interface AdminParentsContainerProps {
  userRole?: 'parent' | 'teacher' | 'admin';
  filteredParentsByRole: ParentWithStudents[];
  isLoading: boolean;
  allStudents: Child[];
  parents: ParentWithStudents[];
  setParents: (parents: ParentWithStudents[]) => void;
  onParentAdded: (newParent: ParentWithStudents) => void;
  onParentUpdated: (updatedParent: ParentWithStudents) => void;
  onImportCompleted: () => void;
  handleDeleteParent: (parentId: string) => Promise<void>;
  getHeaderTitle: () => string;
  getHeaderDescription: () => string;
  loadingProgress?: string;
}

const AdminParentsContainer: React.FC<AdminParentsContainerProps> = ({
  userRole = 'parent',
  filteredParentsByRole,
  isLoading,
  allStudents,
  parents,
  setParents,
  onParentAdded,
  onParentUpdated,
  onImportCompleted,
  handleDeleteParent,
  getHeaderTitle,
  getHeaderDescription,
  loadingProgress,
}) => {
  // Use the class filter hook
  const { 
    classes, 
    selectedClassId, 
    setSelectedClassId, 
    filteredParentsByClass,
    isLoadingClasses 
  } = useParentClassFilter({ parents: filteredParentsByRole });

  // Use the search hook with class-filtered parents
  const { searchTerm, setSearchTerm, filteredParents } = useParentSearch(filteredParentsByClass);

  // Initialize hooks with role-specific settings
  const addParentForm = useAddParentForm({ 
    onParentAdded,
    defaultRole: userRole 
  });
  const editParentForm = useEditParentForm({ onParentUpdated });
  const importParentsHook = useImportParents({ onImportCompleted });
  const studentManagement = useStudentManagement({ 
    allStudents, 
    onParentUpdated, 
    parents, 
    setParents
  });

  // Add the new hook for adding students to parents
  const addStudentToParentForm = useAddStudentToParentForm({
    allStudents,
    classes,
    onStudentAddedToParent: onParentUpdated,
  });

  // Wrapper functions to match the expected signatures in ParentModals
  const handleAddStudentWrapper = async (studentId: string, relationship: string) => {
    if (!studentManagement.selectedParent) return;
    await studentManagement.handleAddStudentToParent(
      studentManagement.selectedParent.id,
      studentId,
      relationship,
      false // Default isPrimary to false
    );
  };

  const handleRemoveStudentWrapper = async (studentId: string) => {
    if (!studentManagement.selectedParent) return;
    const student = studentManagement.selectedParent.students?.find(s => s.id === studentId);
    if (!student) return;
    await studentManagement.handleRemoveStudent(
      student.parentRelationshipId,
      studentManagement.selectedParent.id,
      studentId
    );
  };

  const handleTogglePrimaryWrapper = async (studentId: string) => {
    if (!studentManagement.selectedParent) return;
    const student = studentManagement.selectedParent.students?.find(s => s.id === studentId);
    if (!student) return;
    await studentManagement.handleTogglePrimary(
      student.parentRelationshipId,
      studentManagement.selectedParent.id,
      student.isPrimary,
      student.relationship
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto">
        <Card>
          <CardHeader>
            <ParentsHeader
              onAddParent={() => {}} // Disable during loading
              isImportDialogOpen={false}
              onOpenImportDialog={() => {}}
              onCloseImportDialog={() => {}}
              onImportFileChange={() => {}}
              onImportSubmit={() => Promise.resolve()} // Fixed: Return Promise<void>
              userRole={userRole}
              headerTitle={getHeaderTitle()}
              headerDescription={getHeaderDescription()}
            />
          </CardHeader>
          <CardContent>
            <LoadingIndicator message={loadingProgress || "Loading parents..."} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <Card>
        <CardHeader>
          <ParentsHeader
            onAddParent={addParentForm.openAddParentSheet}
            isImportDialogOpen={importParentsHook.isImportDialogOpen}
            onOpenImportDialog={importParentsHook.openImportDialog}
            onCloseImportDialog={importParentsHook.closeImportDialog}
            onImportFileChange={importParentsHook.handleImportFileChange}
            onImportSubmit={importParentsHook.handleImportSubmit}
            userRole={userRole}
            headerTitle={getHeaderTitle()}
            headerDescription={getHeaderDescription()}
          />
        </CardHeader>

        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <ParentSearch
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
              />
            </div>
            {userRole === 'parent' && (
              <ParentClassFilter
                classes={classes}
                selectedClassId={selectedClassId}
                onClassChange={setSelectedClassId}
                isLoading={isLoadingClasses}
              />
            )}
          </div>
          
          <ParentsTable
            parents={filteredParents}
            isLoading={false} // We handle loading above
            searchTerm={searchTerm}
            onEditParent={editParentForm.openEditParentSheet}
            onDeleteParent={handleDeleteParent}
            onManageStudents={studentManagement.openStudentModal}
            onAddStudentToParent={addStudentToParentForm.openAddStudentDialog}
            userRole={userRole}
          />
        </CardContent>
      </Card>

      <ParentModals
        isAddSheetOpen={addParentForm.isAddSheetOpen}
        newParent={addParentForm.newParent}
        onNewParentChange={addParentForm.handleNewParentChange}
        onAddParentSubmit={() => addParentForm.handleAddParentSubmit({} as React.FormEvent)}
        onAddSheetOpenChange={openState => openState ? addParentForm.openAddParentSheet() : addParentForm.closeAddParentSheet()}
        isEditSheetOpen={editParentForm.isEditSheetOpen}
        editingParent={editParentForm.editingParent}
        onEditingParentChange={editParentForm.handleEditingParentChange}
        onEditParentSubmit={() => editParentForm.handleEditParentSubmit({} as React.FormEvent)}
        onEditSheetOpenChange={openState => openState ? (editParentForm.editingParent && editParentForm.openEditParentSheet(editParentForm.editingParent)) : editParentForm.closeEditParentSheet()}
        isStudentModalOpen={studentManagement.isStudentModalOpen}
        selectedParent={studentManagement.selectedParent}
        allStudents={allStudents}
        onStudentModalOpenChange={studentManagement.closeStudentModal}
        onAddStudent={handleAddStudentWrapper}
        onRemoveStudent={handleRemoveStudentWrapper}
        onTogglePrimary={handleTogglePrimaryWrapper}
        // Add student to parent form props
        isAddStudentDialogOpen={addStudentToParentForm.isStudentDialogOpen}
        addStudentForm={addStudentToParentForm}
        classes={classes}
        userRole={userRole}
      />
    </div>
  );
};

export default AdminParentsContainer;
