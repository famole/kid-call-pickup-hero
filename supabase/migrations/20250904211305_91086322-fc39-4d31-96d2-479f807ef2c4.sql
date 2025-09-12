-- Add password_hash column for username-only authentication
ALTER TABLE public.parents 
ADD COLUMN password_hash text;