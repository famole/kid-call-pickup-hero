
import { useToast } from '@/hooks/use-toast';
import { createStudent, getAllClasses } from '@/services/studentService';
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
  
    const currentClasses = await getAllClasses(); // Fetch latest class list
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
      if (currentClasses.length > 0 && !currentClasses.some(c => c.id === item.classId)) {
        errorsEncountered.push(`Skipping student '${item.name}' - Class ID '${item.classId}' not found.`);
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
      variant: (successfullyImportedCount > 0) ? "default" : "destructive"
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

  const handleExportCSVAction = (studentListToExport: Child[]) => {
    const headers = "id,name,classId,parentIds,avatar\n";
    const csvContent = studentListToExport.map(student => {
      const validParentIds = student.parentIds?.filter(isValidUUID) || [];
      return `${student.id},"${student.name}",${student.classId},"${validParentIds.join(',')}",${student.avatar || ''}`;
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
