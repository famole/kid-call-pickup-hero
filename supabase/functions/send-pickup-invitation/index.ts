import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";
import React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { PickupInvitationEmail } from './_templates/pickup-invitation.tsx';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": 
    "authorization, x-client-info, apikey, content-type",
};

interface SendInvitationRequest {
  invitationId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { invitationId }: SendInvitationRequest = await req.json();

    console.log('Processing invitation email for ID:', invitationId);

    // Get the invitation details
    const { data: invitation, error: invitationError } = await supabase
      .from('pickup_invitations')
      .select(`
        *,
        inviting_parent:parents!pickup_invitations_inviting_parent_id_fkey(id, name, email)
      `)
      .eq('id', invitationId)
      .single();

    if (invitationError || !invitation) {
      console.error('Error fetching invitation:', invitationError);
      throw new Error('Invitation not found');
    }

    // Get student names
    const { data: students } = await supabase
      .from('students')
      .select('id, name')
      .in('id', invitation.student_ids);

    const studentNames = students?.map(s => s.name).join(', ') || '';
    const inviterName = invitation.inviting_parent?.name || 'Un padre del colegio';
    const appUrl = 'https://164bb4c6-3e1e-44df-b3a2-7094f661598c.sandbox.lovable.dev';
    const acceptUrl = `${appUrl}/accept-invitation/${invitation.invitation_token}`;

    // Render the React Email template
    const html = await renderAsync(
      React.createElement(PickupInvitationEmail, {
        invitedName: invitation.invited_name,
        inviterName: inviterName,
        studentNames: studentNames,
        startDate: new Date(invitation.start_date).toLocaleDateString('es-ES'),
        endDate: new Date(invitation.end_date).toLocaleDateString('es-ES'),
        role: invitation.invited_role,
        acceptUrl: acceptUrl,
        expiresAt: `${new Date(invitation.expires_at).toLocaleDateString('es-ES')} a las ${new Date(invitation.expires_at).toLocaleTimeString('es-ES')}`,
      })
    );

    // Send the invitation email
    const emailResponse = await resend.emails.send({
      from: "Upsy - Autorizaciones <noreply@mail.upsy.uy>",
      to: [invitation.invited_email],
      subject: `Invitación para autorización de recogida - ${studentNames}`,
      html,
    });

    console.log("Email API response:", JSON.stringify(emailResponse, null, 2));

    // Check if email was sent successfully
    if (emailResponse.error) {
      console.error("Resend API error:", emailResponse.error);
      return new Response(JSON.stringify({ 
        error: `Failed to send email: ${emailResponse.error.message || emailResponse.error}`,
        details: emailResponse.error 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Email sent successfully with ID:", emailResponse.data?.id);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-pickup-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);