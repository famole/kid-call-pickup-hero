
-- Add auth_uid column to parents table
ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS auth_uid uuid UNIQUE REFERENCES auth.users(id);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_parents_auth_uid ON public.parents(auth_uid);

-- Backfill: link existing parents to their auth.users by matching email
UPDATE public.parents p
SET auth_uid = u.id
FROM auth.users u
WHERE p.email IS NOT NULL
  AND p.email = u.email
  AND p.auth_uid IS NULL;
