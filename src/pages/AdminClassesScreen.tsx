
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
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
import { Label } from "@/components/ui/label";
import { School, Pencil, Trash, Plus } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Class } from '@/types';
import { classes, children } from '@/services/mockData';

const AdminClassesScreen = () => {
  const [classList, setClassList] = useState<Class[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentClass, setCurrentClass] = useState<Class | null>(null);
  const [newClass, setNewClass] = useState<Partial<Class>>({
    name: '',
    grade: '',
    teacher: ''
  });
  
  const { toast } = useToast();

  // Load classes
  useEffect(() => {
    setClassList(classes);
  }, []);

  const handleAddClass = () => {
    if (!newClass.name || !newClass.grade || !newClass.teacher) {
      toast({
        title: "Error",
        description: "All fields are required",
        variant: "destructive"
      });
      return;
    }

    const classToAdd = {
      id: Date.now().toString(),
      name: newClass.name,
      grade: newClass.grade,
      teacher: newClass.teacher
    };

    // Add to classes list (in a real app, this would call an API)
    setClassList([...classList, classToAdd]);
    
    // In a real app with Supabase, we'd call the API here
    // const { data, error } = await supabase.from('classes').insert(classToAdd);

    toast({
      title: "Class Added",
      description: `${classToAdd.name} has been added successfully`,
    });
    
    // Reset form and close dialog
    setNewClass({ name: '', grade: '', teacher: '' });
    setIsAddDialogOpen(false);
  };

  const handleEditClass = (classItem: Class) => {
    setCurrentClass(classItem);
    setNewClass({
      name: classItem.name,
      grade: classItem.grade,
      teacher: classItem.teacher
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateClass = () => {
    if (!currentClass || !newClass.name || !newClass.grade || !newClass.teacher) {
      toast({
        title: "Error",
        description: "All fields are required",
        variant: "destructive"
      });
      return;
    }

    const updatedClass = {
      ...currentClass,
      name: newClass.name,
      grade: newClass.grade,
      teacher: newClass.teacher
    };

    // Update class in the list (in a real app, this would call an API)
    setClassList(classList.map(c => c.id === currentClass.id ? updatedClass : c));
    
    // In a real app with Supabase, we'd call the API here
    // const { data, error } = await supabase.from('classes').update(updatedClass).eq('id', currentClass.id);

    toast({
      title: "Class Updated",
      description: `${updatedClass.name} has been updated successfully`,
    });
    
    // Reset form and close dialog
    setNewClass({ name: '', grade: '', teacher: '' });
    setIsEditDialogOpen(false);
  };

  const handleDeletePrompt = (classItem: Class) => {
    setCurrentClass(classItem);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteClass = () => {
    if (!currentClass) return;

    // Check if there are students in this class
    const studentsInClass = children.filter(child => child.classId === currentClass.id);
    if (studentsInClass.length > 0) {
      toast({
        title: "Cannot Delete Class",
        description: `There are ${studentsInClass.length} students assigned to this class. Please reassign them first.`,
        variant: "destructive"
      });
      setIsDeleteDialogOpen(false);
      return;
    }

    // Delete class from the list (in a real app, this would call an API)
    setClassList(classList.filter(c => c.id !== currentClass.id));
    
    // In a real app with Supabase, we'd call the API here
    // const { data, error } = await supabase.from('classes').delete().eq('id', currentClass.id);

    toast({
      title: "Class Deleted",
      description: `${currentClass.name} has been deleted successfully`,
    });
    
    setIsDeleteDialogOpen(false);
  };

  return (
    <div className="container mx-auto py-6">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <School className="h-8 w-8 text-school-primary" />
            <h1 className="text-3xl font-bold">Manage Classes</h1>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="bg-school-primary">
            <Plus className="mr-2 h-4 w-4" /> Add Class
          </Button>
        </div>
      </header>
      
      <Card>
        <CardHeader>
          <CardTitle>Class List</CardTitle>
          <CardDescription>
            Manage all school classes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No classes found
                  </TableCell>
                </TableRow>
              ) : (
                classList.map((classItem) => (
                  <TableRow key={classItem.id}>
                    <TableCell>{classItem.name}</TableCell>
                    <TableCell>{classItem.grade}</TableCell>
                    <TableCell>{classItem.teacher}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEditClass(classItem)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-500 border-red-200 hover:bg-red-50"
                        onClick={() => handleDeletePrompt(classItem)}
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

      {/* Add Class Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Class</DialogTitle>
            <DialogDescription>
              Create a new class for your school
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="className">Class Name</Label>
              <Input 
                id="className" 
                value={newClass.name} 
                onChange={e => setNewClass({...newClass, name: e.target.value})}
                placeholder="e.g. Class 1A"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="grade">Grade</Label>
              <Input 
                id="grade" 
                value={newClass.grade}
                onChange={e => setNewClass({...newClass, grade: e.target.value})}
                placeholder="e.g. 1st Grade"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="teacher">Teacher</Label>
              <Input 
                id="teacher" 
                value={newClass.teacher}
                onChange={e => setNewClass({...newClass, teacher: e.target.value})}
                placeholder="e.g. Ms. Smith"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddClass}>Save Class</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Class Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
            <DialogDescription>
              Update class information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editClassName">Class Name</Label>
              <Input 
                id="editClassName" 
                value={newClass.name} 
                onChange={e => setNewClass({...newClass, name: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editGrade">Grade</Label>
              <Input 
                id="editGrade" 
                value={newClass.grade}
                onChange={e => setNewClass({...newClass, grade: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editTeacher">Teacher</Label>
              <Input 
                id="editTeacher" 
                value={newClass.teacher}
                onChange={e => setNewClass({...newClass, teacher: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateClass}>Update Class</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Class</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {currentClass?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteClass}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminClassesScreen;
