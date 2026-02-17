import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Password decryption function (matches client-side encryption)
async function generatePasswordKey(passphrase: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('upsy-password-salt-2024'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

async function decryptPassword(encryptedPassword: string): Promise<string> {
  try {
    const passphrase = Deno.env.get('PASSWORD_ENCRYPTION_KEY') || "P@ssw0rd_3ncrypt!0n_K3y_2024";
    const key = await generatePasswordKey(passphrase);
    const decoder = new TextDecoder();
    
    const combined = new Uint8Array(
      atob(encryptedPassword).split('').map(char => char.charCodeAt(0))
    );
    
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decryptedPassword = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return decoder.decode(decryptedPassword);
  } catch (error) {
    console.error('Password decryption failed:', error);
    throw new Error('Failed to decrypt password');
  }
}

// Password hashing utilities - MUST match client-side hashing
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = 'upsy-password-hash-salt-2024'; // Must match client-side salt
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
    
    console.log('Setting up password for username:', identifier);

    // Try to decrypt password if it appears to be encrypted (length > 50 indicates encryption)
    let actualPassword = password;
    if (password && password.length > 50) {
      try {
        actualPassword = await decryptPassword(password);
        console.log('Password decrypted successfully for setup');
      } catch (decryptionError) {
        console.warn('Password decryption failed, using as-is:', decryptionError);
        // Continue with original password if decryption fails
      }
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get parent data by username or email
    const { data: parentData, error: parentError } = await supabase
      .rpc('get_parent_by_identifier', { identifier });

    if (parentError) {
      console.error('Error fetching parent:', parentError);
      throw new Error('User not found');
    }

    if (!parentData || parentData.length === 0) {
      console.log('No parent found for identifier:', identifier);
      throw new Error('User not found');
    }

    const parent = parentData[0];
    console.log('Setting password for parent:', parent.email || parent.username);

    // Check if this is an email-based user (has Supabase auth account) or username-only user
    if (parent.email) {
      console.log('Email-based user detected, using admin API to update auth password');

      // For email users, ensure password is decrypted before sending to Supabase Auth
      let finalPassword = actualPassword;
      if (password && password.length > 50) {
        try {
          finalPassword = await decryptPassword(password);
          console.log('Password decrypted successfully for email user');
        } catch (decryptionError) {
          console.warn('Password decryption failed for email user, using as-is:', decryptionError);
          finalPassword = actualPassword;
        }
      }

      // For email-based users, find their auth user and update password via admin API
      // Use RPC function to get user ID by email, then get full user data
      console.log(`Looking for parent email: ${parent.email}`);

      let authUser = null;

      const { data: userId, error: getUserError } = await supabase.rpc('get_auth_user_id_by_email', {
        user_email: parent.email
      });

      if (!getUserError && userId) {
        console.log(`Found auth user ID via RPC: ${userId}`);

        // Now get the full user data using the ID
        const { data: authUserData, error: getUserByIdError } = await supabase.auth.admin.getUserById(userId);

        if (!getUserByIdError && authUserData?.user) {
          authUser = authUserData.user;
          console.log(`Auth user found via getUserById: ${!!authUser}`);
        } else {
          console.log(`getUserById failed:`, getUserByIdError?.message || 'No user found');
        }
      } else {
        console.log(`get_auth_user_id_by_email failed:`, getUserError?.message || 'No user ID found');
      }

      // Fallback to listing users if RPC approach fails
      if (!authUser) {
        console.log('RPC approach failed, falling back to listUsers (paginated)...');

        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

        if (listError) {
          console.error('Error listing users:', listError);
          throw new Error('Failed to find user account');
        }

        console.log(`Total auth users found in first page: ${users.length}`);

        // Find the auth user by email - try exact match first, then case-insensitive
        authUser = users.find(u => u.email === parent.email);
        if (!authUser) {
          authUser = users.find(u => u.email?.toLowerCase() === parent.email?.toLowerCase());
        }

        console.log(`Auth user found in list: ${!!authUser}`);
        if (!authUser) {
          console.log(`Available user emails (first 10):`, users.slice(0, 10).map(u => u.email));
        }
      }

      if (!authUser) {
        console.log('No auth user found, creating new auth account');
        // Create new auth user if it doesn't exist
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: parent.email,
          password: finalPassword, // Use decrypted password for email users
          email_confirm: true
        });

        if (createError) {
          console.error('Error creating auth user:', createError);
          throw new Error('Failed to create user account');
        }

        console.log('New auth user created successfully');
      } else {
        console.log('Updating existing auth user password');
        // Update existing auth user's password
        const { error: updateAuthError } = await supabase.auth.admin.updateUserById(
          authUser.id,
          {
            password: finalPassword, // Use decrypted password for email users
            email_confirm: true
          }
        );

        if (updateAuthError) {
          console.error('Error updating auth user password:', updateAuthError);
          throw new Error('Failed to update user password');
        }

        console.log('Auth user password updated successfully');
      }

      // Update parent record to mark password as set and link auth_uid
      const authUserId = authUser?.id;
      const updatePayload: Record<string, any> = { password_set: true };
      if (authUserId) {
        updatePayload.auth_uid = authUserId;
      }

      const { error: updateError } = await supabase
        .from('parents')
        .update(updatePayload)
        .eq('id', parent.id);

      if (updateError) {
        // If auth_uid unique constraint fails, retry without it
        if (updateError.code === '23505' && authUserId) {
          console.warn('auth_uid already linked to another parent, setting password_set only');
          const { error: retryError } = await supabase
            .from('parents')
            .update({ password_set: true })
            .eq('id', parent.id);
          if (retryError) {
            console.error('Error updating parent record:', retryError);
            throw new Error('Failed to update parent record');
          }
        } else {
          console.error('Error updating parent record:', updateError);
          throw new Error('Failed to update parent record');
        }
      }
    } else {
      console.log('Username-only user detected, using password hash approach');

      // For username-only users, use password hash approach
      const passwordHash = await hashPassword(actualPassword);

      // Update parent with password hash and mark password as set
      const { error: updateError } = await supabase
        .from('parents')
        .update({
          password_hash: passwordHash,
          password_set: true
        })
        .eq('id', parent.id);

      if (updateError) {
        console.error('Error updating parent password:', updateError);
        throw new Error('Failed to set password');
      }
    }

    console.log('Password setup successful for:', parent.email || parent.username);

    return new Response(JSON.stringify({
      success: true,
      message: 'Password set successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in setup-username-password function:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Password setup failed'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});