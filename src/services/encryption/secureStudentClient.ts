import { supabase } from "@/integrations/supabase/client";
import { Child } from "@/types";
import { logger } from "@/utils/logger";

// Encryption utilities - must match server-side implementation
const ENCRYPTION_KEY = import.meta.env.VITE_PASSWORD_ENCRYPTION_KEY || 'U9.#s!_So2*';

async function getEncryptionKey() {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(ENCRYPTION_KEY),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('upsy-secure-salt-2024'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

async function encryptData(data: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);
    
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedData), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    logger.error('Encryption failed:', error);
    return data; // Return original data if encryption fails
  }
}

async function decryptData(encryptedData: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );
    
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return new TextDecoder().decode(decryptedData);
  } catch (error) {
    logger.error('Decryption failed:', error);
    return encryptedData; // Return original if decryption fails
  }
}

async function encryptObject(obj: any): Promise<string> {
  try {
    const jsonString = JSON.stringify(obj);
    return await encryptData(jsonString);
  } catch (error) {
    logger.error('Object encryption failed:', error);
    return JSON.stringify(obj); // Return original if encryption fails
  }
}

async function decryptObject(encryptedString: string): Promise<any> {
  try {
    logger.log('Attempting to decrypt student data, encrypted length:', encryptedString?.length);
    const decryptedString = await decryptData(encryptedString);
    const result = JSON.parse(decryptedString);
    logger.log('Successfully decrypted student data, result type:', typeof result, 'length:', Array.isArray(result) ? result.length : 'not array');
    return result;
  } catch (error) {
    logger.error('Object decryption failed:', error);
    try {
      return JSON.parse(encryptedString); // Try parsing original if decryption fails
    } catch {
      return encryptedString; // Return string if JSON parsing fails
    }
  }
}

