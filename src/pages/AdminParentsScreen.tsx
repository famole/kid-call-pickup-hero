
import React from 'react';
import AdminParentsContainer from '@/components/admin-parents/AdminParentsContainer';
import { useAdminParentsData } from '@/hooks/useAdminParentsData';
import { useAdminParentsActions } from '@/hooks/useAdminParentsActions';

interface AdminParentsScreenProps {
  userRole?: 'parent' | 'teacher' | 'admin';
}

const AdminParentsScreen: React.FC<AdminParentsScreenProps> = ({ userRole = 'parent' }) => {
  const {
    parents,
    setParents,
    filteredParentsByRole,
    isLoading,
    allStudents,
    onParentAdded,
    onParentUpdated,
    onImportCompleted,
  } = useAdminParentsData({ userRole });

  const {
    handleDeleteParent,
    getHeaderTitle,
    getHeaderDescription,
  } = useAdminParentsActions({ userRole, setParents });

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
      getHeaderTitle={getHeaderTitle}
      getHeaderDescription={getHeaderDescription}
    />
  );
};

export default AdminParentsScreen;
