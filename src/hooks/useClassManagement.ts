
import { useState, useEffect } from 'react';
import { Class } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { getAllClasses, createClass, updateClass, deleteClass } from '@/services/classService';
import { getAllStudents } from '@/services/studentService';

export const useClassManagement = () => {
  const [classList, setClassList] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentClass, setCurrentClass] = useState<Class | null>(null);
  const [classFormData, setClassFormData] = useState<Partial<Class>>({
    name: '',
    grade: '',
    teacher: ''
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
    if (!classFormData.name || !classFormData.grade || !classFormData.teacher) {
      toast({
        title: "Error",
        description: "All fields are required",
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
      setClassList([...classList, createdClass]);
      
      toast({
        title: "Class Added",
        description: `${createdClass.name} has been added successfully`,
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
    if (!currentClass || !classFormData.name || !classFormData.grade || !classFormData.teacher) {
      toast({
        title: "Error",
        description: "All fields are required",
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

      setClassList(classList.map(c => c.id === currentClass.id ? updatedClass : c));
      
      toast({
        title: "Class Updated",
        description: `${updatedClass.name} has been updated successfully`,
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

  const prepareEditClass = (classItem: Class) => {
    setCurrentClass(classItem);
    setClassFormData({
      name: classItem.name,
      grade: classItem.grade,
      teacher: classItem.teacher
    });
  };

  const prepareDeleteClass = (classItem: Class) => {
    setCurrentClass(classItem);
  };

  const resetForm = () => {
    setClassFormData({ name: '', grade: '', teacher: '' });
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
