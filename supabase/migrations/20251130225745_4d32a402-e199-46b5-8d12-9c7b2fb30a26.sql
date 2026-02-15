-- Fix storage RLS for post uploads: use get_current_user_role() instead of parents.id = auth.uid()

-- Drop existing post-related storage policies
DROP POLICY IF EXISTS "Authenticated users can upload post images" ON storage.objects;
DROP POLICY IF EXISTS "Authors can update post files" ON storage.objects;
DROP POLICY IF EXISTS "Authors can delete post files" ON storage.objects;

-- Allow admins/teachers/superadmins to upload to posts folder in public bucket
CREATE POLICY "Admins and teachers can upload post images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'public'
  AND (storage.foldername(name))[1] = 'posts'
  AND get_current_user_role() IN ('admin', 'teacher', 'superadmin')
);

-- Allow same roles to update their post files
CREATE POLICY "Admins and teachers can update post files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'public'
  AND (storage.foldername(name))[1] = 'posts'
  AND get_current_user_role() IN ('admin', 'teacher', 'superadmin')
);

-- Allow same roles to delete their post files
CREATE POLICY "Admins and teachers can delete post files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'public'
  AND (storage.foldername(name))[1] = 'posts'
  AND get_current_user_role() IN ('admin', 'teacher', 'superadmin')
);