
import React from 'react';
import { CardContent } from "@/components/ui/card";
import { ParentWithStudents } from '@/types/parent';
import { Child, Class } from '@/types';

// Import components
import ParentSearch from './ParentSearch';
import ParentClassFilter from './ParentClassFilter';
import ParentsTable from './ParentsTable';

// Import hooks
import { useParentSearch } from '@/hooks/useParentSearch';
import { useParentClassFilter } from '@/hooks/useParentClassFilter';

interface AdminParentsContentProps {
  userRole: 'parent' | 'teacher' | 'admin' | 'superadmin';
  filteredParentsByRole: ParentWithStudents[];
  allStudents: Child[];
  onEditParent: (parent: ParentWithStudents) => void;
  onDeleteParent: (parentId: string) => Promise<void>;
  onManageStudents: (parent: ParentWithStudents) => void;
  onAddStudentToParent: (parent: ParentWithStudents) => void;
}

const AdminParentsContent: React.FC<AdminParentsContentProps> = ({
  userRole,
  filteredParentsByRole,
  allStudents,
  onEditParent,
  onDeleteParent,
  onManageStudents,
  onAddStudentToParent,
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
      </div>
      
      <ParentsTable
        parents={filteredParents}
        isLoading={false}
        searchTerm={searchTerm}
        onEditParent={onEditParent}
        onDeleteParent={onDeleteParent}
        onManageStudents={onManageStudents}
        onAddStudentToParent={onAddStudentToParent}
        userRole={userRole}
      />
    </CardContent>
  );
};

export default AdminParentsContent;
