import { supabase } from "@/integrations/supabase/client";
import { encryptData, decryptData } from './encryptionService';
import { PickupRequest } from '@/types';
import { logger } from '@/utils/logger';

class SecurePickupOperations {
  
  // Get pickup requests (optionally for a specific parent)
  async getPickupRequestsSecure(parentId?: string): Promise<{ data: PickupRequest[] | null; error: any }> {
    try {
      const requestData = parentId ? { parentId } : {};
      
      const { data, error } = await supabase.functions.invoke('secure-pickup-requests', {
        body: { 
          operation: 'getPickupRequests',
          data: requestData
        }
      });

      if (error) {
        logger.error('Secure pickup requests fetch failed:', error);
        return { data: null, error };
      }

      // Check if response is valid
      if (!data) {
        logger.error('No data received from secure pickup requests');
        return { data: [], error: null };
      }

      if (data.error) {
        logger.error('Secure pickup requests operation failed:', data.error);
        return { data: null, error: new Error(data.error || 'Unknown error') };
      }

      if (!data?.data?.encrypted_data) {
        logger.warn('No encrypted data received from secure pickup requests');
        return { data: [], error: null };
      }

      // Decrypt the pickup requests data
      const decryptedRequests = await decryptData(data.data.encrypted_data);
      
      if (!decryptedRequests) {
        logger.warn('Decryption returned empty data');
        return { data: [], error: null };
      }

      // decryptData already returns a parsed object, no need to JSON.parse again
      const parsedRequests = decryptedRequests;
      
      // Handle empty array case
      if (!Array.isArray(parsedRequests)) {
        logger.warn('Parsed requests is not an array:', parsedRequests);
        return { data: [], error: null };
      }
      
      // Transform to PickupRequest format
      const pickupRequests: PickupRequest[] = parsedRequests.map((item: any) => ({
        id: item.id,
        studentId: item.student_id,
        parentId: item.parent_id,
        requestTime: new Date(item.request_time),
        status: item.status as 'pending' | 'called' | 'completed' | 'cancelled'
      }));

      return { data: pickupRequests, error: null };
    } catch (error) {
      logger.error('Error in getPickupRequestsSecure:', error);
      return { data: [], error };
    }
  }

  // Create a new pickup request
  async createPickupRequestSecure(studentId: string, parentId: string): Promise<{ data: PickupRequest | null; error: any }> {
    try {
      logger.info('Creating secure pickup request:', { studentId, parentId });
      
      if (!parentId) {
        logger.error('Parent ID is required for secure pickup request creation');
        return { data: null, error: new Error('Parent ID is required') };
      }
      
      // Log the data we're about to encrypt
      const dataToEncrypt = { studentId, parentId };
      logger.info('Data to encrypt before calling secure-pickup-requests:', {
        dataToEncrypt,
        studentIdType: typeof studentId,
        parentIdType: typeof parentId,
        studentIdLength: studentId?.length,
        parentIdLength: parentId?.length,
        isStudentIdValid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId),
        isParentIdValid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parentId)
      });
      
      // Encrypt the data including parent ID
      // encryptData already calls JSON.stringify internally
      const encryptedData = await encryptData(dataToEncrypt);
      
      logger.info('Data encrypted successfully, calling secure-pickup-requests endpoint');
      
      const { data, error } = await supabase.functions.invoke('secure-pickup-requests', {
        body: { 
          operation: 'createPickupRequest',
          data: encryptedData
        }
      });

      if (error) {
        logger.error('Secure pickup request creation failed:', error);
        return { data: null, error };
      }

      // Check if response is valid
      if (!data) {
        logger.error('No data received from secure pickup request creation');
        return { data: null, error: new Error('No response data') };
      }

      if (data.error) {
        logger.error('Secure pickup request creation operation failed:', data.error);
        return { data: null, error: new Error(data.error || 'Unknown error') };
      }

      // Decrypt the response data
      const decryptedData = await decryptData(data.data.encrypted_data);
      // decryptData already returns a parsed object, no need to JSON.parse again
      const requestData = decryptedData;
      
