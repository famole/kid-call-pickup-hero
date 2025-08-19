
import React from 'react';
import AdminParentsContainer from '@/components/admin-parents/AdminParentsContainer';
import { useAdminFilteredData } from '@/hooks/useAdminFilteredData';
import { useAdminParentsActions } from '@/hooks/useAdminParentsActions';
import { useReactivationActions } from '@/hooks/useReactivationActions';

interface AdminParentsScreenProps {
  userRole?: 'parent' | 'teacher' | 'admin' | 'superadmin';
}

const AdminParentsScreen: React.FC<AdminParentsScreenProps> = ({ userRole = 'parent' }) => {
  const {
    parents,
    setParents,
    filteredParentsByRole,
    isLoading,
    allStudents,
    loadingProgress,
    onParentAdded,
    onParentUpdated,
    onImportCompleted,
    statusFilter,
    handleStatusFilterChange,
    refreshData,
  } = useAdminFilteredData({ userRole });

  const {
    handleDeleteParent,
    handleResetParentPassword,
    getHeaderTitle,
    getHeaderDescription,
  } = useAdminParentsActions({ userRole, setParents });

  const {
    handleReactivateParent,
  } = useReactivationActions({ onParentUpdated, refreshData });

  return (
    <AdminParentsContainer
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
      onStatusFilterChange={handleStatusFilterChange}
    />
  );
};

export default AdminParentsScreen;
