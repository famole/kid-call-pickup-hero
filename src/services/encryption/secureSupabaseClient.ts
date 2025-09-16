import { supabase } from '@/integrations/supabase/client';
import { encryptData, decryptData, isEncryptionSupported } from './encryptionService';
import { logger } from '@/utils/logger';
import type { Database } from '@/integrations/supabase/types';

// Define sensitive fields that should be encrypted
const SENSITIVE_FIELDS = [
  'email',
  'phone', 
  'name',
  'username'
];

// Define sensitive student fields
const SENSITIVE_STUDENT_FIELDS = [
  'name'
];

// Table names from Database type
type TableName = keyof Database['public']['Tables'];

// Secure operations for specific sensitive data operations
export class SecureOperations {
  private static instance: SecureOperations;
  private encryptionEnabled: boolean;

  private constructor() {
    this.encryptionEnabled = isEncryptionSupported();
    if (!this.encryptionEnabled) {
      logger.warn('Encryption not supported in this environment, falling back to standard operations');
    }
  }

  public static getInstance(): SecureOperations {
    if (!SecureOperations.instance) {
      SecureOperations.instance = new SecureOperations();
    }
    return SecureOperations.instance;
  }

  // Secure operations for parents table
  async getParentsSecure(includeDeleted: boolean = false) {
    try {
      let query = supabase
        .from('parents')
        .select(`
          id,
          name,
          email,
          username,
          phone,
          role,
          created_at,
          updated_at,
          deleted_at
        `);
      
      if (!includeDeleted) {
        query = query.is('deleted_at', null);
      }
      
      const { data, error } = await query.order('name');
      
      if (error) throw error;
      
      // Decrypt sensitive data if encryption is enabled
      if (this.encryptionEnabled && data) {
        const decryptedData = await Promise.all(
          data.map(async (item: any) => {
            try {
              return await this.decryptItem(item);
            } catch (decryptError) {
              logger.warn('Failed to decrypt parent item, returning as-is:', decryptError);
              return item;
            }
          })
        );
        return { data: decryptedData, error: null };
      }
      
      return { data, error };
    } catch (error) {
      logger.error('Secure parent fetch failed:', error);
      return { data: null, error };
    }
  }

  // Secure parent creation
  async createParentSecure(parentData: any) {
    try {
      let processedData = parentData;
      
      if (this.encryptionEnabled) {
        processedData = await this.encryptItem(parentData);
      }

      const result = await supabase
        .from('parents')
        .insert(processedData)
        .select();
      
      if (result.error) throw result.error;
      
      // Decrypt returned data
      if (this.encryptionEnabled && result.data && result.data.length > 0) {
        const decryptedData = await Promise.all(
          result.data.map(item => this.decryptItem(item))
        );
        return { data: decryptedData, error: null };
      }
      
      return result;
    } catch (error) {
      logger.error('Secure parent creation failed:', error);
      return { data: null, error };
    }
  }

  // Secure parent update
  async updateParentSecure(parentId: string, updateData: any) {
    try {
      let processedData = updateData;
      
      if (this.encryptionEnabled) {
        processedData = await this.encryptItem(updateData);
      }

      const result = await supabase
        .from('parents')
        .update(processedData)
        .eq('id', parentId)
        .select();
      
      if (result.error) throw result.error;
      
      // Decrypt returned data
      if (this.encryptionEnabled && result.data && result.data.length > 0) {
        const decryptedData = await Promise.all(
          result.data.map(item => this.decryptItem(item))
        );
        return { data: decryptedData, error: null };
      }
      
      return result;
    } catch (error) {
      logger.error('Secure parent update failed:', error);
      return { data: null, error };
    }
  }

  // Encrypt sensitive fields in an item
  private async encryptItem(item: any): Promise<any> {
    if (!item || typeof item !== 'object') return item;
    
    const result = { ...item };
    
    for (const field of SENSITIVE_FIELDS) {
      if (result[field] !== undefined && result[field] !== null && typeof result[field] === 'string') {
        try {
          result[field] = await encryptData(result[field]);
        } catch (error) {
          logger.warn(`Failed to encrypt field ${field}:`, error);
        }
      }
    }
    
    return result;
  }

