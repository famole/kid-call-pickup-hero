import { useToast } from '@/hooks/use-toast';
import { createStudent } from '@/services/studentService';
import { getAllClasses } from '@/services/classService';
import { Child, Class } from '@/types';
import { isValidUUID } from '@/utils/validators';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import React from 'react';

interface UseStudentCSVProps {
  setStudentList: React.Dispatch<React.SetStateAction<Child[]>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCSVModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useStudentCSV = ({
  setStudentList,
  setIsLoading,
  setIsCSVModalOpen,
}: UseStudentCSVProps) => {
  const { toast } = useToast();

  const handleCSVImportAction = async (parsedData: Partial<Child>[]) => {
    if (!parsedData || parsedData.length === 0) {
      toast({
        title: "Import Error",
        description: "No data found in CSV to import.",
        variant: "destructive"
      });
      setIsCSVModalOpen(false);
      return;
    }
  
    setIsLoading(true);
    let successfullyImportedCount = 0;
    const errorsEncountered: string[] = [];
  
    const currentClasses = await getAllClasses();
    if (currentClasses.length === 0) {
        toast({
            title: "Import Warning",
            description: "No classes found. Cannot validate class names from CSV.",
            variant: "default"
        });
    }
  
    const studentsToCreate = parsedData.map(item => {
      if (!item.name || !item.classId) {
        errorsEncountered.push(`Skipping student '${item.name || 'Unknown'}' due to missing name or resolved class ID.`);
        return null;
      }
      
      const validParentIds = item.parentIds?.filter(id => isValidUUID(id)) || [];
      if (item.parentIds && item.parentIds.length > 0 && validParentIds.length !== item.parentIds.length) {
          errorsEncountered.push(`Student '${item.name}': Some parent IDs were invalid and skipped.`);
      }
      
      return {
        name: item.name,
        classId: item.classId,
        parentIds: validParentIds,
        avatar: item.avatar
      };
    }).filter(Boolean) as Omit<Child, 'id'>[];
  
    if (studentsToCreate.length === 0 && parsedData.length > 0) {
      toast({
        title: "Import Failed",
        description: "No valid student data to import after validation.",
        variant: "destructive"
      });
      if (errorsEncountered.length > 0) {
         toast({
            title: "CSV Import Validation Issues",
            description: errorsEncountered.join(" ").substring(0, 100) + "...",
            variant: "default",
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
        errorsEncountered.push(`Failed to import ${studentData.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  
    if (importedStudents.length > 0) {
      setStudentList(prev => [...prev, ...importedStudents]);
    }
  
    toast({
      title: "Import Complete",
      description: `${successfullyImportedCount} students imported. ${studentsToCreate.length - successfullyImportedCount} failed. ${errorsEncountered.length > 0 ? 'Issues found.' : ''}`,
      variant: (successfullyImportedCount > 0 && (studentsToCreate.length - successfullyImportedCount === 0)) ? "default" : "destructive"
    });
  
    if (errorsEncountered.length > 0) {
       toast({
            title: "CSV Import Report",
            description: `Details: ${errorsEncountered.slice(0,2).join(" ")}... (Check console for more)`,
            variant: "default",
            duration: 10000
        });
    }
  
    setIsLoading(false);
    setIsCSVModalOpen(false);
  };

  const handleExportCSVAction = async (studentListToExport: Child[], classId: string | null) => {
    try {
      const classes = await getAllClasses();
      const getClassNameById = (cId: string) => {
        const foundClass = classes.find(c => c.id === cId);
        return foundClass ? foundClass.name : 'Unknown Class';
      };

      // Filter by class if specified
      const studentsToExport = classId
        ? studentListToExport.filter(s => s.classId === classId)
        : studentListToExport;

      if (studentsToExport.length === 0) {
        toast({
          title: "Export",
          description: "No students to export for the selected filter.",
          variant: "default",
        });
        return;
      }

      // Fetch parent names for all students
      const studentIds = studentsToExport.map(s => s.id);
      const { data: relationships, error } = await supabase
        .from('student_parents')
        .select(`
          student_id,
          parents!inner(name, deleted_at)
        `)
        .in('student_id', studentIds)
        .is('parents.deleted_at', null);

      if (error) {
        logger.error('Error fetching parent names for export:', error);
      }

      // Build a map of student_id -> parent names
      const parentNamesMap: Record<string, string[]> = {};
      if (relationships) {
        for (const rel of relationships) {
          const sid = rel.student_id;
          const parentName = (rel.parents as any)?.name || 'Unknown';
          if (!parentNamesMap[sid]) parentNamesMap[sid] = [];
          parentNamesMap[sid].push(parentName);
        }
      }

      const headers = "id,name,className,parents,status\n";
      const csvRows = studentsToExport.map((student) => {
        const className = getClassNameById(student.classId);
        const parentNames = parentNamesMap[student.id]?.join('; ') || '';
        const status = student.status || 'active';
        return `${student.id},"${student.name}","${className}","${parentNames}","${status}"`;
      });

      const finalCsvContent = headers + csvRows.join("\n");
      
      const blob = new Blob([finalCsvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const classLabel = classId ? `_${getClassNameById(classId).replace(/\s+/g, '_')}` : '';
      link.setAttribute('download', `students_export${classLabel}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `${studentsToExport.length} students exported to CSV`,
      });
    } catch (error) {
      logger.error('Error exporting students:', error);
      toast({
        title: "Export Error",
        description: "Failed to export students.",
        variant: "destructive",
      });
    }
  };

  return {
    handleCSVImportAction,
    handleExportCSVAction,
  };
};
