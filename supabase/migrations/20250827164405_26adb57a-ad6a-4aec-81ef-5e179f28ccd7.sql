-- Update pickup_invitations expires_at default to 72 hours instead of 30 days

ALTER TABLE public.pickup_invitations 
ALTER COLUMN expires_at SET DEFAULT (now() + interval '72 hours');