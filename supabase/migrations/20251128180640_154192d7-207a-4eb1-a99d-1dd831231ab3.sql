-- Create public storage bucket for activity images
INSERT INTO storage.buckets (id, name, public)
VALUES ('public', 'public', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload activity images
CREATE POLICY "Authenticated users can upload activity images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'public' AND (storage.foldername(name))[1] = 'activities');

-- Allow authenticated users to update their uploaded activity images
CREATE POLICY "Authenticated users can update activity images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'public' AND (storage.foldername(name))[1] = 'activities');

-- Allow authenticated users to delete activity images
CREATE POLICY "Authenticated users can delete activity images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'public' AND (storage.foldername(name))[1] = 'activities');

-- Allow public read access to activity images
CREATE POLICY "Public can view activity images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'public' AND (storage.foldername(name))[1] = 'activities');