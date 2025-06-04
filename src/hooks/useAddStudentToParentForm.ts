
import { useState, useMemo } from 'react';
import { ParentWithStudents } from '@/types/parent';
import { Child, Class } from '@/types';
import { addStudentToParent } from '@/services/parentService';
import { useToast } from "@/components/ui/use-toast";

interface UseAddStudentToParentFormProps {
  allStudents: Child[];
  classes: Class[];
  onStudentAddedToParent: (updatedParent: ParentWithStudents) => void;
}

export const useAddStudentToParentForm = ({ allStudents, classes, onStudentAddedToParent }: UseAddStudentToParentFormProps) => {
  const { toast } = useToast();
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [targetParent, setTargetParent] = useState<ParentWithStudents | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [relationship, setRelationship] = useState<string>('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');

  const openAddStudentDialog = (parent: ParentWithStudents) => {
    setTargetParent(parent);
    setSelectedStudentId('');
    setRelationship('');
    setIsPrimary(false);
    setSearchTerm('');
    setSelectedClassFilter('all');
    setIsStudentDialogOpen(true);
  };

  const closeAddStudentDialog = () => {
    setIsStudentDialogOpen(false);
    setTargetParent(null);
    setSearchTerm('');
    setSelectedClassFilter('all');
  };

  const handleAddStudentToParentSubmit = async () => {
    if (!targetParent || !selectedStudentId) {
      toast({
        title: "Error",
        description: "Please select a student",
        variant: "destructive",
      });
      return;
    }

    const exists = targetParent.students?.some(s => s.id === selectedStudentId);
    if (exists) {
      toast({
        title: "Error",
        description: "This student is already associated with this parent",
        variant: "destructive",
      });
      return;
    }

    try {
      const newRelationship = await addStudentToParent(
        targetParent.id,
        selectedStudentId,
        relationship || undefined,
        isPrimary
      );

      const studentInfo = allStudents.find(s => s.id === selectedStudentId);
      const newStudentEntry = {
        id: selectedStudentId,
        name: studentInfo ? studentInfo.name : 'Unknown Student',
        isPrimary,
        relationship: relationship || undefined,
        parentRelationshipId: newRelationship.id,
        classId: studentInfo ? studentInfo.classId : '',
      };
      
      const updatedParent: ParentWithStudents = {
        ...targetParent,
        students: [...(targetParent.students || []), newStudentEntry],
      };

      onStudentAddedToParent(updatedParent);
      
      toast({
        title: "Success",
        description: "Student added to parent successfully",
      });
      closeAddStudentDialog();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add student to parent",
        variant: "destructive",
      });
    }
  };
  
  // Filter available students based on search and class filter
  const availableStudents = useMemo(() => {
    if (!targetParent) return allStudents;
    
    // Get students not already assigned to this parent
    const unassignedStudents = allStudents.filter(s => !targetParent.students?.find(ps => ps.id === s.id));
    
    let filtered = unassignedStudents;

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply class filter
    if (selectedClassFilter !== 'all') {
      filtered = filtered.filter(student => student.classId === selectedClassFilter);
    }

    return filtered;
  }, [allStudents, targetParent, searchTerm, selectedClassFilter]);

  return {
    isStudentDialogOpen,
    targetParentName: targetParent?.name,
    availableStudents,
    classes,
    openAddStudentDialog,
    closeAddStudentDialog,
    selectedStudentId,
    setSelectedStudentId,
    relationship,
    setRelationship,
    isPrimary,
    setIsPrimary,
    handleAddStudentToParentSubmit,
    searchTerm,
    setSearchTerm,
    selectedClassFilter,
    setSelectedClassFilter,
  };
};
