import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Password hashing utilities
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { identifier, password } = await req.json();
    
    console.log('Username auth request for identifier:', identifier);

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get parent data by username or email
    const { data: parentData, error: parentError } = await supabase
      .rpc('get_parent_by_identifier', { identifier });

    if (parentError) {
      console.error('Error fetching parent:', parentError);
      throw new Error('Authentication failed');
    }

    if (!parentData || parentData.length === 0) {
      console.log('No parent found for identifier:', identifier);
      throw new Error('Invalid credentials');
    }

    const parent = parentData[0];
    console.log('Parent found:', parent.email, parent.username);

    // Check if user has password set
    if (!parent.password_set) {
      return new Response(JSON.stringify({
        error: 'Password not set',
        requirePasswordSetup: true,
        parentId: parent.id
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For username-only users (no email), implement custom password verification
    if (!parent.email) {
      console.log('Username-only user found, verifying password hash');
      
      // Check if password hash exists
      if (!parent.password_hash) {
        console.log('No password hash found for username-only user');
        throw new Error('Invalid credentials');
      }
      
      // Verify password against stored hash
      const isPasswordValid = await verifyPassword(password, parent.password_hash);
      
      if (!isPasswordValid) {
        console.log('Password verification failed for username-only user');
        throw new Error('Invalid credentials');
      }
      
      console.log('Username-only authentication successful for:', parent.username);
      
      // Return success without Supabase session (username-only users don't use Supabase auth)
      return new Response(JSON.stringify({
        user: null, // No Supabase auth user for username-only users
        session: null, // No Supabase session for username-only users
        parentData: parent,
        isUsernameAuth: true // Flag to indicate this is username-only auth
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For users with email, use regular Supabase auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: parent.email,
      password: password,
    });

    if (authError) {
      console.error('Supabase auth error:', authError);
      throw new Error('Invalid credentials');
    }

    console.log('Authentication successful for:', parent.email);

    return new Response(JSON.stringify({
      user: authData.user,
      session: authData.session,
      parentData: parent
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in username-auth function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Authentication failed' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});