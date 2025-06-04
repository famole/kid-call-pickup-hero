
import { supabase } from "@/integrations/supabase/client";
import { ParentWithStudents } from "@/types/parent";

// Optimized function to get parents with students using a single query with joins
export const getParentsWithStudentsOptimized = async (): Promise<ParentWithStudents[]> => {
  console.log('Starting optimized parents fetch...');
  const startTime = performance.now();

  try {
    // Single query with joins to get all data at once
    const { data: parentsData, error: parentsError } = await supabase
      .from('parents')
      .select(`
        id,
        name,
        email,
        phone,
        role,
        created_at,
        updated_at,
        student_parents!inner(
          id,
          student_id,
          relationship,
          is_primary,
          students!inner(
            id,
            name,
            class_id
          )
        )
      `)
      .order('name');

    if (parentsError) {
      console.error('Error fetching parents with students:', parentsError);
      throw new Error(parentsError.message);
    }

    console.log(`Raw data fetched in ${performance.now() - startTime}ms`);

    // Transform the data to match our ParentWithStudents type
    const parentsMap = new Map<string, ParentWithStudents>();

    parentsData.forEach((parentData: any) => {
      const parentId = parentData.id;
      
      if (!parentsMap.has(parentId)) {
        parentsMap.set(parentId, {
          id: parentData.id,
          name: parentData.name,
          email: parentData.email,
          phone: parentData.phone,
          role: parentData.role || 'parent',
          createdAt: new Date(parentData.created_at),
          updatedAt: new Date(parentData.updated_at),
          students: [],
        });
      }

      const parent = parentsMap.get(parentId)!;
      
      // Add student if it exists and hasn't been added yet
      if (parentData.student_parents?.students) {
        const studentData = parentData.student_parents.students;
        const existingStudent = parent.students?.find(s => s.id === studentData.id);
        
        if (!existingStudent) {
          parent.students!.push({
            id: studentData.id,
            name: studentData.name,
            isPrimary: parentData.student_parents.is_primary,
            relationship: parentData.student_parents.relationship || undefined,
            parentRelationshipId: parentData.student_parents.id,
            classId: studentData.class_id,
          });
        }
      }
    });

    // Also get parents with no students
    const { data: parentsWithoutStudents, error: noStudentsError } = await supabase
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
      .not('id', 'in', `(${Array.from(parentsMap.keys()).map(id => `'${id}'`).join(',')})`)
      .order('name');

    if (noStudentsError) {
      console.error('Error fetching parents without students:', noStudentsError);
    } else {
      parentsWithoutStudents.forEach((parentData: any) => {
        parentsMap.set(parentData.id, {
          id: parentData.id,
          name: parentData.name,
          email: parentData.email,
          phone: parentData.phone,
          role: parentData.role || 'parent',
          createdAt: new Date(parentData.created_at),
          updatedAt: new Date(parentData.updated_at),
          students: [],
        });
      });
    }

    const result = Array.from(parentsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    
    console.log(`Optimized parents fetch completed in ${performance.now() - startTime}ms for ${result.length} parents`);
    
    return result;
  } catch (error) {
    console.error('Error in optimized parents fetch:', error);
    throw error;
  }
};
