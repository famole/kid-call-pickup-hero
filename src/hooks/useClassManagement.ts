
import { useState, useEffect } from 'react';
import { Class } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { getAllClasses, createClass, updateClass, deleteClass } from '@/services/classService';
import { getAllStudents } from '@/services/studentService';
import { addTeacherToClass, removeTeacherFromClass, getTeachersForClass } from '@/services/classTeacherService';

export const useClassManagement = () => {
  const [classList, setClassList] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentClass, setCurrentClass] = useState<Class | null>(null);
  const [classFormData, setClassFormData] = useState<Partial<Class & { selectedTeachers?: string[] }>>({
    name: '',
    grade: '',
    teacher: '',
    selectedTeachers: []
  });
  
  const { toast } = useToast();

  // Load classes
  useEffect(() => {
    const loadClasses = async () => {
      try {
        setLoading(true);
        const data = await getAllClasses();
        setClassList(data);
      } catch (error) {
        console.error('Error loading classes:', error);
        toast({
          title: "Error",
          description: "Failed to load classes",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadClasses();
  }, [toast]);

  const handleAddClass = async () => {
    if (!classFormData.name || !classFormData.grade || !classFormData.teacher || !classFormData.selectedTeachers?.length) {
      toast({
        title: "Error",
        description: "All fields are required and at least one teacher must be selected",
        variant: "destructive"
      });
      return;
    }

    try {
      const classToAdd = {
        name: classFormData.name,
        grade: classFormData.grade,
        teacher: classFormData.teacher
      };

      const createdClass = await createClass(classToAdd);
      
      // Add teacher relationships
      if (classFormData.selectedTeachers) {
        for (const teacherId of classFormData.selectedTeachers) {
          await addTeacherToClass(createdClass.id, teacherId);
        }
      }
      
      setClassList([...classList, createdClass]);
      
      toast({
        title: "Class Added",
        description: `${createdClass.name} has been added successfully with ${classFormData.selectedTeachers.length} teacher(s)`,
      });
      
      resetForm();
      return true;
    } catch (error) {
      console.error('Error adding class:', error);
      toast({
        title: "Error",
        description: "Failed to add class. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  const handleUpdateClass = async () => {
    if (!currentClass || !classFormData.name || !classFormData.grade || !classFormData.teacher || !classFormData.selectedTeachers?.length) {
      toast({
        title: "Error",
        description: "All fields are required and at least one teacher must be selected",
        variant: "destructive"
      });
      return;
    }

    try {
      const updatedClass = await updateClass(currentClass.id, {
        name: classFormData.name,
        grade: classFormData.grade,
        teacher: classFormData.teacher
      });

      // Update teacher relationships
      if (classFormData.selectedTeachers) {
        // Get current teachers for the class
        const currentTeachers = await getTeachersForClass(currentClass.id);
        const currentTeacherIds = currentTeachers.map(t => t.id);
        
        // Remove teachers that are no longer selected
        for (const teacherId of currentTeacherIds) {
          if (!classFormData.selectedTeachers.includes(teacherId)) {
            await removeTeacherFromClass(currentClass.id, teacherId);
          }
        }
        
        // Add new teachers
        for (const teacherId of classFormData.selectedTeachers) {
          if (!currentTeacherIds.includes(teacherId)) {
            await addTeacherToClass(currentClass.id, teacherId);
          }
        }
      }

      setClassList(classList.map(c => c.id === currentClass.id ? updatedClass : c));
      
      toast({
        title: "Class Updated",
        description: `${updatedClass.name} has been updated successfully with ${classFormData.selectedTeachers.length} teacher(s)`,
      });
      
      resetForm();
      return true;
    } catch (error) {
      console.error('Error updating class:', error);
      toast({
        title: "Error",
        description: "Failed to update class. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  const handleDeleteClass = async () => {
    if (!currentClass) return;

    try {
      // Check if there are students in this class
      const students = await getAllStudents();
      const studentsInClass = students.filter(student => student.classId === currentClass.id);
      
      if (studentsInClass.length > 0) {
        toast({
          title: "Cannot Delete Class",
          description: `There are ${studentsInClass.length} students assigned to this class. Please reassign them first.`,
          variant: "destructive"
        });
        return false;
      }

      await deleteClass(currentClass.id);
      setClassList(classList.filter(c => c.id !== currentClass.id));
      
      toast({
        title: "Class Deleted",
        description: `${currentClass.name} has been deleted successfully`,
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting class:', error);
      toast({
        title: "Error",
        description: "Failed to delete class. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  const prepareEditClass = async (classItem: Class) => {
    setCurrentClass(classItem);
    
    try {
      // Get assigned teachers for this class
      const assignedTeachers = await getTeachersForClass(classItem.id);
      const teacherIds = assignedTeachers.map(t => t.id);
      
      setClassFormData({
        name: classItem.name,
        grade: classItem.grade,
        teacher: classItem.teacher,
        selectedTeachers: teacherIds
      });
    } catch (error) {
      console.error('Error loading teachers for class:', error);
      setClassFormData({
        name: classItem.name,
        grade: classItem.grade,
        teacher: classItem.teacher,
        selectedTeachers: []
      });
    }
  };

  const prepareDeleteClass = (classItem: Class) => {
    setCurrentClass(classItem);
  };

  const resetForm = () => {
    setClassFormData({ 
      name: '', 
      grade: '', 
      teacher: '',
      selectedTeachers: []
    });
    setCurrentClass(null);
  };

  return {
    classList,
    loading,
    currentClass,
    classFormData,
    setClassFormData,
    handleAddClass,
    handleUpdateClass,
    handleDeleteClass,
    prepareEditClass,
    prepareDeleteClass,
    resetForm
  };
};