      // Transform to PickupRequest format
      const pickupRequest: PickupRequest = {
        id: requestData.id,
        studentId: requestData.student_id,
        parentId: requestData.parent_id,
        requestTime: new Date(requestData.request_time),
        status: requestData.status as 'pending' | 'called' | 'completed' | 'cancelled'
      };

      return { data: pickupRequest, error: null };
    } catch (error) {
      logger.error('Error in createPickupRequestSecure:', error);
      return { data: null, error };
    }
  }

  // Get all pickup requests that affect the current parent's children
  async getParentAffectedRequestsSecure(parentId: string): Promise<{ data: PickupRequest[] | null; error: any }> {
    try {
      logger.info('getParentAffectedRequestsSecure called with parentId:', parentId);
      
      // Encrypt the parent ID
      const dataToEncrypt = { parentId };
      logger.info('Data to encrypt for getParentAffectedRequests:', dataToEncrypt);
      
      // encryptData already calls JSON.stringify internally
      const encryptedData = await encryptData(dataToEncrypt);
      logger.info('Data encrypted successfully for getParentAffectedRequests');
      
      const { data, error } = await supabase.functions.invoke('secure-pickup-requests', {
        body: { 
          operation: 'getParentAffectedRequests',
          data: encryptedData
        }
      });
      
      logger.info('getParentAffectedRequests response:', { data, error });

      if (error) {
        logger.error('Secure parent affected requests fetch failed:', error);
        return { data: null, error };
      }

      // Check if response is valid
      if (!data) {
        logger.error('No data received from secure parent affected requests');
        return { data: [], error: null };
      }

      if (data.error) {
        logger.error('Secure parent affected requests operation failed:', data.error);
        return { data: null, error: new Error(data.error || 'Unknown error') };
      }

      // Check if data.data exists
      if (!data.data?.encrypted_data) {
        logger.warn('No encrypted data received from secure parent affected requests');
        logger.info('Full response data structure:', JSON.stringify(data, null, 2));
        return { data: [], error: null };
      }

      logger.info('Encrypted data received, attempting to decrypt...');
      logger.info('Encrypted data length:', data.data.encrypted_data?.length);
      logger.info('Encrypted data preview:', data.data.encrypted_data?.substring(0, 50));
      
      // Decrypt the pickup requests data
      let decryptedRequests;
      try {
        decryptedRequests = await decryptData(data.data.encrypted_data);
        logger.info('✅ Decryption successful');
      } catch (decryptError) {
        logger.error('❌ Decryption failed for parent affected requests:', decryptError);
        logger.error('Encrypted data that failed to decrypt:', data.data.encrypted_data);
        return { data: [], error: new Error(`Decryption failed: ${decryptError instanceof Error ? decryptError.message : 'Unknown error'}`) };
      }
      
      logger.info('Decrypted requests data:', decryptedRequests);
      logger.info('Decrypted requests type:', typeof decryptedRequests);
      logger.info('Is array:', Array.isArray(decryptedRequests));
      
      if (!decryptedRequests) {
        logger.warn('Decryption returned empty data for parent affected requests');
        return { data: [], error: null };
      }

      // decryptData already returns a parsed object, no need to JSON.parse again
      const parsedRequests = decryptedRequests;
      
      // Handle empty array case
      if (!Array.isArray(parsedRequests)) {
        logger.warn('Parent affected requests is not an array:', parsedRequests);
        return { data: [], error: null };
      }
      
      // Transform to PickupRequest format
      const pickupRequests: PickupRequest[] = parsedRequests.map((item: any) => ({
        id: item.id,
        studentId: item.student_id,
        parentId: item.parent_id,
        requestTime: new Date(item.request_time),
        status: item.status as 'pending' | 'called' | 'completed' | 'cancelled',
        requestingParent: item.parents ? {
          id: item.parents.id,
          name: item.parents.name,
          email: item.parents.email
        } : undefined
      }));

      logger.info('Final transformed pickup requests for getParentAffectedRequests:', pickupRequests);
      logger.info('Returning', pickupRequests.length, 'pickup requests from getParentAffectedRequests');

      return { data: pickupRequests, error: null };
    } catch (error) {
      logger.error('Error in getParentAffectedRequestsSecure:', error);
      return { data: [], error };
    }
  }
}

// Export singleton instance
export const securePickupOperations = new SecurePickupOperations();