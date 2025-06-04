import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ParentWithStudents } from '@/types/parent';
import { Child } from '@/types';
import {
  getParentsWithStudents,
  deleteParent,
} from '@/services/parentService';
import { getAllStudents } from '@/services/studentService';

// Import components
import ParentsHeader from '@/components/admin-parents/ParentsHeader';
import ParentSearch from '@/components/admin-parents/ParentSearch';
import ParentsTable from '@/components/admin-parents/ParentsTable';
import ParentModals from '@/components/admin-parents/ParentModals';

// Import hooks
import { useAddParentForm } from '@/hooks/useAddParentForm';
import { useEditParentForm } from '@/hooks/useEditParentForm';
import { useImportParents } from '@/hooks/useImportParents';
import { useStudentManagement } from '@/hooks/useStudentManagement';
import { useParentSearch } from '@/hooks/useParentSearch';

interface AdminParentsScreenProps {
  userRole?: 'parent' | 'teacher' | 'admin';
}

const AdminParentsScreen: React.FC<AdminParentsScreenProps> = ({ userRole = 'parent' }) => {
  const { toast } = useToast();
  const [parents, setParents] = useState<ParentWithStudents[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allStudents, setAllStudents] = useState<Child[]>([]);

  // Filter parents by role
  const filteredParentsByRole = parents.filter(parent => 
    parent.role === userRole || (!parent.role && userRole === 'parent')
  );

  // Use the search hook with filtered parents
  const { searchTerm, setSearchTerm, filteredParents } = useParentSearch(filteredParentsByRole);

  const loadParents = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getParentsWithStudents();
      setParents(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load parents data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const loadStudents = useCallback(async () => {
    try {
      const studentsData = await getAllStudents();
      setAllStudents(studentsData);
    } catch (error) {
      console.error('Failed to load students:', error);
      toast({
        title: "Error",
        description: "Failed to load students data",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    loadParents();
    loadStudents();
  }, [loadParents, loadStudents]);

  // Callbacks for hooks
  const onParentAdded = (newParent: ParentWithStudents) => {
    setParents(prev => [...prev, newParent]);
  };

  const onParentUpdated = (updatedParent: ParentWithStudents) => {
    setParents(prev => prev.map(p => p.id === updatedParent.id ? updatedParent : p));
  };

  const onImportCompleted = () => {
    loadParents();
  };
  
  // Initialize hooks with role-specific settings
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

  // Wrapper functions to match the expected signatures in ParentModals
  const handleAddStudentWrapper = async (studentId: string, relationship: string) => {
    if (!studentManagement.selectedParent) return;
    await studentManagement.handleAddStudentToParent(
      studentManagement.selectedParent.id,
      studentId,
      relationship,
      false // Default isPrimary to false
    );
  };

  const handleRemoveStudentWrapper = async (studentId: string) => {
    if (!studentManagement.selectedParent) return;
    const student = studentManagement.selectedParent.students?.find(s => s.id === studentId);
    if (!student) return;
    await studentManagement.handleRemoveStudent(
      student.parentRelationshipId,
      studentManagement.selectedParent.id,
      studentId
    );
  };

  const handleTogglePrimaryWrapper = async (studentId: string) => {
    if (!studentManagement.selectedParent) return;
    const student = studentManagement.selectedParent.students?.find(s => s.id === studentId);
    if (!student) return;
    await studentManagement.handleTogglePrimary(
      student.parentRelationshipId,
      studentManagement.selectedParent.id,
      student.isPrimary,
      student.relationship
    );
  };

  // Handle parent deletion
  const handleDeleteParent = async (parentId: string) => {
    const userTypeLabel = userRole === 'teacher' ? 'teacher' : userRole === 'admin' ? 'admin' : 'parent';
    if (!confirm(`Are you sure you want to delete this ${userTypeLabel}? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteParent(parentId);
      setParents(prev => prev.filter(parent => parent.id !== parentId));
      toast({
        title: "Success",
        description: `${userTypeLabel.charAt(0).toUpperCase() + userTypeLabel.slice(1)} has been deleted`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete ${userTypeLabel}`,
        variant: "destructive",
      });
    }
  };

  const getHeaderTitle = () => {
    switch (userRole) {
      case 'teacher':
        return 'Teachers Management';
      case 'admin':
        return 'Admins Management';
      default:
        return 'Parents Management';
    }
  };

  const getHeaderDescription = () => {
    switch (userRole) {
      case 'teacher':
        return 'Manage teacher accounts and permissions';
      case 'admin':
        return 'Manage admin accounts and permissions';
      default:
        return 'Manage parent accounts and student relationships';
    }
  };

  return (
    <div className="container mx-auto">
      <Card>
        <CardHeader>
          <ParentsHeader
            onAddParent={addParentForm.openAddParentSheet}
            isImportDialogOpen={importParentsHook.isImportDialogOpen}
            onOpenImportDialog={importParentsHook.openImportDialog}
            onCloseImportDialog={importParentsHook.closeImportDialog}
            onImportFileChange={importParentsHook.handleImportFileChange}
            onImportSubmit={importParentsHook.handleImportSubmit}
            userRole={userRole}
            headerTitle={getHeaderTitle()}
            headerDescription={getHeaderDescription()}
          />
        </CardHeader>

        <CardContent>
          <ParentSearch
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
          
          <ParentsTable
            parents={filteredParents}
            isLoading={isLoading}
            searchTerm={searchTerm}
            onEditParent={editParentForm.openEditParentSheet}
            onDeleteParent={handleDeleteParent}
            onManageStudents={studentManagement.openStudentModal}
            userRole={userRole}
          />
        </CardContent>
      </Card>

      <ParentModals
        isAddSheetOpen={addParentForm.isAddSheetOpen}
        newParent={addParentForm.newParent}
        onNewParentChange={addParentForm.handleNewParentChange}
        onAddParentSubmit={addParentForm.handleAddParentSubmit}
        onAddSheetOpenChange={openState => openState ? addParentForm.openAddParentSheet() : addParentForm.closeAddParentSheet()}
        isEditSheetOpen={editParentForm.isEditSheetOpen}
        editingParent={editParentForm.editingParent}
        onEditingParentChange={editParentForm.handleEditingParentChange}
        onEditParentSubmit={editParentForm.handleEditParentSubmit}
        onEditSheetOpenChange={openState => openState ? (editParentForm.editingParent && editParentForm.openEditParentSheet(editParentForm.editingParent)) : editParentForm.closeEditParentSheet()}
        isStudentModalOpen={studentManagement.isStudentModalOpen}
        selectedParent={studentManagement.selectedParent}
        allStudents={allStudents}
        onStudentModalOpenChange={studentManagement.closeStudentModal}
        onAddStudent={handleAddStudentWrapper}
        onRemoveStudent={handleRemoveStudentWrapper}
        onTogglePrimary={handleTogglePrimaryWrapper}
        userRole={userRole}
      />
    </div>
  );
};

export default AdminParentsScreen;
