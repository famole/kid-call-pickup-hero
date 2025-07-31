-- First, let's identify and remove duplicate emails, keeping only the most recent one
WITH duplicates AS (
  SELECT email, 
         array_agg(id ORDER BY created_at DESC) as ids
  FROM public.parents 
  GROUP BY email 
  HAVING COUNT(*) > 1
),
to_delete AS (
  SELECT unnest(ids[2:]) as id
  FROM duplicates
)
DELETE FROM public.parents 
WHERE id IN (SELECT id FROM to_delete);

-- Now add the unique constraint
ALTER TABLE public.parents 
ADD CONSTRAINT parents_email_unique UNIQUE (email);