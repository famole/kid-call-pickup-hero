
import { ParentWithStudents } from '@/types/parent';

interface AdminParentsWrappersProps {
  studentManagement: any;
}

export const createStudentWrappers = ({ studentManagement }: AdminParentsWrappersProps) => {
  const handleAddStudentWrapper = async (studentId: string, relationship: string) => {
    if (!studentManagement.selectedParent) return;
    await studentManagement.handleAddStudentToParent(
      studentManagement.selectedParent.id,
      studentId,
      relationship,
      false // Default isPrimary to false
    );
  };

  const handleRemoveStudentWrapper = async (studentId: string) => {
    if (!studentManagement.selectedParent) return;
    const student = studentManagement.selectedParent.students?.find(s => s.id === studentId);
    if (!student || !student.parentRelationshipId) return;
    await studentManagement.handleRemoveStudent(
      student.parentRelationshipId,
      studentManagement.selectedParent.id,
      studentId
    );
  };

  const handleTogglePrimaryWrapper = async (studentId: string) => {
    if (!studentManagement.selectedParent) return;
    const student = studentManagement.selectedParent.students?.find(s => s.id === studentId);
    if (!student || !student.parentRelationshipId) return;
    await studentManagement.handleTogglePrimary(
      student.parentRelationshipId,
      studentManagement.selectedParent.id,
      student.isPrimary,
      student.relationship
    );
  };

  return {
    handleAddStudentWrapper,
    handleRemoveStudentWrapper,
    handleTogglePrimaryWrapper,
  };
};
