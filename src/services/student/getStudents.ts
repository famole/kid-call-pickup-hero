import { supabase } from "@/integrations/supabase/client";
import { secureStudentOperations } from "@/services/encryption/secureStudentClient";
import { Child } from "@/types";

// Simple module-level cache to avoid duplicate get-by-id calls across services/components
// - TTL keeps cache fresh; adjust as needed
// - inFlight map coalesces concurrent requests for the same id
const STUDENT_BY_ID_TTL_MS = 30_000; // 30s cache window
const studentByIdCache = new Map<string, { value: Child | null; expiresAt: number }>();
const studentByIdInFlight = new Map<string, Promise<Child | null>>();

// Get all students using secure operations
export const getAllStudents = async (includeDeleted: boolean = false): Promise<Child[]> => {
  try {
    const { data, error } = await secureStudentOperations.getStudentsSecure(includeDeleted);

    if (error) {
      console.error('Error fetching students with secure operations:', error);
      throw new Error(error.message || 'Failed to fetch students');
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllStudents:', error);
    throw error;
  }
};

// Get a student by ID using secure operations
export const getStudentById = async (id: string): Promise<Child | null> => {
  try {
    if (!id) return null;

    // Serve from cache if valid
    const cached = studentByIdCache.get(id);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    // Coalesce concurrent calls
    const existing = studentByIdInFlight.get(id);
    if (existing) return existing;

    const promise = (async () => {
      const { data, error } = await secureStudentOperations.getStudentByIdSecure(id);
      if (error) {
        console.error('Error fetching student by ID with secure operations:', error);
        // Cache null briefly to avoid hammering endpoint on repeated failures
        studentByIdCache.set(id, { value: null, expiresAt: now + 5_000 });
        throw new Error(error.message || 'Failed to fetch student');
      }

      studentByIdCache.set(id, { value: data ?? null, expiresAt: Date.now() + STUDENT_BY_ID_TTL_MS });
      return data ?? null;
    })()
      .finally(() => {
        // Clear in-flight marker after completion
        studentByIdInFlight.delete(id);
      });

    studentByIdInFlight.set(id, promise);
    return await promise;
  } catch (error) {
    console.error('Error in getStudentById:', error);
    throw error;
  }
};

// Get students for a specific parent
export const getStudentsForParent = async (parentId: string): Promise<Child[]> => {
  try {
    // First get the student IDs related to this parent
    const { data: relations, error: relationsError } = await supabase
      .from('student_parents')
      .select('student_id')
      .eq('parent_id', parentId);
    
    if (relationsError) {
      console.error('Error fetching student relations:', relationsError);
      throw new Error(relationsError.message);
    }
    
    if (!relations || relations.length === 0) {
      return [];
    }
    
    // Then get the actual student records (excluding deleted)
    const studentIds = relations.map(rel => rel.student_id);
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .in('id', studentIds)
      .is('deleted_at', null);
    
    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      throw new Error(studentsError.message);
    }
    
    // Transform the data to match our application's structure
    return students.map((student) => ({
      id: student.id,
      name: student.name,
      classId: student.class_id || '',
      parentIds: [parentId], // We know this parent is related at least
      avatar: student.avatar || undefined
    }));
  } catch (error) {
    console.error('Error in getStudentsForParent:', error);
    throw error;
  }
};
