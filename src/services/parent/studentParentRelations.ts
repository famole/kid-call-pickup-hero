import { supabase } from "@/integrations/supabase/client";
import { StudentParentRelationship, ParentWithStudents } from "@/types/parent";
import { Child } from "@/types";
import { getAllStudents } from "../studentService";
import { getAllParents } from "./parentOperations";
import { secureOperations } from '@/services/encryption';

// Student-parent relationship management
export const addStudentToParent = async (
  parentId: string,
  studentId: string,
  relationship?: string,
  isPrimary: boolean = false
): Promise<StudentParentRelationship> => {
  const { data, error } = await supabase
    .from('student_parents')
    .insert([
      {
        parent_id: parentId,
        student_id: studentId,
        relationship,
        is_primary: isPrimary,
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Error associating student with parent:', error);
    throw new Error(error.message);
  }

  return {
    id: data.id,
    studentId: data.student_id,
    parentId: data.parent_id,
    relationship: data.relationship,
    isPrimary: data.is_primary,
    createdAt: new Date(data.created_at),
  };
};

export const removeStudentFromParent = async (relationshipId: string): Promise<void> => {
  const { error } = await supabase
    .from('student_parents')
    .delete()
    .eq('id', relationshipId);

  if (error) {
    console.error('Error removing student-parent relationship:', error);
    throw new Error(error.message);
  }
};

export const updateStudentParentRelationship = async (
  relationshipId: string,
  isPrimary: boolean,
  relationship?: string
): Promise<void> => {
  const { error } = await supabase
    .from('student_parents')
    .update({
      is_primary: isPrimary,
      relationship,
    })
    .eq('id', relationshipId);

  if (error) {
    console.error('Error updating student-parent relationship:', error);
    throw new Error(error.message);
  }
};

export const getStudentsForParent = async (parentId: string): Promise<Child[]> => {
  const { data, error } = await supabase
    .from('student_parents')
    .select('student_id')
    .eq('parent_id', parentId);

  if (error) {
    console.error(`Error fetching students for parent ${parentId}:`, error);
    throw new Error(error.message);
  }

  const studentIds = data.map(item => item.student_id);

  if (studentIds.length === 0) {
    return [];
  }

  const allStudents = await getAllStudents();

  return allStudents.filter(student => studentIds.includes(student.id));
};

/**
 * OPTIMIZED: Get parents with their students using a single backend query
 * This replaces the inefficient approach of getting all parents and then querying each one individually
 */
export const getParentsWithStudents = async (): Promise<ParentWithStudents[]> => {
  try {
    // Use the new optimized backend operation that joins all tables in one query
    const { data, error } = await secureOperations.getParentsWithStudentsSecure();

    if (error) {
      console.error('Error fetching parents with students:', error);
      throw new Error(error.message);
    }

    // Transform the data to match ParentWithStudents interface
    return data.map(parent => ({
      id: parent.id,
      name: parent.name,
      email: parent.email,
      username: parent.username,
      phone: parent.phone,
      role: parent.role || 'parent',
      createdAt: new Date(parent.created_at),
      updatedAt: new Date(parent.updated_at),
      deletedAt: parent.deleted_at ? new Date(parent.deleted_at) : undefined,
      students: parent.students
    }));
  } catch (error) {
    console.error('Error in optimized getParentsWithStudents:', error);
    // Fallback to the old method if the new one fails
    return await getParentsWithStudentsLegacy();
  }
};

/**
 * LEGACY METHOD: Inefficient approach - kept for backward compatibility
 * This method gets all parents and then queries each parent individually (N+1 queries)
 */
export const getParentsWithStudentsLegacy = async (): Promise<ParentWithStudents[]> => {
  const parentsList = await getAllParents();

  const parentsWithStudents: ParentWithStudents[] = [];

  for (const parent of parentsList) {
    const { data: studentParentRows, error: studentParentError } = await supabase
      .from('student_parents')
      .select('id, student_id, is_primary, relationship')
      .eq('parent_id', parent.id);

    if (studentParentError) {
      console.error(`Error fetching students for parent ${parent.id}:`, studentParentError);
      parentsWithStudents.push({
        ...parent,
        students: [],
      });
      continue;
    }

    // Get all students data with their class information
    const allStudentsData = await getAllStudents();

    const studentDetails = studentParentRows.map(spRow => {
      const student = allStudentsData.find(s => s.id === spRow.student_id);
      return {
        id: spRow.student_id,
        name: student ? student.name : 'Unknown Student',
        isPrimary: spRow.is_primary,
        relationship: spRow.relationship || undefined,
        parentRelationshipId: spRow.id,
        classId: student ? student.classId : '', // Include classId for filtering
      };
    });

    parentsWithStudents.push({
      ...parent,
      students: studentDetails,
    });
  }

  return parentsWithStudents;
};
