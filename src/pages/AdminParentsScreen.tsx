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
  FileUp, 
  Trash2, 
  Pencil, 
  UserPlus, 
  Star, 
  StarOff 
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
import { fetchAllStudentsService } from '@/services/studentService';
import { parseCSV } from '@/utils/csvUtils';

// Import new components
import AddParentSheet from '@/components/admin-parents/AddParentSheet';
import EditParentSheet from '@/components/admin-parents/EditParentSheet';
import ImportParentsDialog from '@/components/admin-parents/ImportParentsDialog';
import AddStudentToParentDialog from '@/components/admin-parents/AddStudentToParentDialog';

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
        const studentsData = await fetchAllStudentsService();
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
        parent.id === updatedParentData.id ? { ...parent, ...updatedParentData } : parent
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
    
    // studentId is passed for confirmation message and filtering local state, 
    // studentRelationshipId is used for the API call.
    
    if (!confirm("Are you sure you want to remove this student from the parent?")) {
      return;
    }
    
    try {
      await removeStudentFromParent(studentRelationshipId);
      
      // Update the local state
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
      
      // Update the local state
      setParents(prev => prev.map(p => {
        if (p.id === parentId) {
          return {
            ...p,
            students: p.students?.map(s => {
              if (s.parentRelationshipId === studentRelationshipId) {
                return { ...s, isPrimary: !s.isPrimary };
              }
              // If making this student primary, ensure no other student for this parent is primary
              // This logic might be complex if multiple students can be primary,
              // or if primary status should be exclusive.
              // For simplicity, this example only toggles the specific student.
              // A more robust solution might involve an API update that handles exclusivity.
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
                  <TableRow key={parent.id}>
                    <TableCell>{parent.name}</TableCell>
                    <TableCell>{parent.email}</TableCell>
                    <TableCell>{parent.phone || '-'}</TableCell>
                    <TableCell>
                      {parent.students && parent.students.length > 0 ? (
                        <div className="space-y-2">
                          {parent.students.map(student => (
                            <div key={student.parentRelationshipId} className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-2 rounded">
                              <div className="flex items-center">
                                {student.isPrimary ? <Star className="h-4 w-4 text-yellow-500 mr-1" /> : null}
                                <span>{student.name}</span>
                                {student.relationship && <span className="text-xs text-gray-500 ml-1">({student.relationship})</span>}
                              </div>
                              <div className="flex space-x-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  title={student.isPrimary ? "Unset as primary" : "Set as primary"}
                                  onClick={() => handleTogglePrimary(student.parentRelationshipId, parent.id, student.isPrimary, student.relationship)}
                                >
                                  {student.isPrimary ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  title="Remove student"
                                  onClick={() => handleRemoveStudent(student.parentRelationshipId, parent.id, student.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">No students</span>
                      )}
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="mt-2 px-0 text-primary"
                        onClick={() => {
                          setSelectedParent(parent); // Keep existing students data
                          setSelectedStudentId('');
                          setRelationship('');
                          setIsPrimary(false);
                          setIsStudentDialogOpen(true);
                        }}
                      >
                        <UserPlus className="h-4 w-4 mr-1" /> Add Student
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          title="Edit parent"
                          onClick={() => {
                            setSelectedParent(parent); // Keep existing students data
                            setIsEditSheetOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="Delete parent"
                          onClick={() => handleDeleteParent(parent.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
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
          onSelectedParentChange={setSelectedParent} // setSelectedParent expects ParentWithStudents
          onSubmit={handleEditParent}
        />
      )}
      
      <AddStudentToParentDialog
        isOpen={isStudentDialogOpen}
        onOpenChange={(isOpen) => {
          setIsStudentDialogOpen(isOpen);
          if (!isOpen) setSelectedParent(null); // Reset selected parent when dialog closes
        }}
        selectedParentName={selectedParent?.name}
        allStudents={allStudents.filter(s => !selectedParent?.students?.find(ps => ps.id === s.id))} // Show only unassigned students for THIS parent
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
