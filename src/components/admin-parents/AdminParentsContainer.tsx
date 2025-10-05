
import React from 'react';
import { ParentWithStudents } from '@/types/parent';
import { Child } from '@/types';
import AdminParentsLayout from './AdminParentsLayout';

interface AdminParentsContainerProps {
  userRole?: 'parent' | 'teacher' | 'admin' | 'superadmin' | 'family';
  filteredParentsByRole: ParentWithStudents[];
  isLoading: boolean;
  allStudents: Child[];
  parents: ParentWithStudents[];
  setParents: (parents: ParentWithStudents[]) => void;
  onParentAdded: (newParent: ParentWithStudents) => void;
  onParentUpdated: (updatedParent: ParentWithStudents) => void;
  onImportCompleted: () => void;
  handleDeleteParent: (parentId: string) => Promise<void>;
  handleResetParentPassword?: (identifier: string, name: string) => void;
  handleReactivateParent?: (parentId: string, parentName: string) => void;
  getHeaderTitle: () => string;
  getHeaderDescription: () => string;
  loadingProgress?: string;
  statusFilter?: 'active' | 'deleted' | 'all';
  onStatusFilterChange?: (filter: 'active' | 'deleted' | 'all') => void;
  onAuthStatusRefresh?: () => void;
  // Server-side pagination and search
  searchTerm?: string;
  onSearchChange?: (search: string) => void;
  onSearchSubmit?: () => void;
  currentPage?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
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
  onAuthStatusRefresh,
  searchTerm,
  onSearchChange,
  onSearchSubmit,
  currentPage,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
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
      onAuthStatusRefresh={onAuthStatusRefresh}
      searchTerm={searchTerm}
      onSearchChange={onSearchChange}
      onSearchSubmit={onSearchSubmit}
      currentPage={currentPage}
      pageSize={pageSize}
      totalCount={totalCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
    />
  );
};

export default AdminParentsContainer;
