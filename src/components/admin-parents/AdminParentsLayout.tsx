
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
import { getAllClasses } from '@/services/classService';
import { useParentAuthStatuses } from '@/hooks/useParentAuthStatuses';
import { logger } from '@/utils/logger';

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
  handleResetParentPassword?: (email: string, name: string) => void;
  handleReactivateParent?: (parentId: string, parentName: string) => void;
  getHeaderTitle: () => string;
  getHeaderDescription: () => string;
  loadingProgress?: string;
  statusFilter?: 'active' | 'deleted' | 'all';
  onStatusFilterChange?: (filter: 'active' | 'deleted' | 'all') => void;
  onAuthStatusRefresh?: () => void;
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
  handleResetParentPassword,
  handleReactivateParent,
  getHeaderTitle,
  getHeaderDescription,
  loadingProgress,
  onAuthStatusRefresh,
}) => {
  const [classes, setClasses] = React.useState<Class[]>([]);
  
  // Fetch auth statuses for admins only
  const { authStatuses, refetchAuthStatuses } = useParentAuthStatuses();
  
  // Use onAuthStatusRefresh from props if provided, otherwise use local refetch
  const handleAuthStatusRefresh = onAuthStatusRefresh || refetchAuthStatuses;

  // Load classes
  React.useEffect(() => {
    const loadClasses = async () => {
      try {
        const classesData = await getAllClasses();
        setClasses(classesData);
      } catch (error) {
        logger.error('Failed to load classes:', error);
      }
    };
    loadClasses();
  }, []);
  // Get all hooks
  const hooks = useAdminParentsHooks({
    userRole,
    allStudents,
    classes,
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
          onResetParentPassword={handleResetParentPassword}
          onReactivateParent={handleReactivateParent}
          onManageStudents={hooks.studentManagement.openStudentModal}
          authStatuses={authStatuses}
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
        classes={classes}
        userRole={userRole}
      />
    </div>
  );
};

export default AdminParentsLayout;
