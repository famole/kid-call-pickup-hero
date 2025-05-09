import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UserRound, Pencil, Trash, Plus, Upload, Download } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Child, Class } from '@/types';
import { 
  getAllStudents, 
  createStudent, 
  updateStudent, 
  deleteStudent 
} from '@/services/studentService';
import { classes, parents } from '@/services/mockData';
import CSVUploadModal from '@/components/CSVUploadModal';

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
      <header className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <UserRound className="h-8 w-8 text-school-primary" />
            <h1 className="text-3xl font-bold">Manage Students</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleExportCSV} variant="outline" className="flex-1 sm:flex-none">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button 
              onClick={() => setIsCSVModalOpen(true)} 
              variant="outline" 
              className="flex-1 sm:flex-none bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
            >
              <Upload className="mr-2 h-4 w-4" /> Import CSV
            </Button>
            <Button 
              onClick={() => setIsAddDialogOpen(true)} 
              className="bg-school-primary flex-1 sm:flex-none"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Student
            </Button>
          </div>
        </div>
      </header>
      
      <Card>
        <CardHeader>
          <CardTitle>Student List</CardTitle>
          <CardDescription>
            Manage all students
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead className="hidden md:table-cell">Parents</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Loading students...
                  </TableCell>
                </TableRow>
              ) : studentList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No students found
                  </TableCell>
                </TableRow>
              ) : (
                studentList.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{getClassName(student.classId)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {student.parentIds.length > 0 
                        ? student.parentIds.map(id => {
                            const parent = parents.find(p => p.id === id);
                            return parent ? parent.name : 'Unknown';
                          }).join(', ')
                        : 'No parents assigned'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEditStudent(student)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-500 border-red-200 hover:bg-red-50"
                        onClick={() => handleDeletePrompt(student)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Student Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>
              Add a new student to your school
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="studentName">Student Name</Label>
              <Input 
                id="studentName" 
                value={newStudent.name} 
                onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                placeholder="e.g. John Doe"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="studentClass">Class</Label>
              <Select
                value={newStudent.classId}
                onValueChange={(value) => setNewStudent({...newStudent, classId: value})}
              >
                <SelectTrigger id="studentClass">
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classList.map((classItem) => (
                    <SelectItem key={classItem.id} value={classItem.id}>
                      {classItem.name} ({classItem.grade})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddStudent}>Save Student</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update student information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editStudentName">Student Name</Label>
              <Input 
                id="editStudentName" 
                value={newStudent.name} 
                onChange={e => setNewStudent({...newStudent, name: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editStudentClass">Class</Label>
              <Select
                value={newStudent.classId}
                onValueChange={(value) => setNewStudent({...newStudent, classId: value})}
              >
                <SelectTrigger id="editStudentClass">
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classList.map((classItem) => (
                    <SelectItem key={classItem.id} value={classItem.id}>
                      {classItem.name} ({classItem.grade})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateStudent}>Update Student</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {currentStudent?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteStudent}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
