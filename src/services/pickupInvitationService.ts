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

  const { data, error } = await supabase
    .from('pickup_invitations')
    .insert({
      invited_name: invitationData.invitedName,
      invited_email: invitationData.invitedEmail,
      invited_role: invitationData.invitedRole,
      inviting_parent_id: currentParentId,
      student_ids: invitationData.studentIds,
      start_date: invitationData.startDate,
      end_date: invitationData.endDate,
    })
    .select()
    .single();

  if (error) throw error;
  return mapInvitationFromDB(data);
};

// Get all invitations created by the current parent
export const getPickupInvitationsForParent = async (): Promise<PickupInvitationWithDetails[]> => {
  const { data: currentParentId, error: parentError } = await supabase.rpc('get_current_parent_id');
  
  if (parentError || !currentParentId) {
    throw new Error('Unable to authenticate parent');
  }

  const { data, error } = await supabase
    .from('pickup_invitations')
    .select(`
      *,
      inviting_parent:parents!pickup_invitations_inviting_parent_id_fkey(id, name, email)
    `)
    .eq('inviting_parent_id', currentParentId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Get student names for each invitation
  const invitationsWithStudents = await Promise.all(
    data.map(async (invitation) => {
      const { data: students } = await supabase
        .from('students')
        .select('id, name')
        .in('id', invitation.student_ids);

      return {
        ...mapInvitationFromDB(invitation),
        students: students || [],
        invitingParent: invitation.inviting_parent || undefined,
      };
    })
  );

  return invitationsWithStudents;
};

// Update an invitation
export const updatePickupInvitation = async (
  id: string, 
  updates: Partial<PickupInvitationInput & { invitationStatus: string }>
): Promise<PickupInvitation> => {
  const updateData: any = {};
  
  if (updates.invitedName !== undefined) updateData.invited_name = updates.invitedName;
  if (updates.invitedEmail !== undefined) updateData.invited_email = updates.invitedEmail;
  if (updates.invitedRole !== undefined) updateData.invited_role = updates.invitedRole;
  if (updates.studentIds !== undefined) updateData.student_ids = updates.studentIds;
  if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
  if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
  if (updates.invitationStatus !== undefined) updateData.invitation_status = updates.invitationStatus;

  // If accepting the invitation, create parent record and authorizations
  if (updates.invitationStatus === 'accepted') {
    logger.info('Starting invitation acceptance process...');
    
    // First get the invitation details
    const { data: invitation, error: invitationError } = await supabase
      .from('pickup_invitations')
      .select('*')
      .eq('id', id)
      .single();

    if (invitationError) {
      logger.error('Error fetching invitation:', invitationError);
      throw invitationError;
    }
    logger.info('Invitation fetched successfully:', invitation);

    // Create or update the parent record
    logger.info('Checking for existing parent with email:', invitation.invited_email);
    const { data: existingParent, error: existingParentError } = await supabase
      .from('parents')
      .select('id')
      .eq('email', invitation.invited_email)
      .single();

    if (existingParentError && existingParentError.code !== 'PGRST116') {
      logger.error('Error checking existing parent:', existingParentError);
      throw existingParentError;
    }

    let parentId: string;

    if (existingParent) {
      logger.info('Found existing parent:', existingParent.id);
      parentId = existingParent.id;
    } else {
      logger.info('Creating new parent record...');
      // Create new parent record with the invited role
      const { data: newParent, error: parentError } = await supabase
        .from('parents')
        .insert({
          name: invitation.invited_name,
          email: invitation.invited_email,
          role: invitation.invited_role,
          password_set: true
        })
        .select('id')
        .single();

      if (parentError) {
        logger.error('Error creating parent:', parentError);
        throw parentError;
      }
      logger.info('Created new parent:', newParent.id);
      parentId = newParent.id;
    }

    // Update the invitation with the accepted parent ID
    updateData.accepted_parent_id = parentId;

    // Create pickup authorizations for all students in the invitation
    const authorizationsToCreate = invitation.student_ids.map((studentId: string) => ({
      student_id: studentId,
      authorizing_parent_id: invitation.inviting_parent_id,
      authorized_parent_id: parentId,
      start_date: invitation.start_date,
      end_date: invitation.end_date,
      is_active: true
    }));

    const { error: authError } = await supabase
      .from('pickup_authorizations')
      .insert(authorizationsToCreate);

    if (authError) throw authError;
  }

  const { data, error } = await supabase
    .from('pickup_invitations')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapInvitationFromDB(data);
};

// Delete an invitation
export const deletePickupInvitation = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('pickup_invitations')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Get invitation by token (for accepting invitations)
export const getInvitationByToken = async (token: string): Promise<PickupInvitationWithDetails | null> => {
  const { data, error } = await supabase
    .from('pickup_invitations')
    .select(`
      *,
      inviting_parent:parents!pickup_invitations_inviting_parent_id_fkey(id, name, email)
    `)
    .eq('invitation_token', token)
    .eq('invitation_status', 'pending')
    .gte('expires_at', new Date().toISOString())
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  // Get student names
  const { data: students } = await supabase
    .from('students')
    .select('id, name')
    .in('id', data.student_ids);

  return {
    ...mapInvitationFromDB(data),
    students: students || [],
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