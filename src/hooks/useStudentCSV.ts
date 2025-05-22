import { useToast } from '@/hooks/use-toast';
import { createStudent } from '@/services/studentService'; // Keep this import for createStudent
import { getAllClasses } from '@/services/classService'; // Changed from studentService to classService
import { Child, Class } from '@/types';
import { isValidUUID } from '@/utils/validators';
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
    let errorsEncountered: string[] = [];
  
    const currentClasses = await getAllClasses(); // Fetches from classService now
    if (currentClasses.length === 0) {
        toast({
            title: "Import Warning",
            description: "No classes found. Cannot validate class IDs from CSV.",
            variant: "default"
        });
    }
  
    const studentsToCreate = parsedData.map(item => {
      if (!item.name || !item.classId) {
        errorsEncountered.push(`Skipping student '${item.name || 'Unknown'}' due to missing name or classId.`);
        return null;
      }
      // Ensure item.classId is treated as string for comparison if necessary, though UUIDs are typically strings.
      // The currentClasses.some check should work fine as long as class IDs are consistently string UUIDs.
      if (currentClasses.length > 0 && !currentClasses.some(c => String(c.id) === String(item.classId))) {
        errorsEncountered.push(`Skipping student '${item.name}' - Class ID '${item.classId}' not found.`);
        return null;
      }
      const validParentIds = item.parentIds?.filter(id => isValidUUID(id)) || [];
      if (item.parentIds && item.parentIds.length > 0 && validParentIds.length !== item.parentIds.length) {
          errorsEncountered.push(`Student '${item.name}': Some parent IDs were invalid and skipped.`);
      }
      
      return {
        name: item.name,
        classId: item.classId, // Assuming item.classId is already a string UUID
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
            description: errorsEncountered.join(" ").substring(0, 100) + "...", // Truncate for toast
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
        // Ensure studentData.classId is correctly typed for createStudent if necessary
        // createStudent expects Omit<Child, 'id'>
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
            variant: "default", // changed from "warning"
            duration: 10000
        });
    }
  
    setIsLoading(false);
    setIsCSVModalOpen(false);
  };

  const handleExportCSVAction = (studentListToExport: Child[]) => {
    const headers = "id,name,classId,parentIds,avatar\n";
    const csvContent = studentListToExport.map(student => {
      const validParentIds = student.parentIds?.filter(isValidUUID) || [];
      // Ensure classId is a string for CSV export
      return `${student.id},"${student.name}","${String(student.classId)}","${validParentIds.join(',')}",${student.avatar || ''}`;
    }).join("\n");

    const finalCsvContent = headers + csvContent;
    
    const blob = new Blob([finalCsvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `students_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `${studentListToExport.length} students exported to CSV`,
    });
  };

  return {
    handleCSVImportAction,
    handleExportCSVAction,
  };
};
