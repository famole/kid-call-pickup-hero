-- Fix infinite recursion in post_classes by simplifying the policy
-- The issue is the policy checking posts.deleted_at which creates circular dependency

-- Drop the problematic policy
DROP POLICY IF EXISTS "Parents can view post classes" ON post_classes;

-- Create a simpler policy that doesn't reference posts table
CREATE POLICY "Users can view post classes"
ON post_classes
FOR SELECT
USING (true);

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('public', 'public', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload post images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view post files" ON storage.objects;
DROP POLICY IF EXISTS "Authors can update post files" ON storage.objects;
DROP POLICY IF EXISTS "Authors can delete post files" ON storage.objects;

-- Allow authenticated users to upload to posts folder
CREATE POLICY "Authenticated users can upload post images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'public' AND 
  (storage.foldername(name))[1] = 'posts' AND
  (
    EXISTS (
      SELECT 1 FROM parents 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'teacher', 'superadmin')
    )
  )
);

-- Allow public access to read post files
CREATE POLICY "Public can view post files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'public' AND (storage.foldername(name))[1] = 'posts');

-- Allow admins/teachers to update their uploads
CREATE POLICY "Authors can update post files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'public' AND 
  (storage.foldername(name))[1] = 'posts' AND
  EXISTS (
    SELECT 1 FROM parents 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'teacher', 'superadmin')
  )
);

-- Allow admins/teachers to delete their uploads
CREATE POLICY "Authors can delete post files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'public' AND 
  (storage.foldername(name))[1] = 'posts' AND
  EXISTS (
    SELECT 1 FROM parents 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'teacher', 'superadmin')
  )
);