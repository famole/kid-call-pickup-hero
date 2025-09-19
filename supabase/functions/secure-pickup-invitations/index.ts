import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Encryption utilities - fallback to default key if env var not set
const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY') ?? 'U9.#s!_So2*';

async function getEncryptionKey() {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(ENCRYPTION_KEY),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('upsy-secure-salt-2024'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

async function encryptData(data: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);
    
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedData), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    return data; // Return original data if encryption fails
  }
}

async function decryptData(encryptedData: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );
    
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return new TextDecoder().decode(decryptedData);
  } catch (error) {
    console.error('Decryption failed:', error);
    return encryptedData; // Return original if decryption fails
  }
}

async function encryptObject(obj: any): Promise<string> {
  try {
    const jsonString = JSON.stringify(obj);
    return await encryptData(jsonString);
  } catch (error) {
    console.error('Object encryption failed:', error);
    return JSON.stringify(obj); // Return original if encryption fails
  }
}

async function decryptObject(encryptedString: string): Promise<any> {
  try {
    const decryptedString = await decryptData(encryptedString);
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Object decryption failed:', error);
    try {
      return JSON.parse(encryptedString); // Try parsing original if decryption fails
    } catch {
      return encryptedString; // Return string if JSON parsing fails
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { operation, data } = await req.json();
    console.log('Secure pickup invitations operation:', operation);

    switch (operation) {
      case 'getInvitationsForParent': {
        const { parentId } = data;
        
        const { data: invitationsData, error } = await supabase
          .from('pickup_invitations')
          .select(`
            *,
            inviting_parent:parents!pickup_invitations_inviting_parent_id_fkey(id, name, email)
          `)
          .eq('inviting_parent_id', parentId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching invitations:', error);
          throw error;
        }

        // Get student names for each invitation
        const invitationsWithStudents = await Promise.all(
          invitationsData.map(async (invitation) => {
            const { data: students } = await supabase
              .from('students')
              .select('id, name')
              .in('id', invitation.student_ids);

            return {
              ...invitation,
              students: students || [],
            };
          })
        );

        // Return encrypted data to client
        const encryptedInvitationsData = await encryptObject(invitationsWithStudents || []);
        return new Response(JSON.stringify({ data: { encrypted_data: encryptedInvitationsData }, error: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'createInvitation': {
        // Decrypt invitation data received from client
        const decryptedData = await decryptObject(data.encrypted_data);
        
        const { data: invitationData, error } = await supabase
          .from('pickup_invitations')
          .insert({
            invited_name: decryptedData.invitedName,
            invited_email: decryptedData.invitedEmail,
            invited_role: decryptedData.invitedRole,
            inviting_parent_id: decryptedData.invitingParentId,
            student_ids: decryptedData.studentIds,
            start_date: decryptedData.startDate,
            end_date: decryptedData.endDate,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating invitation:', error);
          throw error;
        }

        // Return encrypted data to client
        const encryptedCreateData = await encryptObject(invitationData || {});
        return new Response(JSON.stringify({ data: { encrypted_data: encryptedCreateData }, error: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'updateInvitation': {
        const { invitationId, encrypted_data } = data;
        
        // Decrypt update data received from client
        const decryptedData = await decryptObject(encrypted_data);
        
        // Handle invitation acceptance if status is being updated to accepted
        if (decryptedData.invitationStatus === 'accepted') {
          console.log('Processing invitation acceptance...');
          
          // Get the invitation details
          const { data: invitation, error: invitationError } = await supabase
            .from('pickup_invitations')
            .select('*')
            .eq('id', invitationId)
            .single();

          if (invitationError) throw invitationError;

          // Check for existing parent
          const { data: existingParent } = await supabase
            .from('parents')
            .select('id')
            .eq('email', invitation.invited_email)
            .single();

          let parentId: string;

          if (existingParent) {
            parentId = existingParent.id;
          } else {
            // Create new parent record
            const { data: newParent, error: parentError } = await supabase
              .from('parents')
              .insert({
                name: invitation.invited_name,
                email: invitation.invited_email,
                role: invitation.invited_role,
                password_set: true
              })
              .select()
              .single();

            if (parentError) throw parentError;
            parentId = newParent.id;
          }

          // Create pickup authorizations
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

          // Update accepted parent ID
          decryptedData.accepted_parent_id = parentId;
        }

        // Build update data
        const updateData: any = {};
        if (decryptedData.invitedName !== undefined) updateData.invited_name = decryptedData.invitedName;
        if (decryptedData.invitedEmail !== undefined) updateData.invited_email = decryptedData.invitedEmail;
        if (decryptedData.invitedRole !== undefined) updateData.invited_role = decryptedData.invitedRole;
        if (decryptedData.studentIds !== undefined) updateData.student_ids = decryptedData.studentIds;
        if (decryptedData.startDate !== undefined) updateData.start_date = decryptedData.startDate;
        if (decryptedData.endDate !== undefined) updateData.end_date = decryptedData.endDate;
        if (decryptedData.invitationStatus !== undefined) updateData.invitation_status = decryptedData.invitationStatus;
        if (decryptedData.accepted_parent_id !== undefined) updateData.accepted_parent_id = decryptedData.accepted_parent_id;

        const { data: updatedInvitation, error } = await supabase
          .from('pickup_invitations')
          .update(updateData)
          .eq('id', invitationId)
          .select()
          .single();

        if (error) {
          console.error('Error updating invitation:', error);
          throw error;
        }

        // Return encrypted data to client
        const encryptedUpdateData = await encryptObject(updatedInvitation || {});
        return new Response(JSON.stringify({ data: { encrypted_data: encryptedUpdateData }, error: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getInvitationByToken': {
        const { token } = data;
        
        const { data: invitationData, error } = await supabase
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
          if (error.code === 'PGRST116') {
            // Not found
            return new Response(JSON.stringify({ data: { encrypted_data: await encryptObject(null) }, error: null }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          throw error;
        }

        // Get student names
        const { data: students } = await supabase
          .from('students')
          .select('id, name')
          .in('id', invitationData.student_ids);

        const invitationWithDetails = {
          ...invitationData,
          students: students || [],
        };

        // Return encrypted data to client
        const encryptedTokenData = await encryptObject(invitationWithDetails);
        return new Response(JSON.stringify({ data: { encrypted_data: encryptedTokenData }, error: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'deleteInvitation': {
        const { invitationId } = data;
        
        const { error } = await supabase
          .from('pickup_invitations')
          .delete()
          .eq('id', invitationId);

        if (error) {
          console.error('Error deleting invitation:', error);
          throw error;
        }

        return new Response(JSON.stringify({ data: { success: true }, error: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

  } catch (error) {
    console.error('Error in secure-pickup-invitations function:', error);
    return new Response(JSON.stringify({ data: null, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});