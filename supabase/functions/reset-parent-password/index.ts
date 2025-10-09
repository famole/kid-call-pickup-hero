import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { identifier } = await req.json();

    if (!identifier) {
      throw new Error('Email or username is required');
    }

    console.log(`Starting password reset for identifier: ${identifier}`);

    // First, get the parent record to see if it's email or username based
    const { data: parentData, error: parentError } = await supabaseAdmin
      .from('parents')
      .select('email, username')
      .or(`email.eq.${identifier},username.eq.${identifier}`)
      .single();

    if (parentError) {
      console.error('Error finding parent:', parentError);
      throw new Error(`Parent not found with identifier: ${identifier}`);
    }

    // Update the parent record to set password_set to false
    const { error: updateError } = await supabaseAdmin
      .from('parents')
      .update({ password_set: false })
      .or(`email.eq.${identifier},username.eq.${identifier}`);

    if (updateError) {
      console.error('Error updating parent record:', updateError);
      throw new Error(`Failed to update parent record: ${updateError.message}`);
    }

    console.log('Updated parent record successfully');

    // Get the user by email or username to get their ID
    console.log(`Parent data from DB - email: ${parentData.email}, username: ${parentData.username}`);
    
    let user = null;
    
    if (parentData.email) {
      // For email users, use the PostgreSQL function to find the auth user ID
      console.log(`Looking for email user: ${parentData.email}`);

      const { data: userId, error: getUserError } = await supabaseAdmin.rpc('get_auth_user_id_by_email', {
        user_email: parentData.email
      });

      if (!getUserError && userId) {
        console.log(`Found auth user ID via RPC: ${userId}`);

        // Now get the full user data using the ID
        const { data: authUserData, error: getUserByIdError } = await supabaseAdmin.auth.admin.getUserById(userId);

        if (!getUserByIdError && authUserData?.user) {
          user = authUserData.user;
          console.log(`Auth user found via getUserById: ${!!user}`);
        } else {
          console.log(`getUserById failed:`, getUserByIdError?.message || 'No user found');
        }
      } else {
        console.log(`get_auth_user_id_by_email failed:`, getUserError?.message || 'No user ID found');
      }

      // Fallback to listing users if RPC approach fails
      if (!user) {
        console.log('RPC approach failed, falling back to listUsers (paginated)...');

        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

        if (listError) {
          console.error('Error listing users:', listError);
          throw new Error(`Failed to list users: ${listError.message}`);
        }

        console.log(`Total users found in auth (first page): ${users.length}`);

        // Find user by email - try exact match first, then case-insensitive
        user = users.find(u => u.email === parentData.email);
        if (!user) {
          user = users.find(u => u.email?.toLowerCase() === parentData.email?.toLowerCase());
        }
        console.log(`Auth user found in list: ${!!user}`);
        if (!user) {
          console.log(`Available user emails (first 10):`, users.slice(0, 10).map(u => u.email));
        }
      }
    } else if (parentData.username) {
      // For username users, we still need to list since there's no getUserByUsername
      console.log(`Looking for username user: ${parentData.username}`);
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
        console.error('Error listing users:', listError);
        throw new Error(`Failed to list users: ${listError.message}`);
      }

      console.log(`Total users found in auth: ${users.length}`);
      
      // For username-based users, they might be stored in different ways:
      // 1. Email field contains username (most common)
      // 2. user_metadata contains username
      // 3. app_metadata contains username
      user = users.find(u => {
        const emailMatch = u.email?.toLowerCase() === parentData.username?.toLowerCase();
        const metadataMatch = u.user_metadata?.username === parentData.username;
        const appMetadataMatch = u.app_metadata?.username === parentData.username;
        return emailMatch || metadataMatch || appMetadataMatch;
      });
      console.log(`Username user found: ${!!user}`);
      if (!user) {
        console.log(`Available users (first 10):`, users.slice(0, 10).map(u => ({
          email: u.email,
          user_metadata: u.user_metadata,
          app_metadata: u.app_metadata
        })));
      }
    }
    
    if (user) {
      console.log(`Found user with ID: ${user.id}, resetting password...`);
      
      // Generate a temporary random password
      const tempPassword = crypto.randomUUID();
      
      // Update the user's password using admin API
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id, 
        { 
          password: tempPassword,
          email_confirm: true // Ensure email is confirmed
        }
      );
      
      if (updateError) {
        console.error('Error updating user password:', updateError);
        throw new Error(`Failed to reset user password: ${updateError.message}`);
      }
      
      console.log('User password reset successfully');
    } else {
      console.log('No auth user found for this identifier');
    }

    return new Response(
      JSON.stringify({ 
        message: 'Password reset successfully initiated',
        userPasswordReset: !!user
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in reset-parent-password function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An error occurred' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
})