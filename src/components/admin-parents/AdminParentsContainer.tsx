
import React from 'react';
import { ParentWithStudents } from '@/types/parent';
import { Child } from '@/types';
import AdminParentsLayout from './AdminParentsLayout';

interface AdminParentsContainerProps {
  userRole?: 'parent' | 'teacher' | 'admin' | 'superadmin';
  filteredParentsByRole: ParentWithStudents[];
  isLoading: boolean;
  allStudents: Child[];
  parents: ParentWithStudents[];
  setParents: (parents: ParentWithStudents[]) => void;
  onParentAdded: (newParent: ParentWithStudents) => void;
  onParentUpdated: (updatedParent: ParentWithStudents) => void;
  onImportCompleted: () => void;
  handleDeleteParent: (parentId: string) => Promise<void>;
  handleResetParentPassword?: (email: string, name: string) => Promise<void>;
  handleReactivateParent?: (parentId: string, parentName: string) => void;
  getHeaderTitle: () => string;
  getHeaderDescription: () => string;
  loadingProgress?: string;
  statusFilter?: 'active' | 'deleted' | 'all';
  onStatusFilterChange?: (filter: 'active' | 'deleted' | 'all') => void;
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
  handleResetParentPassword,
  handleReactivateParent,
  getHeaderTitle,
  getHeaderDescription,
  loadingProgress,
  statusFilter,
  onStatusFilterChange,
}) => {
  return (
    <AdminParentsLayout
      userRole={userRole}
      filteredParentsByRole={filteredParentsByRole}
      isLoading={isLoading}
      allStudents={allStudents}
      parents={parents}
      setParents={setParents}
      onParentAdded={onParentAdded}
      onParentUpdated={onParentUpdated}
      onImportCompleted={onImportCompleted}
      handleDeleteParent={handleDeleteParent}
      handleResetParentPassword={handleResetParentPassword}
      handleReactivateParent={handleReactivateParent}
      getHeaderTitle={getHeaderTitle}
      getHeaderDescription={getHeaderDescription}
      loadingProgress={loadingProgress}
      statusFilter={statusFilter}
      onStatusFilterChange={onStatusFilterChange}
    />
  );
};

export default AdminParentsContainer;
