import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import React from 'npm:react@18.3.1';
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
import { Resend } from 'npm:resend@4.0.0';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { PasswordResetEmail } from './_templates/password-reset.tsx';

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);
const hookSecret = Deno.env.get('SEND_PASSWORD_RESET_HOOK_SECRET') as string;

const handler = async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);
    const wh = new Webhook(hookSecret);

    const {
      user,
      email_data: { token_hash, redirect_to },
    } = wh.verify(payload, headers) as {
      user: {
        email: string;
      };
      email_data: {
        token_hash: string;
        redirect_to: string;
        email_action_type: string;
      };
    };

    console.log('Sending password reset email to:', user.email);

    const html = await renderAsync(
      React.createElement(PasswordResetEmail, {
        supabase_url: Deno.env.get('SUPABASE_URL') ?? '',
        token_hash,
        redirect_to,
        email: user.email,
      })
    );

    const { error } = await resend.emails.send({
      from: 'Upsy <onboarding@resend.dev>',
      to: [user.email],
      subject: 'Reset Your Password - Upsy',
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    console.log('Password reset email sent successfully to:', user.email);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in send-password-reset function:', error);
    return new Response(
      JSON.stringify({
        error: {
          message: error.message,
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
