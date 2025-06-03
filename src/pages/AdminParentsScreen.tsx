
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

const AdminParentsScreen = () => {
  const { toast } = useToast();
  const [parents, setParents] = useState<ParentWithStudents[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allStudents, setAllStudents] = useState<Child[]>([]);

  // Use the search hook
  const { searchTerm, setSearchTerm, filteredParents } = useParentSearch(parents);

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
  
  // Initialize hooks
  const addParentForm = useAddParentForm({ onParentAdded });
  const editParentForm = useEditParentForm({ onParentUpdated });
  const importParentsHook = useImportParents({ onImportCompleted });
  const studentManagement = useStudentManagement({ 
    allStudents, 
    onParentUpdated, 
    parents, 
    setParents 
  });

  // Handle parent deletion
  const handleDeleteParent = async (parentId: string) => {
    if (!confirm("Are you sure you want to delete this parent? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteParent(parentId);
      setParents(prev => prev.filter(parent => parent.id !== parentId));
      toast({
        title: "Success",
        description: "Parent has been deleted",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete parent",
        variant: "destructive",
      });
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
        onAddStudent={studentManagement.handleAddStudentToParent}
        onRemoveStudent={studentManagement.handleRemoveStudent}
        onTogglePrimary={studentManagement.handleTogglePrimary}
      />
    </div>
  );
};

export default AdminParentsScreen;
