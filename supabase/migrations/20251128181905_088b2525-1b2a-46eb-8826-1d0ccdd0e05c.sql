
-- Drop overly permissive storage policies for activity images
DROP POLICY IF EXISTS "Authenticated users can upload activity images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update activity images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete activity images" ON storage.objects;

-- Create restrictive policies for activity images - only admins and teachers
CREATE POLICY "Only admins and teachers can upload activity images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'public'
  AND (storage.foldername(name))[1] = 'activities'
  AND get_current_user_role() IN ('admin', 'teacher', 'superadmin')
);

CREATE POLICY "Only admins and teachers can update activity images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'public'
  AND (storage.foldername(name))[1] = 'activities'
  AND get_current_user_role() IN ('admin', 'teacher', 'superadmin')
);

CREATE POLICY "Only admins and teachers can delete activity images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'public'
  AND (storage.foldername(name))[1] = 'activities'
  AND get_current_user_role() IN ('admin', 'teacher', 'superadmin')
);
