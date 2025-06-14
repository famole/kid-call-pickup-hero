
import { supabase } from "@/integrations/supabase/client";
import { ParentWithStudents } from '@/types/parent';

export const getParentsWithStudentsOptimized = async (): Promise<ParentWithStudents[]> => {
  try {
    console.log('Fetching optimized parents with students data...');
    
    const { data: parentsData, error: parentsError } = await supabase
      .from('parents')
      .select(`
        id,
        name,
        email,
        phone,
        role,
        created_at,
        updated_at
      `)
      .order('name');

    if (parentsError) {
      console.error('Error fetching parents:', parentsError);
      throw new Error(parentsError.message);
    }

    console.log(`Fetched ${parentsData?.length || 0} parents from database`);
    
    // Log role distribution for debugging
    const roleDistribution = parentsData?.reduce((acc, parent) => {
      const role = parent.role || 'no-role';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('Role distribution:', roleDistribution);

    const { data: studentParentData, error: studentParentError } = await supabase
      .from('student_parents')
      .select(`
        parent_id,
        student_id,
        is_primary,
        students (
          id,
          name,
          class_id,
          avatar,
          classes (
            id,
            name,
            grade
          )
        )
      `);

    if (studentParentError) {
      console.error('Error fetching student-parent relationships:', studentParentError);
      throw new Error(studentParentError.message);
    }

    console.log(`Fetched ${studentParentData?.length || 0} student-parent relationships`);

    // Group students by parent ID
    const studentsByParent = studentParentData?.reduce((acc, relation) => {
      if (!acc[relation.parent_id]) {
        acc[relation.parent_id] = [];
      }
      acc[relation.parent_id].push({
        id: relation.students.id,
        name: relation.students.name,
        classId: relation.students.class_id,
        className: relation.students.classes?.name || 'No Class',
        grade: relation.students.classes?.grade || 'No Grade',
        isPrimary: relation.is_primary,
        avatar: relation.students.avatar,
      });
      return acc;
    }, {} as Record<string, any[]>) || {};

    // Combine parents with their students
    const parentsWithStudents: ParentWithStudents[] = parentsData?.map(parent => ({
      id: parent.id,
      name: parent.name,
      email: parent.email,
      phone: parent.phone || '',
      role: parent.role || 'parent',
      students: studentsByParent[parent.id] || [],
      createdAt: parent.created_at,
      updatedAt: parent.updated_at,
    })) || [];

    console.log(`Returning ${parentsWithStudents.length} parents with students data`);
    
    // Log teachers specifically for debugging
    const teachers = parentsWithStudents.filter(p => p.role === 'teacher');
    console.log(`Found ${teachers.length} teachers:`, teachers.map(t => ({ name: t.name, role: t.role })));

    return parentsWithStudents;
  } catch (error) {
    console.error('Error in getParentsWithStudentsOptimized:', error);
    throw error;
  }
};
