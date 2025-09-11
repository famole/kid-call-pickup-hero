-- Fix the pickup completion trigger to work with actual pickup_requests table schema
DROP TRIGGER IF EXISTS trigger_pickup_completion ON public.pickup_requests;
DROP TRIGGER IF EXISTS pickup_completion_trigger ON public.pickup_requests;
DROP FUNCTION IF EXISTS public.handle_pickup_completion() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_pickup_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
        -- Use current timestamp as the actual completion time
        now(),
        -- Calculate duration properly based on request time and current time
        CASE 
          WHEN OLD.status = 'called' THEN 
            EXTRACT(EPOCH FROM (now() - NEW.request_time)) / 60
          ELSE NULL 
        END
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER trigger_pickup_completion
  AFTER UPDATE ON public.pickup_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_pickup_completion();