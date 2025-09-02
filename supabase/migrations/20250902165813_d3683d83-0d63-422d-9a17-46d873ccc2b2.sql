-- Make email column nullable to support username-only users
ALTER TABLE public.parents ALTER COLUMN email DROP NOT NULL;