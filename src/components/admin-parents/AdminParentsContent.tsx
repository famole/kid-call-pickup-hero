
import React from 'react';
import { CardContent } from "@/components/ui/card";
import { ParentWithStudents } from '@/types/parent';
import { Child, Class } from '@/types';
import { ParentAuthStatus } from '@/services/authStatusService';

// Import components
import ParentSearch from './ParentSearch';
import ParentClassFilter from './ParentClassFilter';
import ParentsTable from './ParentsTable';
import DeletedItemsFilter from './DeletedItemsFilter';

// Import hooks
import { useParentSearch } from '@/hooks/useParentSearch';
import { useParentClassFilter } from '@/hooks/useParentClassFilter';

interface AdminParentsContentProps {
  userRole: 'parent' | 'teacher' | 'admin' | 'superadmin';
  filteredParentsByRole: ParentWithStudents[];
  allStudents: Child[];
  onEditParent: (parent: ParentWithStudents) => void;
  onDeleteParent: (parentId: string) => Promise<void>;
  onResetParentPassword?: (email: string, name: string) => Promise<void>;
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
        {onStatusFilterChange && (
          <DeletedItemsFilter
            value={statusFilter}
            onValueChange={onStatusFilterChange}
            itemType={getItemType()}
          />
        )}
      </div>
      
      <ParentsTable
        parents={filteredParents}
        isLoading={false}
        searchTerm={searchTerm}
        onEditParent={onEditParent}
        onDeleteParent={onDeleteParent}
        onManageStudents={onManageStudents}
        onReactivateParent={onReactivateParent}
        onResetParentPassword={onResetParentPassword}
        userRole={userRole}
        authStatuses={authStatuses}
      />
    </CardContent>
  );
};

export default AdminParentsContent;
