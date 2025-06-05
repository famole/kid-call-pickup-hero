
import { supabase } from "@/integrations/supabase/client";
import { ParentWithStudents } from "@/types/parent";

// Optimized function to get parents with students using proper joins
export const getParentsWithStudentsOptimized = async (): Promise<ParentWithStudents[]> => {
  const startTime = performance.now();

  try {
    // First, get all parents with their student relationships
    const { data: parentStudentData, error: relationError } = await supabase
      .from('parents')
      .select(`
        id,
        name,
        email,
        phone,
        role,
        created_at,
        updated_at,
        student_parents (
          id,
          student_id,
          relationship,
          is_primary
        )
      `)
      .order('name');

    if (relationError) {
      console.error('Error fetching parents with student relationships:', relationError);
      throw new Error(relationError.message);
    }


    // Get all students separately to join with the relationships
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select('id, name, class_id');

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      throw new Error(studentsError.message);
    }


    // Create a map of students for quick lookup
    const studentsMap = new Map(studentsData.map(student => [student.id, student]));

    // Transform the data to match our ParentWithStudents type
    const result: ParentWithStudents[] = parentStudentData.map((parentData: any) => {
      const students = parentData.student_parents?.map((relation: any) => {
        const studentInfo = studentsMap.get(relation.student_id);
        return {
          id: relation.student_id,
          name: studentInfo ? studentInfo.name : 'Unknown Student',
          isPrimary: relation.is_primary,
          relationship: relation.relationship || undefined,
          parentRelationshipId: relation.id,
          classId: studentInfo ? studentInfo.class_id : undefined,
        };
      }) || [];

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
