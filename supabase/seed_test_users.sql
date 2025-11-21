-- Create test users
-- Note: Run this in your Supabase SQL Editor

-- 1. Create Admin User
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Create auth user for admin
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@upsy.test',
    crypt('Admin123!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Admin User"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO admin_user_id;

  -- Create parent profile for admin
  INSERT INTO public.parents (
    id,
    email,
    name,
    phone,
    username,
    created_at,
    updated_at
  ) VALUES (
    admin_user_id,
    'admin@upsy.test',
    'Admin User',
    '+1234567890',
    'admin',
    NOW(),
    NOW()
  );

  -- Assign admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_user_id, 'admin');

  RAISE NOTICE 'Admin user created with email: admin@upsy.test and password: Admin123!';
END $$;

-- 2. Create Parent User
DO $$
DECLARE
  parent_user_id uuid;
BEGIN
  -- Create auth user for parent
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'parent@upsy.test',
    crypt('Parent123!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"John Parent"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO parent_user_id;

  -- Create parent profile
  INSERT INTO public.parents (
    id,
    email,
    name,
    phone,
    username,
    created_at,
    updated_at
  ) VALUES (
    parent_user_id,
    'parent@upsy.test',
    'John Parent',
    '+1234567891',
    'johnparent',
    NOW(),
    NOW()
  );

  -- Assign parent role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (parent_user_id, 'parent');

  RAISE NOTICE 'Parent user created with email: parent@upsy.test and password: Parent123!';
END $$;

-- Display credentials
SELECT 
  '🔐 Test User Credentials Created!' as status,
  '' as blank_line
UNION ALL
SELECT 
  '👨‍💼 Admin User:' as info,
  '' as blank_line
UNION ALL
SELECT 
  '   Email: admin@upsy.test' as info,
  '' as blank_line
UNION ALL
SELECT 
  '   Password: Admin123!' as info,
  '' as blank_line
UNION ALL
SELECT 
  '' as blank_line,
  '' as blank_line
UNION ALL
SELECT 
  '👨‍👩‍👧 Parent User:' as info,
  '' as blank_line
UNION ALL
SELECT 
  '   Email: parent@upsy.test' as info,
  '' as blank_line
UNION ALL
SELECT 
  '   Password: Parent123!' as info,
  '' as blank_line;
