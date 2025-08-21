-- Add new roles for family members who aren't in the platform
-- Step 1: Add the new enum values first

ALTER TYPE public.app_role ADD VALUE 'family';
ALTER TYPE public.app_role ADD VALUE 'other';