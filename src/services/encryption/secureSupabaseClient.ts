import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import type { Database } from '@/integrations/supabase/types';

// Table names from Database type
type TableName = keyof Database['public']['Tables'];

// Secure operations using server-side encryption via edge functions
export class SecureOperations {
  private static instance: SecureOperations;

  private constructor() {}

  public static getInstance(): SecureOperations {
    if (!SecureOperations.instance) {
      SecureOperations.instance = new SecureOperations();
    }
    return SecureOperations.instance;
  }

  // Secure operations for parents table
  async getParentsSecure(includeDeleted: boolean = false) {
    try {
      const { data, error } = await supabase.functions.invoke('secure-parents', {
        body: { 
          operation: 'getParents', 
          includeDeleted 
        }
      });
      
      if (error) {
        logger.error('Edge function error:', error);
        throw error;
      }
      
      // Decrypt the encrypted_data field for each parent
      const { decryptData } = await import('./encryptionService');
      const decryptedParents = await Promise.all(
        (data.data || []).map(async (parent: any) => {
          return await decryptData(parent.encrypted_data);
        })
      );
      
      return { data: decryptedParents, error: data.error };
    } catch (error) {
      logger.error('Secure parent fetch failed:', error);
      return { data: null, error };
    }
  }

  // Secure parent creation
  async createParentSecure(parentData: any) {
    try {
      // Encrypt the entire parent data as a single object
      const { encryptData } = await import('./encryptionService');
      const encrypted_data = await encryptData(parentData);
      
      const { data, error } = await supabase.functions.invoke('secure-parents', {
        body: { 
          operation: 'createParent', 
          data: { encrypted_data }
        }
      });
      
      if (error) {
        logger.error('Edge function error:', error);
        throw error;
      }
      
      return { data: data.data, error: data.error };
    } catch (error) {
      logger.error('Secure parent creation failed:', error);
      return { data: null, error };
    }
  }

  // Secure parent update
  async updateParentSecure(parentId: string, updateData: any) {
    try {
      // Encrypt the entire update data as a single object
      const { encryptData } = await import('./encryptionService');
      const encrypted_data = await encryptData(updateData);
      
      const { data, error } = await supabase.functions.invoke('secure-parents', {
        body: { 
          operation: 'updateParent', 
          data: { parentId, encrypted_data }
        }
      });
      
      if (error) {
        logger.error('Edge function error:', error);
        throw error;
      }
      
      return { data: data.data, error: data.error };
    } catch (error) {
      logger.error('Secure parent update failed:', error);
      return { data: null, error };
    }
  }

  // Secure operations for students table
  async getStudentsSecure(includeDeleted: boolean = false) {
    try {
      const { data, error } = await supabase.functions.invoke('secure-students', {
        body: { 
          operation: 'getStudents', 
          includeDeleted 
        }
      });
      
      if (error) {
        logger.error('Edge function error:', error);
        throw error;
      }
      
      // Decrypt the encrypted_data field for each student
      const { decryptData } = await import('./encryptionService');
      const decryptedStudents = await Promise.all(
        (data.data || []).map(async (student: any) => {
          return await decryptData(student.encrypted_data);
        })
      );
      
      return { data: decryptedStudents, error: data.error };
    } catch (error) {
      logger.error('Secure student fetch failed:', error);
      return { data: null, error };
    }
  }

  // Secure student creation
  async createStudentSecure(studentData: any) {
    try {
      // Encrypt the entire student data as a single object
      const { encryptData } = await import('./encryptionService');
      const encrypted_data = await encryptData(studentData);
      
      const { data, error } = await supabase.functions.invoke('secure-students', {
        body: { 
          operation: 'createStudent', 
          data: { encrypted_data }
        }
      });
      
      if (error) {
        logger.error('Edge function error:', error);
        throw error;
      }
      
      return { data: data.data, error: data.error };
    } catch (error) {
      logger.error('Secure student creation failed:', error);
      return { data: null, error };
    }
  }

  // Secure student update
  async updateStudentSecure(studentId: string, updateData: any) {
    try {
      // Encrypt the entire update data as a single object
      const { encryptData } = await import('./encryptionService');
      const encrypted_data = await encryptData(updateData);
      
      const { data, error } = await supabase.functions.invoke('secure-students', {
        body: { 
          operation: 'updateStudent', 
          data: { studentId, encrypted_data }
        }
      });
      
      if (error) {
        logger.error('Edge function error:', error);
        throw error;
      }
      
      return { data: data.data, error: data.error };
    } catch (error) {
      logger.error('Secure student update failed:', error);
      return { data: null, error };
    }
  }

  // Get the regular supabase client for non-sensitive operations
  get client() {
    return supabase;
  }
}

// Export singleton instance
export const secureOperations = SecureOperations.getInstance();