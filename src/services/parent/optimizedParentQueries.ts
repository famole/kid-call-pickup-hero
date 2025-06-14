
import { supabase } from "@/integrations/supabase/client";
import { ParentWithStudents } from '@/types/parent';
import { Child } from '@/types';

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

    // Combine parents with their students - convert dates properly
    const parentsWithStudents: ParentWithStudents[] = parentsData?.map(parent => ({
      id: parent.id,
      name: parent.name,
      email: parent.email,
      phone: parent.phone || '',
      role: parent.role || 'parent',
      students: studentsByParent[parent.id] || [],
      createdAt: new Date(parent.created_at),
      updatedAt: new Date(parent.updated_at),
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

export const getParentDashboardDataOptimized = async (parentEmail: string) => {
  try {
    console.log('Fetching parent dashboard data for:', parentEmail);

    // Get parent ID first
    const { data: parentData, error: parentError } = await supabase
      .from('parents')
      .select('id')
      .eq('email', parentEmail)
      .single();

    if (parentError) {
      console.error('Error fetching parent:', parentError);
      throw new Error(parentError.message);
    }

    if (!parentData) {
      console.error('No parent found for email:', parentEmail);
      return { allChildren: [] };
    }

    // Get all children this parent has access to (direct children + authorized children)
    const { data: childrenData, error: childrenError } = await supabase
      .from('students')
      .select(`
        id,
        name,
        class_id,
        avatar,
        student_parents!inner (
          parent_id,
          is_primary
        )
      `)
      .eq('student_parents.parent_id', parentData.id);

    if (childrenError) {
      console.error('Error fetching children:', childrenError);
      throw new Error(childrenError.message);
    }

    // Get authorized children
    const { data: authorizedChildren, error: authorizedError } = await supabase
      .from('pickup_authorizations')
      .select(`
        student_id,
        students (
          id,
          name,
          class_id,
          avatar
        )
      `)
      .eq('authorized_parent_id', parentData.id)
      .eq('is_active', true)
      .lte('start_date', new Date().toISOString().split('T')[0])
      .gte('end_date', new Date().toISOString().split('T')[0]);

    if (authorizedError) {
      console.error('Error fetching authorized children:', authorizedError);
      // Don't throw here, just log and continue
    }

    // Combine and format children data
    const directChildren: Child[] = childrenData?.map(child => ({
      id: child.id,
      name: child.name,
      classId: child.class_id || '',
      parentIds: [parentData.id],
      avatar: child.avatar,
    })) || [];

    const authorizedChildrenFormatted: Child[] = authorizedChildren?.map(auth => ({
      id: auth.students.id,
      name: auth.students.name,
      classId: auth.students.class_id || '',
      parentIds: [parentData.id],
      avatar: auth.students.avatar,
    })) || [];

    // Remove duplicates and combine
    const allChildrenMap = new Map<string, Child>();
    
    directChildren.forEach(child => {
      allChildrenMap.set(child.id, { ...child, isAuthorized: false });
    });

    authorizedChildrenFormatted.forEach(child => {
      if (!allChildrenMap.has(child.id)) {
        allChildrenMap.set(child.id, { ...child, isAuthorized: true });
      }
    });

    const allChildren = Array.from(allChildrenMap.values());

    console.log(`Found ${allChildren.length} children for parent ${parentEmail}`);

    return { allChildren };
  } catch (error) {
    console.error('Error in getParentDashboardDataOptimized:', error);
    throw error;
  }
};
