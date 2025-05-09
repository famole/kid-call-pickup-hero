
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
import { classes } from '@/services/mockData';
import CSVUploadModal from '@/components/CSVUploadModal';
import StudentTable from '@/components/students/StudentTable';
import AddStudentDialog from '@/components/students/AddStudentDialog';
import EditStudentDialog from '@/components/students/EditStudentDialog';
import DeleteStudentDialog from '@/components/students/DeleteStudentDialog';
import StudentsHeader from '@/components/students/StudentsHeader';

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
        const students = await getAllStudents();
        setStudentList(students);
        
        // For now, we're still using mock classes
        setClassList(classes);
      } catch (error) {
        console.error('Failed to load data:', error);
        toast({
          title: "Error",
          description: "Failed to load student data",
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

    try {
      // Create student in Supabase
      const studentToAdd = {
        name: newStudent.name,
        classId: newStudent.classId,
        parentIds: newStudent.parentIds || []
      };

      const createdStudent = await createStudent(studentToAdd);
      
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
      toast({
        title: "Error",
        description: "Failed to add student to database",
        variant: "destructive"
      });
    }
  };

  const handleEditStudent = (student: Child) => {
    setCurrentStudent(student);
    setNewStudent({
      name: student.name,
      classId: student.classId,
      parentIds: student.parentIds
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

    try {
      // Update student in Supabase
      const updatedStudent = await updateStudent(currentStudent.id, {
        name: newStudent.name,
        classId: newStudent.classId,
        parentIds: newStudent.parentIds
      });

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
      toast({
        title: "Error",
        description: "Failed to update student in database",
        variant: "destructive"
      });
    }
  };

  const handleDeletePrompt = (student: Child) => {
    setCurrentStudent(student);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteStudent = async () => {
    if (!currentStudent) return;

    try {
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
    }
  };

  const handleCSVImport = async (parsedData: Partial<Child>[]) => {
    if (!parsedData || parsedData.length === 0) {
      toast({
        title: "Error",
        description: "No valid data found in CSV",
        variant: "destructive"
      });
      return;
    }

    // Validate all entries
    const validData = parsedData.filter(item => 
      item.name && item.classId && 
      classList.some(c => c.id === item.classId)
    );

    if (validData.length !== parsedData.length) {
      toast({
        title: "Warning",
        description: `Only ${validData.length} out of ${parsedData.length} entries were valid and will be imported.`,
      });
    }

    try {
      const importedStudents: Child[] = [];
      
      // Create students one by one
      for (const item of validData) {
        try {
          const student = await createStudent({
            name: item.name!,
            classId: item.classId!,
            parentIds: item.parentIds || []
          });
          
          importedStudents.push(student);
        } catch (error) {
          console.error('Error importing student:', error);
        }
      }

      // Update student list with new students
      setStudentList(prev => [...prev, ...importedStudents]);

      toast({
        title: "Students Imported",
        description: `${importedStudents.length} students have been imported successfully`,
      });
      
      setIsCSVModalOpen(false);
    } catch (error) {
      console.error('Error importing students:', error);
      toast({
        title: "Error",
        description: "Failed to import students",
        variant: "destructive"
      });
    }
  };

  // Function to export students as CSV
  const handleExportCSV = () => {
    // Create CSV content
    const headers = "id,name,classId,parentIds\n";
    const csvContent = studentList.map(student => {
      return `${student.id},"${student.name}",${student.classId},"${student.parentIds.join(',')}"`;
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
    const classInfo = classes.find(c => c.id === classId);
    return classInfo ? classInfo.name : 'Unknown Class';
  };

  return (
    <div className="container mx-auto py-6">
      <StudentsHeader 
        onExportCSV={handleExportCSV}
        onImportCSV={() => setIsCSVModalOpen(true)}
        onAddStudent={() => setIsAddDialogOpen(true)}
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
      />

      {/* Edit Student Dialog */}
      <EditStudentDialog 
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        classList={classList}
        student={newStudent}
        setStudent={setNewStudent}
        onUpdate={handleUpdateStudent}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteStudentDialog 
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        student={currentStudent}
        onDelete={handleDeleteStudent}
      />

      {/* CSV Upload Modal */}
      <CSVUploadModal
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
        onImport={handleCSVImport}
        classList={classList}
      />
    </div>
  );
};

export default AdminStudentsScreen;
