
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
import { useToast } from "@/components/ui/use-toast"; // Corrected import path
import { PlusCircle } from "lucide-react";
import { ParentWithStudents } from '@/types/parent';
import { Child } from '@/types';
import {
  getParentsWithStudents,
  deleteParent,
  removeStudentFromParent,
  updateStudentParentRelationship,
} from '@/services/parentService';
import { getAllStudents } from '@/services/studentService';

// Import new components and hooks
import AddParentSheet from '@/components/admin-parents/AddParentSheet';
import EditParentSheet from '@/components/admin-parents/EditParentSheet';
import ImportParentsDialog from '@/components/admin-parents/ImportParentsDialog';
import AddStudentToParentDialog from '@/components/admin-parents/AddStudentToParentDialog';
import ParentTableRow from '@/components/admin-parents/ParentTableRow';

import { useAddParentForm } from '@/hooks/useAddParentForm';
import { useEditParentForm } from '@/hooks/useEditParentForm';
import { useImportParents } from '@/hooks/useImportParents';
import { useAddStudentToParentForm } from '@/hooks/useAddStudentToParentForm';

const AdminParentsScreen = () => {
  const { toast } = useToast();
  const [parents, setParents] = useState<ParentWithStudents[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allStudents, setAllStudents] = useState<Child[]>([]);

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
  
  const onStudentAddedToParent = (updatedParent: ParentWithStudents) => {
     setParents(prev => prev.map(p => p.id === updatedParent.id ? updatedParent : p));
  };

  const onImportCompleted = () => {
    loadParents(); // Refresh the parent list
  };
  
  // Initialize hooks
  const addParentForm = useAddParentForm({ onParentAdded });
  const editParentForm = useEditParentForm({ onParentUpdated });
  const importParentsHook = useImportParents({ onImportCompleted }); // Renamed to avoid conflict
  const addStudentForm = useAddStudentToParentForm({ allStudents, onStudentAddedToParent });


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

  // Handle removing student from parent
  const handleRemoveStudent = async (studentRelationshipId: string, parentId: string, studentId: string) => {
    const parent = parents.find(p => p.id === parentId);
    if (!parent || !parent.students) return;
    
    if (!confirm("Are you sure you want to remove this student from the parent?")) {
      return;
    }
    
    try {
      await removeStudentFromParent(studentRelationshipId);
      setParents(prev => prev.map(p => {
        if (p.id === parentId) {
          return {
            ...p,
            students: p.students?.filter(s => s.parentRelationshipId !== studentRelationshipId) || [],
          };
        }
        return p;
      }));
      toast({
        title: "Success",
        description: "Student removed from parent successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove student from parent",
        variant: "destructive",
      });
    }
  };

  // Handle toggling primary status
  const handleTogglePrimary = async (studentRelationshipId: string, parentId: string, currentIsPrimary: boolean, currentRelationship?: string) => {
    const parent = parents.find(p => p.id === parentId);
    if (!parent || !parent.students) return;
        
    try {
      await updateStudentParentRelationship(
        studentRelationshipId, 
        !currentIsPrimary, 
        currentRelationship
      );
      setParents(prev => prev.map(p => {
        if (p.id === parentId) {
          // When a student is set to primary, others should be set to non-primary for that parent.
          const newStudentsList = p.students?.map(s => {
            if (s.parentRelationshipId === studentRelationshipId) {
              return { ...s, isPrimary: !s.isPrimary }; // Toggle the selected student
            } else if (!currentIsPrimary && s.isPrimary) { 
              // If we are setting the current student to primary (!currentIsPrimary is true)
              // and this 's' student is another primary one, set it to false.
              return { ...s, isPrimary: false };
            }
            return s;
          }) || [];

          // If after toggling, no student is primary (e.g., unsetting the only primary one),
          // and the list is not empty, it's often desired to make the first student primary.
          // However, this can be complex. For now, we'll just handle the toggle and explicit unsetting of others.
          // The API should ideally enforce one primary or the business logic here needs to be more robust.
          // For this iteration, we ensure that if one is set to primary, others are unset.
          
          return {
            ...p,
            students: newStudentsList,
          };
        }
        return p;
      }));
      toast({
        title: "Success",
        description: "Primary status updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update primary status",
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
              ) : parents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No parents found. Add one to get started.</TableCell>
                </TableRow>
              ) : (
                parents.map((parent) => (
                  <ParentTableRow
                    key={parent.id}
                    parent={parent}
                    onEdit={() => editParentForm.openEditParentSheet(parent)}
                    onDelete={handleDeleteParent}
                    onAddStudent={() => addStudentForm.openAddStudentDialog(parent)}
                    onTogglePrimary={handleTogglePrimary}
                    onRemoveStudent={handleRemoveStudent}
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
      
      <AddStudentToParentDialog
        isOpen={addStudentForm.isStudentDialogOpen}
        onOpenChange={(openState) => openState ? addStudentForm.openAddStudentDialog(parents.find(p => p.name === addStudentForm.targetParentName)!) : addStudentForm.closeAddStudentDialog()}
        selectedParentName={addStudentForm.targetParentName}
        allStudents={addStudentForm.availableStudents}
        selectedStudentId={addStudentForm.selectedStudentId}
        onSelectedStudentIdChange={addStudentForm.setSelectedStudentId}
        relationship={addStudentForm.relationship}
        onRelationshipChange={addStudentForm.setRelationship}
        isPrimary={addStudentForm.isPrimary}
        onIsPrimaryChange={addStudentForm.setIsPrimary}
        onSubmit={addStudentForm.handleAddStudentToParentSubmit}
      />
    </div>
  );
};

export default AdminParentsScreen;
