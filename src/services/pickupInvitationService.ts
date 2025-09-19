import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

export interface PickupInvitation {
  id: string;
  invitedName: string;
  invitedEmail: string;
  invitedRole: 'family' | 'other';
  invitingParentId: string;
  studentIds: string[];
  startDate: string;
  endDate: string;
  invitationStatus: 'pending' | 'accepted' | 'expired';
  invitationToken: string;
  expiresAt: string;
  acceptedParentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PickupInvitationInput {
  invitedName: string;
  invitedEmail: string;
  invitedRole: 'family' | 'other';
  studentIds: string[];
  startDate: string;
  endDate: string;
}

export interface PickupInvitationWithDetails extends PickupInvitation {
  students?: {
    id: string;
    name: string;
  }[];
  invitingParent?: {
    id: string;
    name: string;
    email: string;
  };
}

// Create a new pickup invitation
export const createPickupInvitation = async (
  invitationData: PickupInvitationInput
): Promise<PickupInvitation> => {
  // Get the current parent ID
  const { data: currentParentId, error: parentError } = await supabase.rpc('get_current_parent_id');
  
  if (parentError || !currentParentId) {
    throw new Error('Unable to authenticate parent');
  }

  // Use secure operations for encrypted data
  const { secureInvitationOperations } = await import('@/services/encryption');
  const secureInvitationData = {
    ...invitationData,
    invitingParentId: currentParentId
  };
  
  const { data, error } = await secureInvitationOperations.createInvitationSecure(secureInvitationData);

  if (error) throw error;
  return mapInvitationFromDB(data);
};

// Get all invitations created by the current parent
export const getPickupInvitationsForParent = async (): Promise<PickupInvitationWithDetails[]> => {
  const { data: currentParentId, error: parentError } = await supabase.rpc('get_current_parent_id');
  
  if (parentError || !currentParentId) {
    throw new Error('Unable to authenticate parent');
  }

  // Use secure operations for encrypted data
  const { secureInvitationOperations } = await import('@/services/encryption');
  const { data, error } = await secureInvitationOperations.getInvitationsForParentSecure(currentParentId);

  if (error) throw error;

  // Map database fields to interface and add student/parent details
  const invitationsWithDetails = data?.map((invitation: any) => ({
    ...mapInvitationFromDB(invitation),
    students: invitation.students || [],
    invitingParent: invitation.inviting_parent || undefined,
  })) || [];

  return invitationsWithDetails;
};

// Update an invitation
export const updatePickupInvitation = async (
  id: string, 
  updates: Partial<PickupInvitationInput & { invitationStatus: string }>
): Promise<PickupInvitation> => {
  // Use secure operations for encrypted data
  const { secureInvitationOperations } = await import('@/services/encryption');
  const { data, error } = await secureInvitationOperations.updateInvitationSecure(id, updates);

  if (error) throw error;
  return mapInvitationFromDB(data);
};

// Delete an invitation
export const deletePickupInvitation = async (id: string): Promise<void> => {
  // Use secure operations for encrypted data
  const { secureInvitationOperations } = await import('@/services/encryption');
  const { error } = await secureInvitationOperations.deleteInvitationSecure(id);

  if (error) throw error;
};

// Get invitation by token (for accepting invitations)
export const getInvitationByToken = async (token: string): Promise<PickupInvitationWithDetails | null> => {
  // Use secure operations for encrypted data
  const { secureInvitationOperations } = await import('@/services/encryption');
  const { data, error } = await secureInvitationOperations.getInvitationByTokenSecure(token);

  if (error) {
    throw error;
  }

  if (!data) return null;

  return {
    ...mapInvitationFromDB(data),
    students: data.students || [],
    invitingParent: data.inviting_parent || undefined,
  };
};

// Send invitation email
export const sendInvitationEmail = async (invitationId: string): Promise<void> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-pickup-invitation', {
      body: { invitationId }
    });
    
    if (error) {
      logger.error('Supabase function error:', error);
      throw new Error(`Failed to send invitation email: ${error.message || error}`);
    }
    
    // Check if the function returned an error in the response body
    if (data && data.error) {
      logger.error('Edge function returned error:', data.error);
      throw new Error(`Failed to send invitation email: ${data.error}`);
    }
    
    logger.info('Invitation email sent successfully:', data);
  } catch (error) {
    logger.error('Error sending invitation email:', error);
    throw new Error('Failed to send invitation email');
  }
};

// Helper function to map database fields to interface
const mapInvitationFromDB = (dbInvitation: any): PickupInvitation => {
  return {
    id: dbInvitation.id,
    invitedName: dbInvitation.invited_name,
    invitedEmail: dbInvitation.invited_email,
    invitedRole: dbInvitation.invited_role,
    invitingParentId: dbInvitation.inviting_parent_id,
    studentIds: dbInvitation.student_ids,
    startDate: dbInvitation.start_date,
    endDate: dbInvitation.end_date,
    invitationStatus: dbInvitation.invitation_status,
    invitationToken: dbInvitation.invitation_token,
    expiresAt: dbInvitation.expires_at,
    acceptedParentId: dbInvitation.accepted_parent_id,
    createdAt: dbInvitation.created_at,
    updatedAt: dbInvitation.updated_at,
  };
};