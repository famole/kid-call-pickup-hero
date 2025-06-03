
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { PlusCircle } from "lucide-react";
import { ParentWithStudents } from '@/types/parent';
import { Child } from '@/types';
import {
  getParentsWithStudents,
  deleteParent,
} from '@/services/parentService';
import { getAllStudents } from '@/services/studentService';

// Import components and hooks
import AddParentSheet from '@/components/admin-parents/AddParentSheet';
import EditParentSheet from '@/components/admin-parents/EditParentSheet';
import ImportParentsDialog from '@/components/admin-parents/ImportParentsDialog';
import StudentManagementModal from '@/components/admin-parents/StudentManagementModal';
import ParentTableRow from '@/components/admin-parents/ParentTableRow';
import ParentSearch from '@/components/admin-parents/ParentSearch';

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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Parents Management</CardTitle>
            <CardDescription>Manage parents and their associated students</CardDescription>
          </div>
          <div className="flex space-x-2">
            <ImportParentsDialog
              isOpen={importParentsHook.isImportDialogOpen}
              onOpenChange={openState => openState ? importParentsHook.openImportDialog() : importParentsHook.closeImportDialog()}
              onFileChange={importParentsHook.handleImportFileChange}
              onSubmit={importParentsHook.handleImportSubmit}
            />
            <Button onClick={addParentForm.openAddParentSheet}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Parent
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <ParentSearch
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Loading parents...</TableCell>
                </TableRow>
              ) : filteredParents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    {searchTerm ? `No parents found matching "${searchTerm}".` : "No parents found. Add one to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredParents.map((parent) => (
                  <ParentTableRow
                    key={parent.id}
                    parent={parent}
                    onEdit={() => editParentForm.openEditParentSheet(parent)}
                    onDelete={handleDeleteParent}
                    onManageStudents={() => studentManagement.openStudentModal(parent)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AddParentSheet
        isOpen={addParentForm.isAddSheetOpen}
        onOpenChange={openState => openState ? addParentForm.openAddParentSheet() : addParentForm.closeAddParentSheet()}
        newParent={addParentForm.newParent}
        onNewParentChange={addParentForm.handleNewParentChange}
        onSubmit={addParentForm.handleAddParentSubmit}
      />

      {editParentForm.editingParent && (
        <EditParentSheet
          isOpen={editParentForm.isEditSheetOpen}
          onOpenChange={openState => openState ? editParentForm.openEditParentSheet(editParentForm.editingParent!) : editParentForm.closeEditParentSheet()}
          selectedParent={editParentForm.editingParent}
          onSelectedParentChange={editParentForm.handleEditingParentChange}
          onSubmit={editParentForm.handleEditParentSubmit}
        />
      )}
      
      <StudentManagementModal
        isOpen={studentManagement.isStudentModalOpen}
        onOpenChange={studentManagement.closeStudentModal}
        parent={studentManagement.selectedParent}
        allStudents={allStudents}
        onAddStudent={studentManagement.handleAddStudentToParent}
        onRemoveStudent={studentManagement.handleRemoveStudent}
        onTogglePrimary={studentManagement.handleTogglePrimary}
      />
    </div>
  );
};

export default AdminParentsScreen;
