import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import React from 'npm:react@18.3.1';
import { Resend } from 'npm:resend@4.0.0';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { PasswordResetEmail } from './_templates/password-reset.tsx';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate a 6-digit OTP code
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { email } = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating password reset OTP for:', email);

    // Generate OTP code
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store OTP in database
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { error: dbError } = await supabase
      .from('password_reset_otps')
      .insert({
        email,
        otp_code: otpCode,
        expires_at: expiresAt.toISOString(),
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    // Send email with OTP
    const html = await renderAsync(
      React.createElement(PasswordResetEmail, {
        otpCode,
        email,
      })
    );

    const { error: emailError } = await resend.emails.send({
      from: 'Upsy <hi@mail.upsy.uy>',
      to: [email],
      subject: 'Your Password Reset Code - Upsy',
      html,
    });

    if (emailError) {
      console.error('Resend error:', emailError);
      throw emailError;
    }

    console.log('Password reset OTP sent successfully to:', email);

    return new Response(
      JSON.stringify({ success: true, message: 'OTP sent successfully' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
