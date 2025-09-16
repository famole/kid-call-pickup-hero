
import { supabase } from "@/integrations/supabase/client";
import { ParentWithStudents } from "@/types/parent";

// Optimized function to get parents with students using proper joins
export const getParentsWithStudentsOptimized = async (): Promise<ParentWithStudents[]> => {
  const startTime = performance.now();

  try {
    // Use secure operations to get all parents
    const { secureOperations } = await import('@/services/encryption');
    const { data: allParents, error: relationError } = await secureOperations.getParentsSecure();

    if (relationError) {
      console.error('Error fetching parents:', relationError);
      throw new Error(relationError.message);
    }

    // Get student-parent relationships
    const { data: studentParentRelations, error: relationshipError } = await supabase
      .from('student_parents')
      .select(`
        id,
        parent_id,
        student_id,
        relationship,
        is_primary
      `);

    if (relationshipError) {
      console.error('Error fetching student-parent relationships:', relationshipError);
      throw new Error(relationshipError.message);
    }

    // Get all students separately to join with the relationships
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select('id, name, class_id')
      .is('deleted_at', null);

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      throw new Error(studentsError.message);
    }

    // Create a map of students for quick lookup
    const studentsMap = new Map(studentsData?.map(student => [student.id, student]) || []);
    
    // Group student relationships by parent ID
    const relationsByParent = new Map();
    studentParentRelations?.forEach(relation => {
      if (!relationsByParent.has(relation.parent_id)) {
        relationsByParent.set(relation.parent_id, []);
      }
      relationsByParent.get(relation.parent_id).push(relation);
    });

    // Transform the data to match our ParentWithStudents type
    const result: ParentWithStudents[] = (allParents || []).map((parentData: any) => {
      const parentRelations = relationsByParent.get(parentData.id) || [];
      const students = parentRelations.map((relation: any) => {
        const studentInfo = studentsMap.get(relation.student_id);
        return {
          id: relation.student_id,
          name: studentInfo ? studentInfo.name : 'Unknown Student',
          isPrimary: relation.is_primary,
          relationship: relation.relationship || undefined,
          parentRelationshipId: relation.id,
          classId: studentInfo ? studentInfo.class_id : undefined,
        };
      });

      return {
        id: parentData.id,
        name: parentData.name,
        email: parentData.email,
        phone: parentData.phone,
        role: parentData.role || 'parent',
        createdAt: new Date(parentData.created_at),
        updatedAt: new Date(parentData.updated_at),
        students,
      };
    });

    return result;
  } catch (error) {
    console.error('Error in optimized parents fetch:', error);
    throw error;
  }
};
