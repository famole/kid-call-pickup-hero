
import React from 'react';
import AdminParentsContainer from '@/components/admin-parents/AdminParentsContainer';
import ResetPasswordConfirmDialog from '@/components/admin-parents/ResetPasswordConfirmDialog';
import { useAdminFilteredData } from '@/hooks/useAdminFilteredData';
import { useAdminParentsActions } from '@/hooks/useAdminParentsActions';
import { useReactivationActions } from '@/hooks/useReactivationActions';

interface AdminParentsScreenProps {
  userRole?: 'parent' | 'teacher' | 'admin' | 'superadmin' | 'family';
  includedRoles?: ('parent' | 'teacher' | 'admin' | 'superadmin' | 'family' | 'other')[];
}

const AdminParentsScreen: React.FC<AdminParentsScreenProps> = ({ userRole = 'parent', includedRoles }) => {
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
  } = useAdminFilteredData({ userRole, includedRoles });

  const {
    handleDeleteParent,
    handleResetParentPassword,
    confirmResetPassword,
    closeResetPasswordDialog,
    resetPasswordDialog,
    isResettingPassword,
    getUserTypeLabel,
    getHeaderTitle,
    getHeaderDescription,
  } = useAdminParentsActions({ 
    userRole, 
    setParents, 
    onAuthStatusChange: refreshData 
  });

  const {
    handleReactivateParent,
  } = useReactivationActions({ onParentUpdated, refreshData });

  return (
    <>
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
        onAuthStatusRefresh={refreshData}
      />
      
      <ResetPasswordConfirmDialog
        open={resetPasswordDialog.isOpen}
        onOpenChange={closeResetPasswordDialog}
        onConfirm={confirmResetPassword}
        parentName={resetPasswordDialog.name}
        userTypeLabel={getUserTypeLabel()}
        isLoading={isResettingPassword}
      />
    </>
  );
};

export default AdminParentsScreen;
