import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export class SecureInvitationOperations {
  private static instance: SecureInvitationOperations;

  private constructor() {}

  public static getInstance(): SecureInvitationOperations {
    if (!SecureInvitationOperations.instance) {
      SecureInvitationOperations.instance = new SecureInvitationOperations();
    }
    return SecureInvitationOperations.instance;
  }

  // Secure operations for pickup invitations
  async getInvitationsForParentSecure(parentId: string) {
    try {
      const { data, error } = await supabase.functions.invoke('secure-pickup-invitations', {
        body: { 
          operation: 'getInvitationsForParent', 
          data: { parentId }
        }
      });
      
      if (error) {
        logger.error('Edge function error:', error);
        throw error;
      }
      
      // Decrypt the single encrypted_data field containing all invitations
      const { decryptData } = await import('./encryptionService');
      const decryptedInvitations = await decryptData(data.data.encrypted_data);
      
      return { data: decryptedInvitations, error: data.error };
    } catch (error) {
      logger.error('Secure invitation fetch failed:', error);
      return { data: null, error };
    }
  }

  // Secure invitation creation
  async createInvitationSecure(invitationData: any) {
    try {
      // Encrypt the entire invitation data as a single object
      const { encryptData } = await import('./encryptionService');
      const encrypted_data = await encryptData(invitationData);
      
      const { data, error } = await supabase.functions.invoke('secure-pickup-invitations', {
        body: { 
          operation: 'createInvitation', 
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
      logger.error('Secure invitation creation failed:', error);
      return { data: null, error };
    }
  }

  // Secure invitation update
  async updateInvitationSecure(invitationId: string, updateData: any) {
    try {
      // Encrypt the entire update data as a single object
      const { encryptData } = await import('./encryptionService');
      const encrypted_data = await encryptData(updateData);
      
      const { data, error } = await supabase.functions.invoke('secure-pickup-invitations', {
        body: { 
          operation: 'updateInvitation', 
          data: { invitationId, encrypted_data }
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
      logger.error('Secure invitation update failed:', error);
      return { data: null, error };
    }
  }

  // Secure get invitation by token
  async getInvitationByTokenSecure(token: string) {
    try {
      const { data, error } = await supabase.functions.invoke('secure-pickup-invitations', {
        body: { 
          operation: 'getInvitationByToken', 
          data: { token }
        }
      });
      
      if (error) {
        logger.error('Edge function error:', error);
        throw error;
      }
      
      // Decrypt the single encrypted_data field containing the invitation
      const { decryptData } = await import('./encryptionService');
      const decryptedInvitation = await decryptData(data.data.encrypted_data);
      
      return { data: decryptedInvitation, error: data.error };
    } catch (error) {
      logger.error('Secure invitation by token fetch failed:', error);
      return { data: null, error };
    }
  }

  // Secure invitation deletion
  async deleteInvitationSecure(invitationId: string) {
    try {
      const { data, error } = await supabase.functions.invoke('secure-pickup-invitations', {
        body: { 
          operation: 'deleteInvitation', 
          data: { invitationId }
        }
      });
      
      if (error) {
        logger.error('Edge function error:', error);
        throw error;
      }
      
      return { data: data.data, error: data.error };
    } catch (error) {
      logger.error('Secure invitation deletion failed:', error);
      return { data: null, error };
    }
  }
}

// Export singleton instance
export const secureInvitationOperations = SecureInvitationOperations.getInstance();