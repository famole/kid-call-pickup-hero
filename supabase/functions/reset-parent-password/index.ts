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

    const { email } = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    console.log(`Starting password reset for email: ${email}`);

    // First, update the parent record to set password_set to false
    const { error: updateError } = await supabaseAdmin
      .from('parents')
      .update({ password_set: false })
      .eq('email', email);

    if (updateError) {
      console.error('Error updating parent record:', updateError);
      throw new Error(`Failed to update parent record: ${updateError.message}`);
    }

    console.log('Updated parent record successfully');

    // Get the user by email to get their ID
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      throw new Error(`Failed to list users: ${listError.message}`);
    }

    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (user) {
      console.log(`Found user with ID: ${user.id}, deleting...`);
      
      // Delete the user from auth
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      
      if (deleteError) {
        console.error('Error deleting user:', deleteError);
        throw new Error(`Failed to delete user: ${deleteError.message}`);
      }
      
      console.log('User deleted successfully');
    } else {
      console.log('No auth user found for this email');
    }

    return new Response(
      JSON.stringify({ 
        message: 'Password reset successfully initiated',
        userDeleted: !!user
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
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
})