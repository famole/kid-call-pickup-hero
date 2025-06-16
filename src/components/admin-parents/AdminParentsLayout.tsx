
import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { ParentWithStudents } from '@/types/parent';
import { Child, Class } from '@/types';

// Import components
import ParentsHeader from './ParentsHeader';
import AdminParentsContent from './AdminParentsContent';
import ParentModals from './ParentModals';
import LoadingIndicator from './LoadingIndicator';

// Import custom hooks and wrappers
import { useAdminParentsHooks } from './AdminParentsHooks';
import { createStudentWrappers } from './AdminParentsWrappers';

interface AdminParentsLayoutProps {
  userRole: 'parent' | 'teacher' | 'admin' | 'superadmin';
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

const AdminParentsLayout: React.FC<AdminParentsLayoutProps> = ({
  userRole,
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
  // Get all hooks
  const hooks = useAdminParentsHooks({
    userRole,
    allStudents,
    classes: [], // Will be populated by useParentClassFilter
    parents,
    setParents,
    onParentAdded,
    onParentUpdated,
    onImportCompleted,
  });

  // Create wrapper functions
  const wrappers = createStudentWrappers({ 
    studentManagement: hooks.studentManagement 
  });

  if (isLoading) {
    return (
      <div className="container mx-auto">
        <Card>
          <CardHeader>
            <ParentsHeader
              onAddParent={() => {}}
              isImportDialogOpen={false}
              onOpenImportDialog={() => {}}
              onCloseImportDialog={() => {}}
              onImportFileChange={() => {}}
              onImportSubmit={() => Promise.resolve()}
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
            onAddParent={hooks.addParentForm.openAddParentSheet}
            isImportDialogOpen={hooks.importParentsHook.isImportDialogOpen}
            onOpenImportDialog={hooks.importParentsHook.openImportDialog}
            onCloseImportDialog={hooks.importParentsHook.closeImportDialog}
            onImportFileChange={hooks.importParentsHook.handleImportFileChange}
            onImportSubmit={hooks.importParentsHook.handleImportSubmit}
            userRole={userRole}
            headerTitle={getHeaderTitle()}
            headerDescription={getHeaderDescription()}
          />
        </CardHeader>

        <AdminParentsContent
          userRole={userRole}
          filteredParentsByRole={filteredParentsByRole}
          allStudents={allStudents}
          onEditParent={hooks.editParentForm.openEditParentSheet}
          onDeleteParent={handleDeleteParent}
          onManageStudents={hooks.studentManagement.openStudentModal}
          onAddStudentToParent={hooks.addStudentToParentForm.openAddStudentDialog}
        />
      </Card>

      <ParentModals
        isAddSheetOpen={hooks.addParentForm.isAddSheetOpen}
        newParent={hooks.addParentForm.newParent}
        onNewParentChange={hooks.addParentForm.handleNewParentChange}
        onAddParentSubmit={hooks.addParentForm.handleAddParentSubmit}
        onAddSheetOpenChange={openState => openState ? hooks.addParentForm.openAddParentSheet() : hooks.addParentForm.closeAddParentSheet()}
        isEditSheetOpen={hooks.editParentForm.isEditSheetOpen}
        editingParent={hooks.editParentForm.editingParent}
        onEditingParentChange={hooks.editParentForm.handleEditingParentChange}
        onEditParentSubmit={hooks.editParentForm.handleEditParentSubmit}
        onEditSheetOpenChange={openState => openState ? (hooks.editParentForm.editingParent && hooks.editParentForm.openEditParentSheet(hooks.editParentForm.editingParent)) : hooks.editParentForm.closeEditParentSheet()}
        isStudentModalOpen={hooks.studentManagement.isStudentModalOpen}
        selectedParent={hooks.studentManagement.selectedParent}
        allStudents={allStudents}
        onStudentModalOpenChange={hooks.studentManagement.closeStudentModal}
        onAddStudent={wrappers.handleAddStudentWrapper}
        onRemoveStudent={wrappers.handleRemoveStudentWrapper}
        onTogglePrimary={wrappers.handleTogglePrimaryWrapper}
        isAddStudentDialogOpen={hooks.addStudentToParentForm.isStudentDialogOpen}
        addStudentForm={hooks.addStudentToParentForm}
        classes={[]} // Will be populated by AdminParentsContent
        userRole={userRole}
      />
    </div>
  );
};

export default AdminParentsLayout;
