-- Add called_time column to pickup_requests table
ALTER TABLE public.pickup_requests 
ADD COLUMN IF NOT EXISTS called_time timestamp with time zone;

-- Update the trigger function to properly handle called_time
DROP TRIGGER IF EXISTS trigger_pickup_completion ON public.pickup_requests;
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
        -- Use the called_time from the pickup_requests table
        NEW.called_time,
        -- Use current timestamp as the actual completion time
        now(),
        -- Calculate duration based on called_time if available, otherwise request_time
        CASE 
          WHEN NEW.called_time IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (now() - NEW.called_time)) / 60
          ELSE 
            EXTRACT(EPOCH FROM (now() - NEW.request_time)) / 60
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