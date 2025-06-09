
import { supabase } from "@/integrations/supabase/client";
import { ParentWithStudents } from '@/types/parent';

// Optimized query to get parents with students in a single database call
export const getParentsWithStudentsOptimized = async (): Promise<ParentWithStudents[]> => {
  try {
    console.log('Fetching parents with optimized query...');
    const startTime = performance.now();

    // Single query with all necessary joins
    const { data, error } = await supabase
      .from('parents')
      .select(`
        *,
        student_parents!inner (
          id,
          relationship,
          is_primary,
          students!inner (
            id,
            name,
            class_id
          )
        )
      `)
      .order('name');

    if (error) {
      console.error('Error in optimized parents query:', error);
      throw new Error(error.message);
    }

    const queryTime = performance.now() - startTime;
    console.log(`Optimized query completed in ${queryTime.toFixed(2)}ms`);

    // Transform the nested data structure
    const parentsMap = new Map<string, ParentWithStudents>();

    data.forEach(parentRow => {
      const parentId = parentRow.id;
      
      if (!parentsMap.has(parentId)) {
        parentsMap.set(parentId, {
          id: parentRow.id,
          name: parentRow.name,
          email: parentRow.email,
          phone: parentRow.phone,
          role: parentRow.role,
          createdAt: new Date(parentRow.created_at),
          updatedAt: new Date(parentRow.updated_at),
          students: []
        });
      }

      const parent = parentsMap.get(parentId)!;
      
      // Process each student_parent relationship
      if (parentRow.student_parents && Array.isArray(parentRow.student_parents)) {
        parentRow.student_parents.forEach(studentParent => {
          if (studentParent.students) {
            const student = studentParent.students;
            const existingStudent = parent.students?.find(s => s.id === student.id);
            
            if (!existingStudent) {
              parent.students?.push({
                id: student.id,
                name: student.name,
                isPrimary: studentParent.is_primary,
                relationship: studentParent.relationship,
                parentRelationshipId: studentParent.id,
                classId: student.class_id
              });
            }
          }
        });
      }
    });

    const result = Array.from(parentsMap.values());
    console.log(`Processed ${result.length} parents with students`);
    
    return result;
  } catch (error) {
    console.error('Error in getParentsWithStudentsOptimized:', error);
    throw error;
  }
};

// Optimized query for parent dashboard data
export const getParentDashboardDataOptimized = async (parentEmail: string) => {
  try {
    console.log('Fetching parent dashboard data optimized...');
    
    // Single query to get parent with their students and authorizations
    const { data, error } = await supabase
      .from('parents')
      .select(`
        id,
        name,
        email,
        student_parents!inner (
          id,
          relationship,
          is_primary,
          students!inner (
            id,
            name,
            class_id,
            avatar
          )
        ),
        pickup_authorizations_authorized_parent_id_fkey!inner (
          student_id,
          start_date,
          end_date,
          is_active,
          students!inner (
            id,
            name,
            class_id,
            avatar
          )
        )
      `)
      .eq('email', parentEmail)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching parent dashboard data:', error);
      throw new Error(error.message);
    }

    if (!data) {
      return { 
        ownChildren: [], 
        authorizedChildren: [], 
        allChildren: [] 
      };
    }

    // Process own children
    const ownChildren = data.student_parents?.map(sp => ({
      id: sp.students.id,
      name: sp.students.name,
      classId: sp.students.class_id || '',
      parentIds: [data.id],
      avatar: sp.students.avatar,
      isAuthorized: false
    })) || [];

    // Process authorized children
    const authorizedChildren = data.pickup_authorizations_authorized_parent_id_fkey
      ?.filter(auth => {
        const today = new Date();
        const startDate = new Date(auth.start_date);
        const endDate = new Date(auth.end_date);
        return auth.is_active && today >= startDate && today <= endDate;
      })
      .map(auth => ({
        id: auth.students.id,
        name: auth.students.name,
        classId: auth.students.class_id || '',
        parentIds: [],
        avatar: auth.students.avatar,
        isAuthorized: true
      })) || [];

    return {
      ownChildren,
      authorizedChildren,
      allChildren: [...ownChildren, ...authorizedChildren]
    };
  } catch (error) {
    console.error('Error in getParentDashboardDataOptimized:', error);
    throw error;
  }
};