  // Decrypt sensitive fields in an item
  private async decryptItem(item: any): Promise<any> {
    if (!item || typeof item !== 'object') return item;
    
    const result = { ...item };
    
    for (const field of SENSITIVE_FIELDS) {
      if (result[field] && typeof result[field] === 'string' && result[field].length > 50) {
        try {
          // Check if this looks like encrypted data (base64 encoded, longer than typical field values)
          result[field] = await decryptData(result[field]);
        } catch (error) {
          // If decryption fails, assume it's not encrypted data and leave as-is
          logger.log(`Field ${field} not encrypted or decryption failed, leaving as-is`);
        }
      }
    }
    
    return result;
  }

  // Secure operations for students table
  async getStudentsSecure(includeDeleted: boolean = false) {
    try {
      let query = supabase
        .from('students')
        .select(`
          id,
          name,
          class_id,
          avatar,
          created_at,
          updated_at,
          deleted_at
        `);
      
      if (!includeDeleted) {
        query = query.is('deleted_at', null);
      }
      
      const { data, error } = await query.order('name');
      
      if (error) throw error;
      
      // Decrypt sensitive data if encryption is enabled
      if (this.encryptionEnabled && data) {
        const decryptedData = await Promise.all(
          data.map(async (item: any) => {
            try {
              return await this.decryptStudentItem(item);
            } catch (decryptError) {
              logger.warn('Failed to decrypt student item, returning as-is:', decryptError);
              return item;
            }
          })
        );
        return { data: decryptedData, error: null };
      }
      
      return { data, error };
    } catch (error) {
      logger.error('Secure student fetch failed:', error);
      return { data: null, error };
    }
  }

  // Secure student creation
  async createStudentSecure(studentData: any) {
    try {
      let processedData = studentData;
      
      if (this.encryptionEnabled) {
        processedData = await this.encryptStudentItem(studentData);
      }

      const result = await supabase
        .from('students')
        .insert(processedData)
        .select();
      
      if (result.error) throw result.error;
      
      // Decrypt returned data
      if (this.encryptionEnabled && result.data && result.data.length > 0) {
        const decryptedData = await Promise.all(
          result.data.map(item => this.decryptStudentItem(item))
        );
        return { data: decryptedData, error: null };
      }
      
      return result;
    } catch (error) {
      logger.error('Secure student creation failed:', error);
      return { data: null, error };
    }
  }

  // Secure student update
  async updateStudentSecure(studentId: string, updateData: any) {
    try {
      let processedData = updateData;
      
      if (this.encryptionEnabled) {
        processedData = await this.encryptStudentItem(updateData);
      }

      const result = await supabase
        .from('students')
        .update(processedData)
        .eq('id', studentId)
        .select();
      
      if (result.error) throw result.error;
      
      // Decrypt returned data
      if (this.encryptionEnabled && result.data && result.data.length > 0) {
        const decryptedData = await Promise.all(
          result.data.map(item => this.decryptStudentItem(item))
        );
        return { data: decryptedData, error: null };
      }
      
      return result;
    } catch (error) {
      logger.error('Secure student update failed:', error);
      return { data: null, error };
    }
  }

  // Encrypt sensitive fields in a student item
  private async encryptStudentItem(item: any): Promise<any> {
    if (!item || typeof item !== 'object') return item;
    
    const result = { ...item };
    
    for (const field of SENSITIVE_STUDENT_FIELDS) {
      if (result[field] !== undefined && result[field] !== null && typeof result[field] === 'string') {
        try {
          result[field] = await encryptData(result[field]);
        } catch (error) {
          logger.warn(`Failed to encrypt student field ${field}:`, error);
        }
      }
    }
    
    return result;
  }

  // Decrypt sensitive fields in a student item
  private async decryptStudentItem(item: any): Promise<any> {
    if (!item || typeof item !== 'object') return item;
    
    const result = { ...item };
    
    for (const field of SENSITIVE_STUDENT_FIELDS) {
      if (result[field] && typeof result[field] === 'string' && result[field].length > 50) {
        try {
          // Check if this looks like encrypted data (base64 encoded, longer than typical field values)
          result[field] = await decryptData(result[field]);
        } catch (error) {
          // If decryption fails, assume it's not encrypted data and leave as-is
          logger.log(`Student field ${field} not encrypted or decryption failed, leaving as-is`);
        }
      }
    }
    
    return result;
  }
}

// Export singleton instance
export const secureOperations = SecureOperations.getInstance();