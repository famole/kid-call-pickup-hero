
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
  getAllClasses 
} from '@/services/classService'; 
import CSVUploadModal from '@/components/CSVUploadModal';
import StudentTable from '@/components/students/StudentTable';
import StudentSearch from '@/components/students/StudentSearch';
import AddStudentDialog from '@/components/students/AddStudentDialog';
import EditStudentDialog from '@/components/students/EditStudentDialog';
import DeleteStudentDialog from '@/components/students/DeleteStudentDialog';
import StudentsHeader from '@/components/students/StudentsHeader';
import { isValidUUID } from '@/utils/validators';
import { useStudentForm, NewStudentState } from '@/hooks/useStudentForm';
import { useStudentActions } from '@/hooks/useStudentActions';
import { useStudentCSV } from '@/hooks/useStudentCSV';
import { useStudentSearch } from '@/hooks/useStudentSearch';

const AdminStudentsScreen = () => {
  const [studentList, setStudentList] = useState<Child[]>([]);
  const [classList, setClassList] = useState<Class[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Child | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Main loading state for the screen
  
  const { toast } = useToast();
  const { newStudent, setNewStudent, resetNewStudent } = useStudentForm();

  // Use the search hook
  const {
    searchTerm,
    setSearchTerm,
    selectedClassId,
    setSelectedClassId,
    filteredStudents
  } = useStudentSearch(studentList);

  const { 
    handleAddStudentAction, 
    handleUpdateStudentAction, 
    handleDeleteStudentAction 
  } = useStudentActions({
    studentList,
    setStudentList,
    classList,
    setIsLoading,
    resetStudentForm: resetNewStudent,
    setIsAddDialogOpen,
    setIsEditDialogOpen,
    setIsDeleteDialogOpen,
    setCurrentStudent,
  });

  const { 
    handleCSVImportAction, 
    handleExportCSVAction 
  } = useStudentCSV({
    setStudentList,
    setIsLoading,
    setIsCSVModalOpen,
  });

  // Load students and classes
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // Get students directly using service, not a hook for this initial load
        const { getAllStudents: fetchAllStudents } = await import('@/services/studentService');
        const studentsPromise = fetchAllStudents();
        const classesPromise = getAllClasses(); 

        const [students, fetchedClasses] = await Promise.all([studentsPromise, classesPromise]);
        
        setStudentList(students);
        setClassList(fetchedClasses);
        console.log('Fetched classes:', fetchedClasses); // Keep for debugging
        if (fetchedClasses.length === 0) {
          toast({
            title: "No Classes Found",
            description: "No classes were loaded. Please ensure classes exist.",
            variant: "default" // Changed from "warning"
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
  }, [toast]); // Removed studentService from deps as it's imported inside

  const handleEditStudent = (student: Child) => {
    setCurrentStudent(student);
    const validParentIds = student.parentIds?.filter(isValidUUID) || []; // Ensure parentIds is not undefined
    
    setNewStudent({ // Uses setNewStudent from useStudentForm
      name: student.name,
      classId: student.classId,
      parentIds: validParentIds,
      avatar: student.avatar
    });
    setIsEditDialogOpen(true);
  };

  const handleDeletePrompt = (student: Child) => {
    setCurrentStudent(student);
    setIsDeleteDialogOpen(true);
  };
  
  // Wrapper functions to call hook actions
  const onAddStudent = () => handleAddStudentAction(newStudent);
  const onUpdateStudent = () => {
    if (currentStudent) {
      handleUpdateStudentAction(currentStudent.id, newStudent);
    }
  };
  const onDeleteStudent = () => handleDeleteStudentAction(currentStudent);
  const onImportCSV = (data: Partial<Child>[]) => handleCSVImportAction(data);
  const onExportCSV = () => handleExportCSVAction(studentList);

  const getClassName = (classId: string) => {
    const classInfo = classList.find(c => c.id === classId);
    return classInfo ? classInfo.name : 'Unknown Class';
  };

  return (
    <div className="container mx-auto py-6">
      <StudentsHeader 
        onExportCSV={onExportCSV}
        onImportCSV={() => setIsCSVModalOpen(true)}
        onAddStudent={() => {
          resetNewStudent(); // Use reset from hook
          setIsAddDialogOpen(true);
        }}
      />
      
      <Card>
        <CardHeader>
          <CardTitle>Student List</CardTitle>
          <CardDescription>
            Manage all students - {filteredStudents.length} of {studentList.length} students shown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StudentSearch
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedClassId={selectedClassId}
            onClassFilterChange={setSelectedClassId}
            classList={classList}
          />
          
          <StudentTable 
            studentList={filteredStudents}
            isLoading={isLoading} // Pass the main loading state
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
        newStudent={newStudent as NewStudentState} // Cast to satisfy AddStudentDialog if its types are strict
        setNewStudent={setNewStudent as React.Dispatch<React.SetStateAction<NewStudentState>>}
        onSave={onAddStudent}
        isLoading={isLoading && isAddDialogOpen} // Use main loading state scoped to dialog
      />

      {/* Edit Student Dialog */}
      <EditStudentDialog 
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        classList={classList}
        student={newStudent as NewStudentState} // Cast as needed
        setStudent={setNewStudent as React.Dispatch<React.SetStateAction<NewStudentState>>}
        onUpdate={onUpdateStudent}
        isLoading={isLoading && isEditDialogOpen} // Use main loading state scoped to dialog
      />

      {/* Delete Confirmation Dialog */}
      <DeleteStudentDialog 
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        student={currentStudent}
        onDelete={onDeleteStudent}
        isLoading={isLoading && isDeleteDialogOpen} // Use main loading state scoped to dialog
      />

      {/* CSV Upload Modal */}
      <CSVUploadModal
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
        onImport={onImportCSV}
        classList={classList} // Pass classList if CSVUploadModal needs it for validation hints
      />
    </div>
  );
};

export default AdminStudentsScreen;
