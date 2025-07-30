-- Add unique constraint to email column in parents table
ALTER TABLE public.parents 
ADD CONSTRAINT parents_email_unique UNIQUE (email);