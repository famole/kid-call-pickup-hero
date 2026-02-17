import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": 
    "authorization, x-client-info, apikey, content-type",
};

interface SendInvitationRequest {
  invitationId: string;
}

function buildInvitationEmailHtml(props: {
  invitedName: string;
  inviterName: string;
  studentNames: string;
  startDate: string;
  endDate: string;
  role: string;
  acceptUrl: string;
  expiresAt: string;
}): string {
  const roleLabel = props.role === 'family' ? 'Familiar' : 'Otro';
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="background-color:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Helvetica Neue',sans-serif;margin:0;padding:0;">
  <div style="background-color:#ffffff;margin:0 auto;max-width:600px;padding:20px 0 48px;border-radius:8px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
    <div style="padding:32px 24px 24px;text-align:center;border-bottom:1px solid #e5e7eb;">
      <img src="https://auth.upsy.uy/storage/v1/object/public/Assets/upsy_transparent.png" width="120" height="120" alt="Upsy Logo" style="margin:0 auto 16px;border-radius:50%;" />
      <p style="color:#6b7280;font-size:16px;margin:0;">Gestión escolar simplificada</p>
    </div>
    <div style="padding:32px 24px;">
      <h2 style="color:#111827;font-size:24px;font-weight:bold;margin:0 0 24px;text-align:center;">Invitación de Autorización de Recogida</h2>
      <p style="color:#111827;font-size:16px;line-height:24px;margin:0 0 16px;">Hola <strong>${props.invitedName}</strong>,</p>
      <p style="color:#374151;font-size:16px;line-height:24px;margin:0 0 24px;">
        <strong>${props.inviterName}</strong> te ha invitado a autorizar la recogida de ${props.studentNames || 'sus hijos'} en el colegio.
      </p>
      <div style="background-color:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:24px;margin:24px 0;">
        <h3 style="color:#111827;font-size:18px;font-weight:bold;margin:0 0 16px;">Detalles de la Autorización</h3>
        <p style="color:#4b5563;font-size:16px;line-height:24px;margin:0 0 8px;"><strong>Estudiantes:</strong> ${props.studentNames}</p>
        <p style="color:#4b5563;font-size:16px;line-height:24px;margin:0 0 8px;"><strong>Fecha de inicio:</strong> ${props.startDate}</p>
        <p style="color:#4b5563;font-size:16px;line-height:24px;margin:0 0 8px;"><strong>Fecha de fin:</strong> ${props.endDate}</p>
        <p style="color:#4b5563;font-size:16px;line-height:24px;margin:0 0 8px;"><strong>Rol:</strong> ${roleLabel}</p>
      </div>
      <p style="color:#374151;font-size:16px;line-height:24px;margin:0 0 24px;">
        Para aceptar esta invitación y poder recoger a los estudiantes, haz clic en el siguiente botón:
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${props.acceptUrl}" style="background-color:#2563eb;border-radius:6px;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;display:inline-block;padding:16px 32px;">Aceptar Invitación</a>
      </div>
      <p style="color:#6b7280;font-size:14px;line-height:20px;margin:24px 0 8px;">Si no puedes hacer clic en el botón, copia y pega el siguiente enlace en tu navegador:</p>
      <p style="color:#6b7280;font-size:14px;line-height:20px;margin:0 0 24px;word-break:break-all;">
        <a href="${props.acceptUrl}" style="color:#2563eb;text-decoration:underline;">${props.acceptUrl}</a>
      </p>
      <p style="color:#9ca3af;font-size:14px;line-height:20px;margin:24px 0 0;text-align:center;">Esta invitación expirará el ${props.expiresAt}.</p>
    </div>
    <div style="border-top:1px solid #e5e7eb;padding:24px;background-color:#f9fafb;">
      <p style="color:#6b7280;font-size:12px;line-height:16px;text-align:center;margin:0;">
        <strong>Upsy</strong> - Gestión escolar simplificada<br />
        Este mensaje fue enviado por el sistema de gestión escolar.<br />
        Si no esperabas recibir este correo, puedes ignorarlo de forma segura.
      </p>
    </div>
  </div>
</body>
</html>`;
}

const handler = async (req: Request): Promise<Response> => {
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

    const { data: students } = await supabase
      .from('students')
      .select('id, name')
      .in('id', invitation.student_ids);

    const studentNames = students?.map(s => s.name).join(', ') || '';
    const inviterName = invitation.inviting_parent?.name || 'Un padre del colegio';
    const appUrl = Deno.env.get("VITE_APP_URL") || 'https://preview--kid-call-pickup-hero.lovable.app';
    const acceptUrl = `${appUrl}/accept-invitation/${invitation.invitation_token}`;

    const html = buildInvitationEmailHtml({
      invitedName: invitation.invited_name,
      inviterName,
      studentNames,
      startDate: new Date(invitation.start_date).toLocaleDateString('es-ES'),
      endDate: new Date(invitation.end_date).toLocaleDateString('es-ES'),
      role: invitation.invited_role,
      acceptUrl,
      expiresAt: `${new Date(invitation.expires_at).toLocaleDateString('es-ES')} a las ${new Date(invitation.expires_at).toLocaleTimeString('es-ES')}`,
    });

    const emailResponse = await resend.emails.send({
      from: "Upsy - Autorizaciones <noreply@mail.upsy.uy>",
      to: [invitation.invited_email],
      subject: `Invitación para autorización de recogida - ${studentNames}`,
      html,
    });

    console.log("Email API response:", JSON.stringify(emailResponse, null, 2));

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
      headers: { "Content-Type": "application/json", ...corsHeaders },
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
