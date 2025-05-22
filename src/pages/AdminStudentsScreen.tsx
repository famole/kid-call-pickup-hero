import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { Child, Class } from '@/types';
import { 
  getAllStudents, 
  createStudent, 
  updateStudent, 
  deleteStudent 
} from '@/services/studentService';
import { getAllClasses } from '@/services/classService'; // Import getAllClasses
import CSVUploadModal from '@/components/CSVUploadModal';
import StudentTable from '@/components/students/StudentTable';
import AddStudentDialog from '@/components/students/AddStudentDialog';
import EditStudentDialog from '@/components/students/EditStudentDialog';
import DeleteStudentDialog from '@/components/students/DeleteStudentDialog';
import StudentsHeader from '@/components/students/StudentsHeader';
import { isValidUUID } from '@/utils/validators';
import { useAddParentForm } from '@/hooks/useAddParentForm'; // Assuming this and other hooks are correctly placed by previous refactorings
import { useEditParentForm } from '@/hooks/useEditParentForm';
import { useImportParents } from '@/hooks/useImportParents';
import { useAddStudentToParentForm } from '@/hooks/useAddStudentToParentForm';

const AdminStudentsScreen = () => {
  const [studentList, setStudentList] = useState<Child[]>([]);
  const [classList, setClassList] = useState<Class[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Child | null>(null);
  const [newStudent, setNewStudent] = useState<Partial<Child>>({
    name: '',
    classId: '',
    parentIds: []
  });
  const [isLoading, setIsLoading] = useState(true);
  
  const { toast } = useToast();

  // Load students and classes
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // Get students from Supabase
        const studentsPromise = getAllStudents();
        // Get classes from Supabase
        const classesPromise = getAllClasses(); 

        const [students, fetchedClasses] = await Promise.all([studentsPromise, classesPromise]);
        
        setStudentList(students);
        setClassList(fetchedClasses);
        console.log('Fetched classes:', fetchedClasses);
        if (fetchedClasses.length === 0) {
          toast({
            title: "No Classes Found",
            description: "No classes were loaded from the database. Please ensure classes exist.",
            variant: "warning"
          });
        }

      } catch (error) {
        console.error('Failed to load data:', error);
        toast({
          title: "Error",
          description: "Failed to load student or class data",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [toast]);

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.classId) {
      toast({
        title: "Error",
        description: "Name and Class are required",
        variant: "destructive"
      });
      return;
    }
    // Ensure classId exists in the fetched classList
    if (!classList.find(c => c.id === newStudent.classId)) {
      toast({
        title: "Invalid Class",
        description: "The selected class ID does not exist. Please refresh or select a valid class.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      // Ensure we're sending valid UUIDs for parentIds
      const validParentIds = newStudent.parentIds?.filter(id => isValidUUID(id)) || [];
      
      const studentToAdd = {
        name: newStudent.name,
        classId: newStudent.classId,
        parentIds: validParentIds
      };

      console.log('Creating student:', studentToAdd);
      const createdStudent = await createStudent(studentToAdd);
      console.log('Created student:', createdStudent);
      
      // Update local state
      setStudentList(prev => [...prev, createdStudent]);
      
      toast({
        title: "Student Added",
        description: `${createdStudent.name} has been added successfully`,
      });
      
      // Reset form and close dialog
      setNewStudent({ name: '', classId: '', parentIds: [] });
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Error adding student:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to add student";
      toast({
        title: "Error Adding Student",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditStudent = (student: Child) => {
    setCurrentStudent(student);
    // Make sure we're not passing non-UUID values
    const validParentIds = student.parentIds.filter(isValidUUID);
    
    setNewStudent({
      name: student.name,
      classId: student.classId,
      parentIds: validParentIds
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateStudent = async () => {
    if (!currentStudent || !newStudent.name || !newStudent.classId) {
      toast({
        title: "Error",
        description: "Name and Class are required",
        variant: "destructive"
      });
      return;
    }

    // Ensure classId exists in the fetched classList
    if (!classList.find(c => c.id === newStudent.classId)) {
      toast({
        title: "Invalid Class",
        description: "The selected class ID does not exist. Please refresh or select a valid class.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      // Make sure we're sending valid UUIDs for parentIds
      const validParentIds = newStudent.parentIds?.filter(id => isValidUUID(id)) || [];
      
      // Update student in Supabase
      const updatedStudentData = {
        name: newStudent.name,
        classId: newStudent.classId,
        parentIds: validParentIds
      };
      // If avatar is part of newStudent and should be updated, include it
      if (newStudent.avatar !== undefined) {
        (updatedStudentData as Partial<Child>).avatar = newStudent.avatar;
      }

      const updatedStudent = await updateStudent(currentStudent.id, updatedStudentData);

      // Update local state
      setStudentList(studentList.map(s => s.id === updatedStudent.id ? updatedStudent : s));
      
      toast({
        title: "Student Updated",
        description: `${updatedStudent.name} has been updated successfully`,
      });
      
      // Reset form and close dialog
      setNewStudent({ name: '', classId: '', parentIds: [] });
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating student:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update student";
      toast({
        title: "Error Updating Student",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePrompt = (student: Child) => {
    setCurrentStudent(student);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteStudent = async () => {
    if (!currentStudent) return;

    try {
      setIsLoading(true);
      // Delete student from Supabase
      await deleteStudent(currentStudent.id);
      
      // Update local state
      setStudentList(studentList.filter(s => s.id !== currentStudent.id));
      
      toast({
        title: "Student Deleted",
        description: `${currentStudent.name} has been deleted successfully`,
      });
      
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting student:', error);
      toast({
        title: "Error",
        description: "Failed to delete student from database",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCSVImport = async (parsedData: Partial<Child>[]) => {
    if (!parsedData || parsedData.length === 0) {
      toast({
        title: "Import Error",
        description: "No data found in CSV to import.",
        variant: "destructive"
      });
      setIsCSVModalOpen(false); // Close modal if no data
      return;
    }
  
    setIsLoading(true);
    let successfullyImportedCount = 0;
    let errorsEncountered: string[] = [];
  
    // Fetch latest class list to ensure IDs are valid
    const currentClasses = await getAllClasses();
    if (currentClasses.length === 0) {
        toast({
            title: "Import Warning",
            description: "No classes found in the system. Cannot validate class IDs from CSV.",
            variant: "warning"
        });
    }
  
    const studentsToCreate = parsedData.map(item => {
      // Validate required fields
      if (!item.name || !item.classId) {
        errorsEncountered.push(`Skipping student '${item.name || 'Unknown'}' due to missing name or classId.`);
        return null;
      }
      // Validate classId against currentClasses
      if (!currentClasses.some(c => c.id === item.classId)) {
        errorsEncountered.push(`Skipping student '${item.name}' - Class ID '${item.classId}' not found.`);
        return null;
      }
      // Validate parentIds format if present
      const validParentIds = item.parentIds?.filter(id => isValidUUID(id)) || [];
      if (item.parentIds && item.parentIds.length > 0 && validParentIds.length !== item.parentIds.length) {
          errorsEncountered.push(`Student '${item.name}': Some parent IDs were invalid and skipped.`);
      }
      
      return {
        name: item.name,
        classId: item.classId,
        parentIds: validParentIds,
        avatar: item.avatar // Include avatar if present in CSV
      };
    }).filter(Boolean) as Omit<Child, 'id'>[];
  
    if (studentsToCreate.length === 0 && parsedData.length > 0) {
      toast({
        title: "Import Failed",
        description: "No valid student data to import after validation. Check CSV format and class IDs.",
        variant: "destructive"
      });
      if (errorsEncountered.length > 0) {
        console.error("CSV Import Validation Errors:", errorsEncountered.join("\n"));
         toast({
            title: "CSV Import Validation Issues",
            description: errorsEncountered.join(" "),
            variant: "warning",
            duration: 7000,
        });
      }
      setIsLoading(false);
      setIsCSVModalOpen(false);
      return;
    }
  
    const importedStudents: Child[] = [];
    for (const studentData of studentsToCreate) {
      try {
        const createdStudent = await createStudent(studentData);
        importedStudents.push(createdStudent);
        successfullyImportedCount++;
      } catch (error) {
        console.error(`Error importing student ${studentData.name}:`, error);
        errorsEncountered.push(`Failed to import student ${studentData.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  
    if (importedStudents.length > 0) {
      setStudentList(prev => [...prev, ...importedStudents]);
    }
  
    toast({
      title: "Import Complete",
      description: `${successfullyImportedCount} students imported. ${studentsToCreate.length - successfullyImportedCount} failed. ${errorsEncountered.length > 0 ? 'Some rows had issues.' : ''}`,
      variant: successfullyImportedCount > 0 && errorsEncountered.length === 0 ? "default" : "warning"
    });
  
    if (errorsEncountered.length > 0 && successfullyImportedCount < studentsToCreate.length) {
       console.error("Detailed CSV Import Errors:", errorsEncountered.join("\n"));
       toast({
            title: "CSV Import Report",
            description: `Details: ${errorsEncountered.slice(0,2).join(" ")}... (Check console for more details if any error)`, // Show first few errors
            variant: "warning",
            duration: 10000, // Longer duration for detailed messages
        });
    }
  
    setIsLoading(false);
    setIsCSVModalOpen(false);
  };

  // Function to export students as CSV
  const handleExportCSV = () => {
    // Create CSV content
    const headers = "id,name,classId,parentIds,avatar\n"; // Added avatar
    const csvContent = studentList.map(student => {
      const validParentIds = student.parentIds.filter(isValidUUID);
      return `${student.id},"${student.name}",${student.classId},"${validParentIds.join(',')}",${student.avatar || ''}`;
    }).join("\n");

    const finalCsvContent = headers + csvContent;
    
    // Create blob and download
    const blob = new Blob([finalCsvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `students_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Complete",
      description: `${studentList.length} students exported to CSV`,
    });
  };

  const getClassName = (classId: string) => {
    const classInfo = classList.find(c => c.id === classId); // Use fetched classList
    return classInfo ? classInfo.name : 'Unknown Class';
  };

  return (
    <div className="container mx-auto py-6">
      <StudentsHeader 
        onExportCSV={handleExportCSV}
        onImportCSV={() => setIsCSVModalOpen(true)}
        onAddStudent={() => {
          setNewStudent({ name: '', classId: '', parentIds: [] }); // Reset for add
          setIsAddDialogOpen(true);
        }}
      />
      
      <Card>
        <CardHeader>
          <CardTitle>Student List</CardTitle>
          <CardDescription>
            Manage all students
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StudentTable 
            studentList={studentList}
            isLoading={isLoading}
            getClassName={getClassName}
            onEdit={handleEditStudent}
            onDelete={handleDeletePrompt}
          />
        </CardContent>
      </Card>

      {/* Add Student Dialog */}
      <AddStudentDialog 
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        classList={classList}
        newStudent={newStudent}
        setNewStudent={setNewStudent}
        onSave={handleAddStudent}
        isLoading={isLoading && isAddDialogOpen} // isLoading specific to this dialog
      />

      {/* Edit Student Dialog */}
      <EditStudentDialog 
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        classList={classList}
        student={newStudent} // newStudent state is used for both add and edit forms
        setStudent={setNewStudent}
        onUpdate={handleUpdateStudent}
        isLoading={isLoading && isEditDialogOpen} // isLoading specific to this dialog
      />

      {/* Delete Confirmation Dialog */}
      <DeleteStudentDialog 
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        student={currentStudent}
        onDelete={handleDeleteStudent}
        isLoading={isLoading && isDeleteDialogOpen} // isLoading specific to this dialog
      />

      {/* CSV Upload Modal */}
      <CSVUploadModal
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
        onImport={handleCSVImport}
        classList={classList} // Pass the fetched classList
      />
    </div>
  );
};

export default AdminStudentsScreen;
