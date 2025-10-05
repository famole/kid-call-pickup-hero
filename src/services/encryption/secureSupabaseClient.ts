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

      if (data?.error) {
        logger.error('Server error in getParentsSecure:', data.error);
        throw new Error(data.error);
      }

      // Decrypt the data
      const { decryptData } = await import('./encryptionService');
      const parentsData = await decryptData(data.data.encrypted_data);

      return { data: parentsData, error: null };
    } catch (error) {
      logger.error('Error in getParentsSecure:', error);
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
      
      // Decrypt the single encrypted_data field containing the result
      const { decryptData } = await import('./encryptionService');
      const decryptedResult = await decryptData(data.data.encrypted_data);
      
      return { data: decryptedResult, error: data.error };
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
      
      // Decrypt the single encrypted_data field containing the result
      const { decryptData } = await import('./encryptionService');
      const decryptedResult = await decryptData(data.data.encrypted_data);
      
      return { data: decryptedResult, error: data.error };
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

      if (data?.error) {
        logger.error('Server error in getStudentsSecure:', data.error);
        throw new Error(data.error);
      }
      
      // Decrypt the entire students array from the single encrypted_data field
      const { decryptData } = await import('./encryptionService');
      const studentsData = await decryptData(data.data.encrypted_data);
      
      return { data: studentsData, error: null };
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
      
      // Decrypt the single encrypted_data field containing the result
      const { decryptData } = await import('./encryptionService');
      const decryptedResult = await decryptData(data.data.encrypted_data);
      
      return { data: decryptedResult, error: data.error };
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
      
      // Decrypt the single encrypted_data field containing the result
      const { decryptData } = await import('./encryptionService');
      const decryptedResult = await decryptData(data.data.encrypted_data);
      
      return { data: decryptedResult, error: data.error };
    } catch (error) {
      logger.error('Secure student update failed:', error);
      return { data: null, error };
    }
  }

  // Secure operations for parents with students (optimized with pagination and search)
  async getParentsWithStudentsSecure(
    includedRoles?: string[], 
    includeDeleted: boolean = false,
    page: number = 1,
    pageSize: number = 50,
    searchTerm?: string
  ) {
    try {
      const { data, error } = await supabase.functions.invoke('secure-parents', {
        body: {
          operation: 'getParentsWithStudents',
          data: { includedRoles, includeDeleted, page, pageSize, searchTerm }
        }
      });

      if (error) {
        logger.error('Edge function error:', error);
        throw error;
      }

      if (data?.error) {
        logger.error('Server error in getParentsWithStudentsSecure:', data.error);
        throw new Error(data.error);
      }

      // Decrypt the data (includes parents array and pagination metadata)
      const { decryptData } = await import('./encryptionService');
      const result = await decryptData(data.data.encrypted_data);

      return { data: result, error: null };
    } catch (error) {
      logger.error('Error in getParentsWithStudentsSecure:', error);
      return { data: null, error };
    }
  }

  // Secure operation to get parent by email (optimized)
  async getParentByEmailSecure(email: string) {
    try {
      const response = await supabase.functions.invoke('secure-parents', {
        body: {
          operation: 'getParentByEmail',
          data: { email }
        }
      });

      if (response.error) {
        logger.error('Edge function error:', response.error);
        throw response.error;
      }

      const data = response.data;
      if (data && data.error) {
        logger.error('Server error in getParentByEmailSecure:', data.error);
        throw new Error(data.error);
      }

      // Decrypt the data
      const { decryptData } = await import('./encryptionService');
      const result = await decryptData(data.data.encrypted_data);

      return { data: result, error: null };
    } catch (error) {
      logger.error('Error in getParentByEmailSecure:', error);
      return { data: null, error };
    }
  }

  // Secure operation to get parent by identifier (ID, email, or username)
  async getParentByIdentifierSecure(identifier: string) {
    try {
      const { data, error } = await supabase.functions.invoke('secure-parents', {
        body: { 
          operation: 'getParentByIdentifier',
          data: { identifier }
        }
      });

      if (error) {
        logger.error('Edge function error:', error);
        throw error;
      }

      if (data?.error) {
        logger.error('Server error in getParentByIdentifierSecure:', data.error);
        throw new Error(data.error);
      }

      // Decrypt the data
      const { decryptData } = await import('./encryptionService');
      const parentData = await decryptData(data.data.encrypted_data);

      return { data: parentData, error: null };
    } catch (error) {
      logger.error('Error in getParentByIdentifierSecure:', error);
      return { data: null, error };
    }
  }

  // Secure operation to get parents by IDs (optimized)
  async getParentsByIdsSecure(ids: string[]) {
    try {
      const response = await supabase.functions.invoke('secure-parents', {
        body: {
          operation: 'getParentsByIds',
          data: { parentIds: ids }
        }
      });

      if (response.error) {
        logger.error('Edge function error:', response.error);
        throw response.error;
      }

      const data = response.data;
      if (data && data.error) {
        logger.error('Server error in getParentsByIdsSecure:', data.error);
        throw new Error(data.error);
      }

      // Decrypt the data
      const { decryptData } = await import('./encryptionService');
      const result = await decryptData(data.data.encrypted_data);

      return { data: result, error: null };
    } catch (error) {
      logger.error('Error in getParentsByIdsSecure:', error);
      return { data: null, error };
    }
  }

  // Secure operation to get parents who share students with current parent
  async getParentsWhoShareStudentsSecure(currentParentId: string) {
    try {
      const response = await supabase.functions.invoke('secure-parents', {
        body: {
          operation: 'getParentsWhoShareStudents',
          data: { currentParentId }
        }
      });

      if (response.error) {
        logger.error('Edge function error:', response.error);
        throw response.error;
      }

      const data = response.data;
      if (data && data.error) {
        logger.error('Server error in getParentsWhoShareStudentsSecure:', data.error);
        throw new Error(data.error);
      }

      // Decrypt the data
      const { decryptData } = await import('./encryptionService');
      const result = await decryptData(data.data.encrypted_data);

      return { data: result, error: null };
    } catch (error) {
      logger.error('Error in getParentsWhoShareStudentsSecure:', error);
      return { data: null, error };
    }
  }

  // Secure operation to search parents by search term
  async searchParentsSecure(searchTerm: string, currentParentId: string): Promise<any[]> {
    if (!searchTerm || searchTerm.trim().length < 3) {
      logger.info('searchParentsSecure: Search term too short');
      return [];
    }

    if (!currentParentId) {
      logger.error('searchParentsSecure: No current parent ID provided');
      return [];
    }

    try {
      const response = await supabase.functions.invoke('secure-parents', {
        body: {
          operation: 'searchParents',
          data: { searchTerm, currentParentId }
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to search parents');
      }

      if (!response.data || !response.data.data) {
        logger.error('searchParentsSecure: Invalid response format', response);
        return [];
      }

      // Decrypt the search results
      const { decryptData } = await import('./encryptionService');
      const decryptedResults = await decryptData(response.data.data.encrypted_data);

      return decryptedResults;
    } catch (error) {
      logger.error('searchParentsSecure: Error searching parents:', error);
      throw error;
    }
  }

  // Get the regular supabase client for non-sensitive operations
  get client() {
    return supabase;
  }
}

// Export singleton instance
export const secureOperations = SecureOperations.getInstance();