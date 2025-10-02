import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
import { getCurrentParentIdCached } from '@/services/parent/getCurrentParentId';

// Module-level TTL cache for pickup invitations
const INVITATIONS_TTL_MS = 30_000; // 30s
let invitationsCache: { value: PickupInvitationWithDetails[]; expiresAt: number; parentId: string } | null = null;
let invitationsInFlight: Promise<PickupInvitationWithDetails[]> | null = null;

const invalidateInvitationsCache = () => {
  invitationsCache = null;
};

// Cache for pending invitation token by email
const PENDING_TOKEN_TTL_MS = 30_000;
const pendingTokenCache = new Map<string, { value: string | null; expiresAt: number }>();
const pendingTokenInFlight = new Map<string, Promise<string | null>>();

const invalidatePendingTokenCache = (email?: string) => {
  if (email) pendingTokenCache.delete(email);
  else pendingTokenCache.clear();
};

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
  // Get the current parent ID (cached)
  const currentParentId = await getCurrentParentIdCached();
  if (!currentParentId) {
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
  // Invalidate cache after creating a new invitation
  invalidateInvitationsCache();
  invalidatePendingTokenCache();
  return mapInvitationFromDB(data);
};

// Get all invitations created by the current parent
export const getPickupInvitationsForParent = async (): Promise<PickupInvitationWithDetails[]> => {
  const currentParentId = await getCurrentParentIdCached();
  if (!currentParentId) {
    throw new Error('Unable to authenticate parent');
  }

  const now = Date.now();
  // Serve from cache if valid and for the same parent
  if (invitationsCache && invitationsCache.parentId === currentParentId && invitationsCache.expiresAt > now) {
    return invitationsCache.value;
  }

  // Coalesce concurrent requests
  if (invitationsInFlight) return invitationsInFlight;

  invitationsInFlight = (async () => {
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

    // Cache result
    invitationsCache = {
      value: invitationsWithDetails,
      expiresAt: Date.now() + INVITATIONS_TTL_MS,
      parentId: currentParentId,
    };
    return invitationsWithDetails;
  })().finally(() => {
    invitationsInFlight = null;
  });

  return invitationsInFlight;
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
  // Invalidate cache after update
  invalidateInvitationsCache();
  invalidatePendingTokenCache();
  return mapInvitationFromDB(data);
};

// Delete an invitation
export const deletePickupInvitation = async (id: string): Promise<void> => {
  // Use secure operations for encrypted data
  const { secureInvitationOperations } = await import('@/services/encryption');
  const { error } = await secureInvitationOperations.deleteInvitationSecure(id);

  if (error) throw error;
  // Invalidate cache after deletion
  invalidateInvitationsCache();
  invalidatePendingTokenCache();
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

// Get first pending invitation token for a given invited email (cached)
export const getPendingInvitationTokenForEmailCached = async (email: string): Promise<string | null> => {
  const now = Date.now();
  const cached = pendingTokenCache.get(email);
  if (cached && cached.expiresAt > now) return cached.value;

  const existing = pendingTokenInFlight.get(email);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const { data, error } = await supabase
        .from('pickup_invitations')
        .select('invitation_token')
        .eq('invited_email', email)
        .eq('invitation_status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .limit(1);

      if (error) {
        logger.error('Error fetching pending invitation token:', error);
        pendingTokenCache.set(email, { value: null, expiresAt: now + 5_000 });
        return null;
      }

      const token = data && data.length > 0 ? (data[0] as any).invitation_token as string : null;
      pendingTokenCache.set(email, { value: token, expiresAt: Date.now() + PENDING_TOKEN_TTL_MS });
      return token;
    } finally {
      pendingTokenInFlight.delete(email);
    }
  })();

  pendingTokenInFlight.set(email, promise);
  return promise;
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