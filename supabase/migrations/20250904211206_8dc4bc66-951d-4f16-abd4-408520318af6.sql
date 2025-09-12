-- Add password_hash column for username-only authentication
ALTER TABLE public.parents 
ADD COLUMN password_hash text;

-- Create an index for faster password lookups
CREATE INDEX idx_parents_username ON public.parents (username) WHERE username IS NOT NULL;