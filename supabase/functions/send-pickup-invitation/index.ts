import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

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
    const appUrl = Deno.env.get("SUPABASE_URL")?.replace('//', '//164bb4c6-3e1e-44df-b3a2-7094f661598c.sandbox.lovable.dev') || 'https://164bb4c6-3e1e-44df-b3a2-7094f661598c.sandbox.lovable.dev';
    const acceptUrl = `${appUrl}/accept-invitation/${invitation.invitation_token}`;

    // Send the invitation email
    const emailResponse = await resend.emails.send({
      from: "Autorizaciones de Recogida <noreply@mail.upsy.uy>",
      to: [invitation.invited_email],
      subject: `Invitación para autorización de recogida - ${studentNames}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
            Invitación de Autorización de Recogida
          </h1>
          
          <p>Hola <strong>${invitation.invited_name}</strong>,</p>
          
          <p>
            <strong>${inviterName}</strong> te ha invitado a autorizar la recogida de 
            ${studentNames === '' ? 'sus hijos' : studentNames} en el colegio.
          </p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1f2937;">Detalles de la Autorización:</h3>
            <ul style="color: #4b5563;">
              <li><strong>Estudiantes:</strong> ${studentNames}</li>
              <li><strong>Fecha de inicio:</strong> ${new Date(invitation.start_date).toLocaleDateString('es-ES')}</li>
              <li><strong>Fecha de fin:</strong> ${new Date(invitation.end_date).toLocaleDateString('es-ES')}</li>
              <li><strong>Rol:</strong> ${invitation.invited_role === 'family' ? 'Familiar' : 'Otro'}</li>
            </ul>
          </div>
          
          <p>
            Para aceptar esta invitación y poder recoger a los estudiantes, 
            haz clic en el siguiente botón:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${acceptUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; font-weight: bold; 
                      display: inline-block;">
              Aceptar Invitación
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            Si no puedes hacer clic en el botón, copia y pega el siguiente enlace en tu navegador:
            <br>
            <a href="${acceptUrl}" style="color: #2563eb;">${acceptUrl}</a>
          </p>
          
          <p style="color: #6b7280; font-size: 14px;">
            Esta invitación expirará el ${new Date(invitation.expires_at).toLocaleDateString('es-ES')} 
            a las ${new Date(invitation.expires_at).toLocaleTimeString('es-ES')}.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            Este mensaje fue enviado por el sistema de gestión escolar.<br>
            Si no esperabas recibir este correo, puedes ignorarlo de forma segura.
          </p>
        </div>
      `,
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