// Secure student operations
export const secureStudentOperations = {
  // Get all students with encryption
  getStudentsSecure: async (includeDeleted: boolean = false): Promise<{ data: Child[] | null; error: any }> => {
    try {
      logger.log('Fetching students with secure operations, includeDeleted:', includeDeleted);
      
      const { data, error } = await supabase.functions.invoke('secure-students', {
        body: {
          operation: 'getStudents',
          includeDeleted
        }
      });

      if (error) {
        logger.error('Error from secure-students function:', error);
        return { data: null, error };
      }

      if (data?.error) {
        logger.error('Error in secure-students response:', data.error);
        return { data: null, error: data.error };
      }

      // Decrypt the response
      const decryptedData = await decryptObject(data.data.encrypted_data);
      logger.log('Decrypted students data:', decryptedData?.length || 0, 'students');
      
      // Map snake_case to camelCase for frontend
      const mappedStudents: Child[] = (decryptedData || []).map((student: any) => ({
        id: student.id,
        name: student.name,
        classId: student.class_id || '',
        parentIds: student.parent_ids || [],
        avatar: student.avatar
      }));
      
      // Log sample data for debugging
      if (mappedStudents.length > 0) {
        const sample = mappedStudents[0];
        logger.log(`Sample student mapping: ${sample.name} has ${sample.parentIds.length} parent(s): ${sample.parentIds.join(', ')}`);
      }
      
      return { data: mappedStudents, error: null };
    } catch (error) {
      logger.error('Error in getStudentsSecure:', error);
      return { data: null, error };
    }
  },

  // Get student by ID with encryption
  getStudentByIdSecure: async (id: string): Promise<{ data: Child | null; error: any }> => {
    try {
      logger.log('Fetching student by ID with secure operations:', id);
      // Call edge function to fetch a single student by id
      const { data, error } = await supabase.functions.invoke('secure-students', {
        body: {
          operation: 'getStudentById',
          data: { id }
        }
      });

      if (error) {
        logger.error('Error from secure-students function:', error);
        return { data: null, error };
      }

      if (data?.error) {
        logger.error('Error in secure-students response:', data.error);
        return { data: null, error: data.error };
      }

      const decrypted = await decryptObject(data.data.encrypted_data);
      logger.log('Decrypted student by ID present:', decrypted ? 'yes' : 'no');
      
      // Map snake_case to camelCase for frontend
      if (decrypted) {
        const mappedStudent: Child = {
          id: decrypted.id,
          name: decrypted.name,
          classId: decrypted.class_id || '',
          parentIds: decrypted.parent_ids || [],
          avatar: decrypted.avatar
        };
        return { data: mappedStudent, error: null };
      }
      
      return { data: null, error: null };
    } catch (error) {
      logger.error('Error in getStudentByIdSecure:', error);
      return { data: null, error };
    }
  },
  // Get students with parents (for authorization assignment)
  getStudentsWithParentsSecure: async (studentIds: string[]): Promise<{ data: any[] | null; error: any }> => {
    try {
      logger.log('Fetching students with parents for authorization:', studentIds);

      const { data, error } = await supabase.functions.invoke('secure-students', {
        body: {
          operation: 'getStudentsWithParents',
          data: { studentIds }
        }
      });

      if (error) {
        logger.error('Error from secure-students function:', error);
        return { data: null, error };
      }

      if (data?.error) {
        logger.error('Error in secure-students response:', data.error);
        return { data: null, error: data.error };
      }

      const decrypted = await decryptObject(data.data.encrypted_data);
      logger.log('Decrypted students with parents present:', decrypted ? decrypted.length : 0);

      // Map snake_case to camelCase for frontend
      if (decrypted && Array.isArray(decrypted)) {
        const mappedStudents = decrypted.map((student: any) => ({
          id: student.id,
          name: student.name,
          classId: student.class_id || '',
          parentIds: student.parentIds || [],
          avatar: student.avatar,
          parents: student.parents || []
        }));
        return { data: mappedStudents, error: null };
      }

      return { data: [], error: null };
    } catch (error) {
      logger.error('Error in getStudentsWithParentsSecure:', error);
      return { data: null, error };
    }
  },

  // Create student with encryption
  createStudentSecure: async (studentData: Partial<Child>): Promise<{ data: Child[] | null; error: any }> => {
    try {
      logger.log('Creating student with secure operations');

      const encryptedData = await encryptObject(studentData);

      const { data, error } = await supabase.functions.invoke('secure-students', {
        body: {
          operation: 'createStudent',
          data: { encrypted_data: encryptedData }
        }
      });

      if (error) {
        logger.error('Error from secure-students function:', error);
        return { data: null, error };
      }

      if (data?.error) {
        logger.error('Error in secure-students response:', data.error);
        return { data: null, error: data.error };
      }

      // Decrypt the response
      const decryptedData = await decryptObject(data.data.encrypted_data);
      logger.log('Created student successfully');

      return { data: decryptedData, error: null };
    } catch (error) {
      logger.error('Error in createStudentSecure:', error);
      return { data: null, error };
    }
  },

  // Update student with encryption
  updateStudentSecure: async (studentId: string, studentData: Partial<Child>): Promise<{ data: Child[] | null; error: any }> => {
    try {
      logger.log('Updating student with secure operations:', studentId);

      const encryptedData = await encryptObject(studentData);

      const { data, error } = await supabase.functions.invoke('secure-students', {
        body: {
          operation: 'updateStudent',
          data: {
            studentId,
            encrypted_data: encryptedData
          }
        }
      });

      if (error) {
        logger.error('Error from secure-students function:', error);
        return { data: null, error };
      }

      if (data?.error) {
        logger.error('Error in secure-students response:', data.error);
        return { data: null, error: data.error };
      }

      // Decrypt the response
      const decryptedData = await decryptObject(data.data.encrypted_data);
      logger.log('Updated student successfully');

      return { data: decryptedData, error: null };
    } catch (error) {
      logger.error('Error in updateStudentSecure:', error);
      return { data: null, error };
    }
  }
};
