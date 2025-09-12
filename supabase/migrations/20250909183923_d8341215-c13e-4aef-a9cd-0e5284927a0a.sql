-- Fix the auto_complete_expired_requests function permissions
-- The function should be callable by the cron job system
DROP FUNCTION IF EXISTS public.auto_complete_expired_requests();

CREATE OR REPLACE FUNCTION public.auto_complete_expired_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update pickup requests that have been in 'called' status for more than 5 minutes
  -- Set their completed_time to the actual time they should have been completed (5 minutes after called)
  UPDATE public.pickup_requests
  SET 
    status = 'completed',
    -- Store the actual completion time (5 minutes after being called)
    updated_at = request_time + interval '5 minutes'
  WHERE status = 'called'
    AND request_time <= now() - interval '5 minutes';
END;
$$;

-- Grant execute permission to postgres role for cron jobs
GRANT EXECUTE ON FUNCTION public.auto_complete_expired_requests() TO postgres;

-- Fix the pickup completion trigger to use the proper completion time
DROP TRIGGER IF EXISTS pickup_completion_trigger ON public.pickup_requests;
DROP FUNCTION IF EXISTS public.handle_pickup_completion();

CREATE OR REPLACE FUNCTION public.handle_pickup_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Check if this record already exists to prevent duplicates
    IF NOT EXISTS (
      SELECT 1 FROM pickup_history 
      WHERE student_id = NEW.student_id 
      AND parent_id = NEW.parent_id 
      AND request_time = NEW.request_time
    ) THEN
      -- Insert into pickup_history with proper timestamps
      INSERT INTO pickup_history (
        student_id,
        parent_id,
        request_time,
        called_time,
        completed_time,
        pickup_duration_minutes
      ) VALUES (
        NEW.student_id,
        NEW.parent_id,
        NEW.request_time,
        -- Use the request_time as called_time if it was called status before
        CASE WHEN OLD.status = 'called' THEN NEW.request_time ELSE NULL END,
        -- Use the updated_at timestamp as the actual completion time
        NEW.updated_at,
        -- Calculate duration properly based on actual times
        CASE 
          WHEN OLD.status = 'called' AND NEW.updated_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (NEW.updated_at - NEW.request_time)) / 60
          ELSE NULL 
        END
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER pickup_completion_trigger
  AFTER UPDATE ON public.pickup_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_pickup_completion();

-- Clean up any duplicate records in pickup_history (keep the most recent one for each pickup)
DELETE FROM pickup_history 
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (
             PARTITION BY student_id, parent_id, request_time 
             ORDER BY created_at DESC
           ) as rn
    FROM pickup_history
  ) t 
  WHERE rn > 1
);