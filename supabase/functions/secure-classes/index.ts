import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Encryption utilities
async function generateKey(passphrase: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passphraseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("upsy-secure-salt-2024"),
      iterations: 100000,
      hash: "SHA-256",
    },
    passphraseKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

function getEncryptionPassphrase(): string {
  return Deno.env.get('ENCRYPTION_KEY') || 'U9.#s!_So2*';
}

async function encryptData(data: any): Promise<string> {
  const passphrase = getEncryptionPassphrase();
  const key = await generateKey(passphrase);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(JSON.stringify(data))
  );
  
  const encryptedArray = new Uint8Array(encrypted);
  const result = new Uint8Array(iv.length + encryptedArray.length);
  result.set(iv);
  result.set(encryptedArray, iv.length);
  
  return btoa(String.fromCharCode(...result));
}

async function decryptData(encryptedData: string): Promise<any> {
  const passphrase = getEncryptionPassphrase();
  const key = await generateKey(passphrase);
  const decoder = new TextDecoder();
  
  const data = new Uint8Array(atob(encryptedData).split('').map(char => char.charCodeAt(0)));
  const iv = data.slice(0, 12);
  const encrypted = data.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encrypted
  );
  
  return JSON.parse(decoder.decode(decrypted));
}

serve(async (req) => {
  console.log('Secure classes function called with method:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { operation, ...params } = await req.json();
    console.log('Operation requested:', operation, 'with params:', params);

    let result;

    switch (operation) {
      case 'getAll':
        console.log('Fetching all classes...');
        const { data: classesData, error: classesError } = await supabase
          .from('classes')
          .select('*')
          .order('name');

        if (classesError) {
          console.error('Database error:', classesError);
          throw classesError;
        }

        console.log(`Fetched ${classesData?.length || 0} classes`);
        result = { data: classesData, error: null };
        break;

      case 'getById':
        console.log('Fetching class by ID:', params.id);
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('*')
          .eq('id', params.id)
          .single();

        if (classError) {
          console.error('Database error:', classError);
          throw classError;
        }

        console.log('Fetched class:', classData?.name);
        result = { data: classData, error: null };
        break;

      case 'create':
        console.log('Creating new class:', params.classData.name);
        const { data: createdClass, error: createError } = await supabase
          .from('classes')
          .insert({
            name: params.classData.name,
            grade: params.classData.grade,
            teacher: params.classData.teacher
          })
          .select()
          .single();

        if (createError) {
          console.error('Database error:', createError);
          throw createError;
        }

        console.log('Created class:', createdClass.name);
        result = { data: createdClass, error: null };
        break;

      case 'update':
        console.log('Updating class:', params.id);
        const updateData: Record<string, any> = {};
        if (params.classData.name !== undefined) updateData.name = params.classData.name;
        if (params.classData.grade !== undefined) updateData.grade = params.classData.grade;
        if (params.classData.teacher !== undefined) updateData.teacher = params.classData.teacher;

        const { data: updatedClass, error: updateError } = await supabase
          .from('classes')
          .update(updateData)
          .eq('id', params.id)
          .select()
          .single();

        if (updateError) {
          console.error('Database error:', updateError);
          throw updateError;
        }

        console.log('Updated class:', updatedClass.name);
        result = { data: updatedClass, error: null };
        break;

      case 'delete':
        console.log('Deleting class:', params.id);
        const { error: deleteError } = await supabase
          .from('classes')
          .delete()
          .eq('id', params.id);

        if (deleteError) {
          console.error('Database error:', deleteError);
          throw deleteError;
        }

        console.log('Deleted class successfully');
        result = { data: null, error: null };
        break;

      case 'migrate':
        console.log('Migrating classes:', params.classes.length);
        const classesForInsert = params.classes.map((cls: any) => ({
          id: cls.id,
          name: cls.name,
          grade: cls.grade,
          teacher: cls.teacher
        }));

        const { error: migrateError } = await supabase
          .from('classes')
          .upsert(classesForInsert);

        if (migrateError) {
          console.error('Database error:', migrateError);
          throw migrateError;
        }

        console.log('Migrated classes successfully');
        result = { data: null, error: null };
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    console.log('Encrypting result...');
    const encryptedResult = await encryptData(result);
    console.log('Result encrypted successfully');

    return new Response(JSON.stringify({ encryptedData: encryptedResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in secure-classes function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred while processing the request' 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});