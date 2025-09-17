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

      if (!data?.success) {
        logger.error('Secure pickup requests operation failed:', data?.error);
        return { data: null, error: new Error(data?.error || 'Unknown error') };
      }

      // Check if data.data exists
      if (!data.data) {
        logger.warn('No encrypted data received from secure pickup requests');
        return { data: [], error: null };
      }

      // Decrypt the pickup requests data
      const decryptedRequests = await decryptData(data.data);
      
      if (!decryptedRequests) {
        logger.warn('Decryption returned empty data');
        return { data: [], error: null };
      }

      const parsedRequests = JSON.parse(decryptedRequests);
      
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
  async createPickupRequestSecure(studentId: string): Promise<{ data: PickupRequest | null; error: any }> {
    try {
      // Encrypt the student ID
      const encryptedData = await encryptData(JSON.stringify({ studentId }));
      
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

      if (!data?.success) {
        logger.error('Secure pickup request creation operation failed:', data?.error);
        return { data: null, error: new Error(data?.error || 'Unknown error') };
      }

      // Decrypt the response data
      const decryptedData = await decryptData(data.data);
      const requestData = JSON.parse(decryptedData);
      
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
  async getParentAffectedRequestsSecure(): Promise<{ data: PickupRequest[] | null; error: any }> {
    try {
      const { data, error } = await supabase.functions.invoke('secure-pickup-requests', {
        body: { 
          operation: 'getParentAffectedRequests'
        }
      });

      if (error) {
        logger.error('Secure parent affected requests fetch failed:', error);
        return { data: null, error };
      }

      if (!data?.success) {
        logger.error('Secure parent affected requests operation failed:', data?.error);
        return { data: null, error: new Error(data?.error || 'Unknown error') };
      }

      // Check if data.data exists
      if (!data.data) {
        logger.warn('No encrypted data received from secure parent affected requests');
        return { data: [], error: null };
      }

      // Decrypt the pickup requests data
      const decryptedRequests = await decryptData(data.data);
      
      if (!decryptedRequests) {
        logger.warn('Decryption returned empty data for parent affected requests');
        return { data: [], error: null };
      }

      const parsedRequests = JSON.parse(decryptedRequests);
      
      // Handle empty array case
      if (!Array.isArray(parsedRequests)) {
        logger.warn('Parsed parent affected requests is not an array:', parsedRequests);
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
      logger.error('Error in getParentAffectedRequestsSecure:', error);
      return { data: [], error };
    }
  }
}

// Export singleton instance
export const securePickupOperations = new SecurePickupOperations();