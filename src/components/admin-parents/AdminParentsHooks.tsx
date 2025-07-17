
import { useAddParentForm } from '@/hooks/useAddParentForm';
import { useEditParentForm } from '@/hooks/useEditParentForm';
import { useImportParents } from '@/hooks/useImportParents';
import { useStudentManagement } from '@/hooks/useStudentManagement';
import { ParentWithStudents } from '@/types/parent';
import { Child, Class } from '@/types';

interface UseAdminParentsHooksProps {
  userRole: 'parent' | 'teacher' | 'admin' | 'superadmin';
  allStudents: Child[];
  classes: Class[];
  parents: ParentWithStudents[];
  setParents: (parents: ParentWithStudents[]) => void;
  onParentAdded: (newParent: ParentWithStudents) => void;
  onParentUpdated: (updatedParent: ParentWithStudents) => void;
  onImportCompleted: () => void;
}

export const useAdminParentsHooks = ({
  userRole,
  allStudents,
  classes,
  parents,
  setParents,
  onParentAdded,
  onParentUpdated,
  onImportCompleted,
}: UseAdminParentsHooksProps) => {
  // Initialize all form hooks
  const addParentForm = useAddParentForm({ 
    onParentAdded,
    defaultRole: userRole 
  });
  
  const editParentForm = useEditParentForm({ onParentUpdated });
  
  const importParentsHook = useImportParents({ onImportCompleted });
  
  const studentManagement = useStudentManagement({ 
    allStudents, 
    onParentUpdated, 
    parents, 
    setParents
  });


  return {
    addParentForm,
    editParentForm,
    importParentsHook,
    studentManagement,
  };
};
