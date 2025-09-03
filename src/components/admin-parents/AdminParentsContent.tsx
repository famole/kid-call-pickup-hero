
import React from 'react';
import { CardContent } from "@/components/ui/card";
import { ParentWithStudents } from '@/types/parent';
import { Child, Class } from '@/types';
import { ParentAuthStatus } from '@/services/authStatusService';

// Import components
import ParentSearch from './ParentSearch';
import ParentsTable from './ParentsTable';
import DeletedItemsFilter from './DeletedItemsFilter';
import PaginationControls from './PaginationControls';

// Import hooks
import { useParentSearch } from '@/hooks/useParentSearch';
import { useParentClassFilter } from '@/hooks/useParentClassFilter';
import { useAdminPagination } from '@/hooks/useAdminPagination';

interface AdminParentsContentProps {
  userRole: 'parent' | 'teacher' | 'admin' | 'superadmin' | 'family';
  filteredParentsByRole: ParentWithStudents[];
  allStudents: Child[];
  onEditParent: (parent: ParentWithStudents) => void;
  onDeleteParent: (parentId: string) => Promise<void>;
  onResetParentPassword?: (identifier: string, name: string) => void;
  onManageStudents: (parent: ParentWithStudents) => void;
  onReactivateParent?: (parentId: string, parentName: string) => void;
  statusFilter?: 'active' | 'deleted' | 'all';
  onStatusFilterChange?: (filter: 'active' | 'deleted' | 'all') => void;
  authStatuses?: Map<string, ParentAuthStatus>;
}

const AdminParentsContent: React.FC<AdminParentsContentProps> = ({
  userRole,
  filteredParentsByRole,
  allStudents,
  onEditParent,
  onDeleteParent,
  onResetParentPassword,
  onManageStudents,
  onReactivateParent,
  statusFilter = 'active',
  onStatusFilterChange,
  authStatuses,
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

  // Use pagination hook
  const {
    paginatedData: paginatedParents,
    totalItems,
    totalPages,
    currentPage,
    pageSize,
    startIndex,
    endIndex,
    goToPage,
    changePageSize,
    hasNextPage,
    hasPreviousPage,
  } = useAdminPagination({ data: filteredParents });

  const getItemType = (): 'parents' | 'teachers' | 'students' | 'admins' | 'superadmins' => {
    switch (userRole) {
      case 'teacher': return 'teachers';
      case 'admin': return 'admins';
      case 'superadmin': return 'superadmins';
      default: return 'parents';
    }
  };

  return (
    <CardContent>
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1">
          <ParentSearch
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedClassId={selectedClassId}
            onClassFilterChange={setSelectedClassId}
            classList={classes}
          />
        </div>
        {onStatusFilterChange && (
          <DeletedItemsFilter
            value={statusFilter}
            onValueChange={onStatusFilterChange}
            itemType={getItemType()}
          />
        )}
      </div>
      
      <ParentsTable
        parents={paginatedParents}
        isLoading={false}
        searchTerm={searchTerm}
        onEditParent={onEditParent}
        onDeleteParent={onDeleteParent}
        onManageStudents={onManageStudents}
        onReactivateParent={onReactivateParent}
        onResetParentPassword={onResetParentPassword}
        userRole={userRole}
        authStatuses={authStatuses}
        totalItems={totalItems}
      />

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={totalItems}
        startIndex={startIndex}
        endIndex={endIndex}
        onPageChange={goToPage}
        onPageSizeChange={changePageSize}
        hasNextPage={hasNextPage}
        hasPreviousPage={hasPreviousPage}
        itemType={getItemType()}
      />
    </CardContent>
  );
};

export default AdminParentsContent;
