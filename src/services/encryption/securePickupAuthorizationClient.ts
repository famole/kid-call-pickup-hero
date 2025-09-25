import { supabase } from "@/integrations/supabase/client";
import { encryptData, decryptData } from './encryptionService';
import { logger } from '@/utils/logger';

export interface PickupAuthorization {
  id: string;
  authorizingParentId: string;
  authorizedParentId: string;
  studentId: string;
  studentIds?: string[];
  startDate: string;
  endDate: string;
  allowedDaysOfWeek: number[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PickupAuthorizationWithDetails extends PickupAuthorization {
  authorizingParent?: {
    id: string;
    name: string;
    email: string;
    role?: 'parent' | 'teacher' | 'admin' | 'superadmin' | 'family' | 'other';
  };
  authorizedParent?: {
    id: string;
    name: string;
    email: string;
    role?: 'parent' | 'teacher' | 'admin' | 'superadmin' | 'family' | 'other';
  };
  student?: {
    id: string;
    name: string;
  };
}

export interface PickupAuthorizationInput {
  authorizedParentId: string;
  studentId?: string;
  studentIds?: string[];
  startDate: string;
  endDate: string;
  allowedDaysOfWeek: number[];
}

class SecurePickupAuthorizationOperations {
  
  // Get pickup authorizations for the current parent
  async getPickupAuthorizationsForParentSecure(): Promise<{ data: PickupAuthorizationWithDetails[] | null; error: any }> {
    try {
      logger.info('Getting secure pickup authorizations for parent');
      
      const { data, error } = await supabase.functions.invoke('secure-pickup-authorizations', {
        body: { 
          operation: 'getPickupAuthorizationsForParent'
        }
      });

      if (error) {
        logger.error('Secure pickup authorizations fetch failed:', error);
        return { data: null, error };
      }

      if (!data) {
        logger.error('No data received from secure pickup authorizations');
        return { data: [], error: null };
      }

      if (data.error) {
        logger.error('Secure pickup authorizations operation failed:', data.error);
        return { data: null, error: new Error(data.error || 'Unknown error') };
      }

      if (!data?.data?.encrypted_data) {
        logger.warn('No encrypted data received from secure pickup authorizations');
        return { data: [], error: null };
      }

      // Decrypt the pickup authorizations data
      const decryptedData = await decryptData(data.data.encrypted_data);
      
      if (!decryptedData) {
        logger.warn('Decryption returned empty data');
        return { data: [], error: null };
      }

      if (!Array.isArray(decryptedData)) {
        logger.warn('Parsed authorizations is not an array:', decryptedData);
        return { data: [], error: null };
      }

      // Transform to PickupAuthorizationWithDetails format
      const authorizations: PickupAuthorizationWithDetails[] = decryptedData.map((item: any) => ({
        id: item.id,
        authorizingParentId: item.authorizing_parent_id,
        authorizedParentId: item.authorized_parent_id,
        studentId: item.student_id,
        studentIds: item.student_ids,
        startDate: item.start_date,
        endDate: item.end_date,
        allowedDaysOfWeek: item.allowed_days_of_week || [0,1,2,3,4,5,6],
        isActive: item.is_active,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        authorizingParent: item.authorizing_parent,
        authorizedParent: item.authorized_parent,
        student: item.student
      }));

      return { data: authorizations, error: null };
    } catch (error) {
      logger.error('Error in getPickupAuthorizationsForParentSecure:', error);
      return { data: [], error };
    }
  }

  // Get pickup authorizations where the given parent is authorized
  async getPickupAuthorizationsForAuthorizedParentSecure(parentId?: string): Promise<{ data: PickupAuthorizationWithDetails[] | null; error: any }> {
    try {
      logger.info('Getting secure pickup authorizations for authorized parent');
      
      const dataToEncrypt = { parentId };
      const encryptedData = await encryptData(JSON.stringify(dataToEncrypt));

      const { data, error } = await supabase.functions.invoke('secure-pickup-authorizations', {
        body: { 
          operation: 'getPickupAuthorizationsForAuthorizedParent',
          data: encryptedData
        }
      });

      if (error) {
        logger.error('Secure authorized pickup authorizations fetch failed:', error);
        return { data: null, error };
      }

      if (!data) {
        logger.error('No data received from secure authorized pickup authorizations');
        return { data: [], error: null };
      }

      if (data.error) {
        logger.error('Secure authorized pickup authorizations operation failed:', data.error);
        return { data: null, error: new Error(data.error || 'Unknown error') };
      }

      if (!data?.data?.encrypted_data) {
        logger.warn('No encrypted data received from secure authorized pickup authorizations');
        return { data: [], error: null };
      }

      // Decrypt the pickup authorizations data
      const decryptedData = await decryptData(data.data.encrypted_data);
      
      if (!decryptedData) {
        logger.warn('Decryption returned empty data');
        return { data: [], error: null };
      }

      if (!Array.isArray(decryptedData)) {
        logger.warn('Parsed authorized authorizations is not an array:', decryptedData);
        return { data: [], error: null };
      }

      // Transform to PickupAuthorizationWithDetails format
      const authorizations: PickupAuthorizationWithDetails[] = decryptedData.map((item: any) => ({
        id: item.id,
        authorizingParentId: item.authorizing_parent_id,
        authorizedParentId: item.authorized_parent_id,
        studentId: item.student_id,
        studentIds: item.student_ids,
        startDate: item.start_date,
        endDate: item.end_date,
        allowedDaysOfWeek: item.allowed_days_of_week || [0,1,2,3,4,5,6],
        isActive: item.is_active,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        authorizingParent: item.authorizing_parent,
        student: item.students || item.student
      }));

      return { data: authorizations, error: null };
    } catch (error) {
      logger.error('Error in getPickupAuthorizationsForAuthorizedParentSecure:', error);
      return { data: [], error };
    }
  }

  // Create a new pickup authorization
  async createPickupAuthorizationSecure(authorizationData: PickupAuthorizationInput): Promise<{ data: PickupAuthorization | null; error: any }> {
    try {
      logger.info('Creating secure pickup authorization');
      
      const encryptedData = await encryptData(JSON.stringify(authorizationData));

      const { data, error } = await supabase.functions.invoke('secure-pickup-authorizations', {
        body: { 
          operation: 'createPickupAuthorization',
          data: encryptedData
        }
      });

      if (error) {
        logger.error('Secure pickup authorization creation failed:', error);
        return { data: null, error };
      }

      if (!data) {
        logger.error('No data received from secure pickup authorization creation');
        return { data: null, error: new Error('No response data') };
      }

      if (data.error) {
        logger.error('Secure pickup authorization creation operation failed:', data.error);
        return { data: null, error: new Error(data.error || 'Unknown error') };
      }

      // Decrypt the response data
      const decryptedData = await decryptData(data.data.encrypted_data);
      
      // Transform to PickupAuthorization format
      const authorization: PickupAuthorization = {
        id: decryptedData.id,
        authorizingParentId: decryptedData.authorizing_parent_id,
        authorizedParentId: decryptedData.authorized_parent_id,
        studentId: decryptedData.student_id,
        studentIds: decryptedData.student_ids,
        startDate: decryptedData.start_date,
        endDate: decryptedData.end_date,
        allowedDaysOfWeek: decryptedData.allowed_days_of_week || [0,1,2,3,4,5,6],
        isActive: decryptedData.is_active,
        createdAt: decryptedData.created_at,
        updatedAt: decryptedData.updated_at
      };

      return { data: authorization, error: null };
    } catch (error) {
      logger.error('Error in createPickupAuthorizationSecure:', error);
      return { data: null, error };
    }
  }

  // Update a pickup authorization
  async updatePickupAuthorizationSecure(
    id: string, 
    updates: Partial<PickupAuthorizationInput & { isActive: boolean }>
  ): Promise<{ data: PickupAuthorization | null; error: any }> {
    try {
      logger.info('Updating secure pickup authorization');
      
      const updateData = { id, ...updates };
      const encryptedData = await encryptData(JSON.stringify(updateData));

      const { data, error } = await supabase.functions.invoke('secure-pickup-authorizations', {
        body: { 
          operation: 'updatePickupAuthorization',
          data: encryptedData
        }
      });

      if (error) {
        logger.error('Secure pickup authorization update failed:', error);
        return { data: null, error };
      }

      if (!data) {
        logger.error('No data received from secure pickup authorization update');
        return { data: null, error: new Error('No response data') };
      }

      if (data.error) {
        logger.error('Secure pickup authorization update operation failed:', data.error);
        return { data: null, error: new Error(data.error || 'Unknown error') };
      }

      // Decrypt the response data
      const decryptedData = await decryptData(data.data.encrypted_data);
      
      // Transform to PickupAuthorization format
      const authorization: PickupAuthorization = {
        id: decryptedData.id,
        authorizingParentId: decryptedData.authorizing_parent_id,
        authorizedParentId: decryptedData.authorized_parent_id,
        studentId: decryptedData.student_id,
        studentIds: decryptedData.student_ids,
        startDate: decryptedData.start_date,
        endDate: decryptedData.end_date,
        allowedDaysOfWeek: decryptedData.allowed_days_of_week || [0,1,2,3,4,5,6],
        isActive: decryptedData.is_active,
        createdAt: decryptedData.created_at,
        updatedAt: decryptedData.updated_at
      };

      return { data: authorization, error: null };
    } catch (error) {
      logger.error('Error in updatePickupAuthorizationSecure:', error);
      return { data: null, error };
    }
  }

  // Delete a pickup authorization
  async deletePickupAuthorizationSecure(id: string): Promise<{ data: boolean | null; error: any }> {
    try {
      logger.info('Deleting secure pickup authorization');
      
      const deleteData = { id };
      const encryptedData = await encryptData(JSON.stringify(deleteData));

      const { data, error } = await supabase.functions.invoke('secure-pickup-authorizations', {
        body: { 
          operation: 'deletePickupAuthorization',
          data: encryptedData
        }
      });

      if (error) {
        logger.error('Secure pickup authorization deletion failed:', error);
        return { data: null, error };
      }

      if (!data) {
        logger.error('No data received from secure pickup authorization deletion');
        return { data: null, error: new Error('No response data') };
      }

      if (data.error) {
        logger.error('Secure pickup authorization deletion operation failed:', data.error);
        return { data: null, error: new Error(data.error || 'Unknown error') };
      }

      return { data: true, error: null };
    } catch (error) {
      logger.error('Error in deletePickupAuthorizationSecure:', error);
      return { data: null, error };
    }
  }

  // Get parents available for pickup authorization
  async getAvailableParentsForAuthorizationSecure(): Promise<{ 
    data: { parents: any[]; sharedStudents: Record<string, string[]> } | null; 
    error: any 
  }> {
    try {
      logger.info('Getting available parents for authorization');

      const { data, error } = await supabase.functions.invoke('secure-pickup-authorizations', {
        body: { 
          operation: 'getAvailableParentsForAuthorization'
        }
      });

      if (error) {
        logger.error('Secure available parents fetch failed:', error);
        return { data: null, error };
      }

      if (!data) {
        logger.error('No data received from secure available parents');
        return { data: { parents: [], sharedStudents: {} }, error: null };
      }

      if (data.error) {
        logger.error('Secure available parents operation failed:', data.error);
        return { data: null, error: new Error(data.error || 'Unknown error') };
      }

      if (!data?.data?.encrypted_data) {
        logger.warn('No encrypted data received from secure available parents');
        return { data: { parents: [], sharedStudents: {} }, error: null };
      }

      // Decrypt the parents data
      const decryptedData = await decryptData(data.data.encrypted_data);
      
      if (!decryptedData) {
        logger.warn('Decryption returned empty data');
        return { data: { parents: [], sharedStudents: {} }, error: null };
      }

      return { data: decryptedData, error: null };
    } catch (error) {
      logger.error('Error in getAvailableParentsForAuthorizationSecure:', error);
      return { data: { parents: [], sharedStudents: {} }, error };
    }
  }
}

// Export singleton instance
export const securePickupAuthorizationOperations = new SecurePickupAuthorizationOperations();