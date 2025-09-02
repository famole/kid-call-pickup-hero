import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    // For username-only users (no email), we need to handle authentication differently
    if (!parent.email) {
      // This is a username-only user - we can't use Supabase auth
      // We would need to implement our own password verification here
      // For now, return an error indicating this needs special handling
      return new Response(JSON.stringify({
        error: 'Username-only authentication not yet implemented',
        requireUsernameAuth: true,
        parentData: {
          id: parent.id,
          name: parent.name,
          username: parent.username,
          role: parent.role
        }
      }), {
        status: 501,
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