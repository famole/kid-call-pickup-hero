import React, { useState, useEffect } from 'react';
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
import {
  PlusCircle,
  UserPlus, // Kept for Add Student button, if ParentTableRow doesn't cover all cases (it should)
} from "lucide-react";
import { ParentWithStudents, ParentInput } from '@/types/parent';
import { Child } from '@/types';
import {
  getParentsWithStudents,
  createParent,
  updateParent,
  deleteParent,
  addStudentToParent,
  removeStudentFromParent,
  updateStudentParentRelationship,
  importParentsFromCSV
} from '@/services/parentService';
import { getAllStudents } from '@/services/studentService'; // Corrected import
import { parseCSV } from '@/utils/csvUtils';

// Import new components
import AddParentSheet from '@/components/admin-parents/AddParentSheet';
import EditParentSheet from '@/components/admin-parents/EditParentSheet';
import ImportParentsDialog from '@/components/admin-parents/ImportParentsDialog';
import AddStudentToParentDialog from '@/components/admin-parents/AddStudentToParentDialog';
import ParentTableRow from '@/components/admin-parents/ParentTableRow'; // New component import

const AdminParentsScreen = () => {
  const { toast } = useToast();
  const [parents, setParents] = useState<ParentWithStudents[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<ParentWithStudents | null>(null);
  const [newParent, setNewParent] = useState<ParentInput>({ name: '', email: '', phone: '' });
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [relationship, setRelationship] = useState<string>('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [allStudents, setAllStudents] = useState<Child[]>([]);

  // Fetch parents on component mount
  useEffect(() => {
    const loadParents = async () => {
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
    };

    const loadStudents = async () => {
      try {
        const studentsData = await getAllStudents(); // Corrected function name
        setAllStudents(studentsData);
      } catch (error) {
        console.error('Failed to load students:', error);
        toast({
          title: "Error",
          description: "Failed to load students data",
          variant: "destructive",
        });
      }
    };

    loadParents();
    loadStudents();
  }, [toast]);

  // Handle form submission for new parent
  const handleAddParent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newParent.name || !newParent.email) {
      toast({
        title: "Error",
        description: "Name and email are required",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const createdParent = await createParent(newParent);
      const createdParentWithStudents: ParentWithStudents = {
        ...createdParent,
        students: []
      };
      setParents(prev => [...prev, createdParentWithStudents]);
      
      toast({
        title: "Success",
        description: `Parent ${createdParent.name} has been created`,
      });
      
      setNewParent({ name: '', email: '', phone: '' });
      setIsAddSheetOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create parent",
        variant: "destructive",
      });
    }
  };

  // Handle form submission for editing parent
  const handleEditParent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedParent) return;
    
    try {
      const parentInputData: ParentInput = {
        name: selectedParent.name,
        email: selectedParent.email,
        phone: selectedParent.phone,
      };
      const updatedParentData = await updateParent(selectedParent.id, parentInputData);
      
      setParents(prev => prev.map(parent => 
        parent.id === updatedParentData.id ? { ...parent, ...updatedParentData, students: parent.students } : parent // Ensure students array is preserved
      ));
      
      toast({
        title: "Success",
        description: `Parent ${updatedParentData.name} has been updated`,
      });
      
      setIsEditSheetOpen(false);
      setSelectedParent(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update parent",
        variant: "destructive",
      });
    }
  };

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

  const handleOpenEditSheet = (parent: ParentWithStudents) => {
    setSelectedParent(parent);
    setIsEditSheetOpen(true);
  };

  const handleOpenAddStudentDialog = (parent: ParentWithStudents) => {
    setSelectedParent(parent);
    setSelectedStudentId('');
    setRelationship('');
    setIsPrimary(false);
    setIsStudentDialogOpen(true);
  };

  // Handle file import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
    }
  };

  // Handle CSV import submission
  const handleImportSubmit = async () => {
    if (!importFile) {
      toast({
        title: "Error",
        description: "Please select a file to import",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, errors } = await parseCSV<ParentInput>(importFile);
      
      if (errors.length > 0) {
        toast({
          title: "Warning",
          description: `${errors.length} rows contain errors and will be skipped.`,
        });
      }

      const result = await importParentsFromCSV(data);
      
      toast({
        title: "Import Complete",
        description: `Successfully imported ${result.success} parents. ${result.errors} failed.`,
      });

      // Refresh the parent list
      const refreshedParents = await getParentsWithStudents();
      setParents(refreshedParents);
      
      setIsImportDialogOpen(false);
      setImportFile(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to import parents",
        variant: "destructive",
      });
    }
  };

  // Handle adding student to parent
  const handleAddStudent = async () => {
    if (!selectedParent || !selectedStudentId) {
      toast({
        title: "Error",
        description: "Please select a student",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if student already exists for this parent
      const exists = selectedParent.students?.some(s => s.id === selectedStudentId);
      
      if (exists) {
        toast({
          title: "Error",
          description: "This student is already associated with this parent",
          variant: "destructive",
        });
        return;
      }

      const newRelationship = await addStudentToParent(
        selectedParent.id, 
        selectedStudentId, 
        relationship || undefined, 
        isPrimary
      );

      // Find the student info
      const studentInfo = allStudents.find(s => s.id === selectedStudentId);
      
      // Update the local state
      setParents(prev => prev.map(parent => {
        if (parent.id === selectedParent.id) {
          const updatedStudents = [...(parent.students || []), {
            id: selectedStudentId, // Student's ID
            name: studentInfo ? studentInfo.name : 'Unknown Student',
            isPrimary,
            relationship: relationship || undefined,
            parentRelationshipId: newRelationship.id, // This is the ID from student_parents table
          }];
          return { ...parent, students: updatedStudents };
        }
        return parent;
      }));
      
      // Reset the form
      setSelectedStudentId('');
      setRelationship('');
      setIsPrimary(false);
      setIsStudentDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Student added to parent successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add student to parent",
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
          return {
            ...p,
            students: p.students?.map(s => {
              if (s.parentRelationshipId === studentRelationshipId) {
                return { ...s, isPrimary: !s.isPrimary };
              }
              // Optional: if making this primary, ensure others are not.
              // For simplicity, API should ideally handle exclusivity if required.
              // If !currentIsPrimary is true (meaning we are setting this student as primary)
              // and s.isPrimary is true (meaning s is another primary student),
              // then set s.isPrimary to false.
              // This logic ensures only one student is primary at a time for a parent.
              // However, this specific client-side update for exclusivity can be complex 
              // if the API doesn't enforce it or if there are race conditions.
              // The current API for updateStudentParentRelationship does not handle exclusivity automatically.
              // A more robust solution involves the backend or a more complex client-side update strategy.
              // For now, just toggle the selected one. If exclusive primary is a strict requirement,
              // the backend should enforce it, or the client logic needs to be more comprehensive.
              // Simplified logic:
              // if (!currentIsPrimary && s.id !== studentIdToToggle && s.isPrimary) {
              //   return { ...s, isPrimary: false };
              // }
              return s;
            }) || [],
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
              isOpen={isImportDialogOpen}
              onOpenChange={setIsImportDialogOpen}
              onFileChange={handleFileChange}
              onSubmit={handleImportSubmit}
            />
            <Button onClick={() => {
              setNewParent({ name: '', email: '', phone: '' }); // Reset form
              setIsAddSheetOpen(true);
            }}>
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
                    onEdit={() => handleOpenEditSheet(parent)}
                    onDelete={handleDeleteParent}
                    onAddStudent={() => handleOpenAddStudentDialog(parent)}
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
        isOpen={isAddSheetOpen}
        onOpenChange={setIsAddSheetOpen}
        newParent={newParent}
        onNewParentChange={setNewParent}
        onSubmit={handleAddParent}
      />

      {selectedParent && (
        <EditParentSheet
          isOpen={isEditSheetOpen}
          onOpenChange={(isOpen) => {
            setIsEditSheetOpen(isOpen);
            if (!isOpen) setSelectedParent(null);
          }}
          selectedParent={selectedParent}
          onSelectedParentChange={setSelectedParent}
          onSubmit={handleEditParent}
        />
      )}
      
      <AddStudentToParentDialog
        isOpen={isStudentDialogOpen}
        onOpenChange={(isOpen) => {
          setIsStudentDialogOpen(isOpen);
          if (!isOpen) setSelectedParent(null);
        }}
        selectedParentName={selectedParent?.name}
        allStudents={allStudents.filter(s => !selectedParent?.students?.find(ps => ps.id === s.id))}
        selectedStudentId={selectedStudentId}
        onSelectedStudentIdChange={setSelectedStudentId}
        relationship={relationship}
        onRelationshipChange={setRelationship}
        isPrimary={isPrimary}
        onIsPrimaryChange={setIsPrimary}
        onSubmit={handleAddStudent}
      />
    </div>
  );
};

export default AdminParentsScreen;
