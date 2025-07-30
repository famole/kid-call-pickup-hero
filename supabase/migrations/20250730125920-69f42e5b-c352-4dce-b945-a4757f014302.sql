-- Create the trigger for pickup completion
CREATE OR REPLACE TRIGGER trigger_pickup_completion
  AFTER UPDATE ON public.pickup_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_pickup_completion();

-- Migrate existing completed pickup requests to pickup_history
INSERT INTO pickup_history (
  student_id,
  parent_id,
  request_time,
  called_time,
  completed_time,
  pickup_duration_minutes
)
SELECT 
  student_id,
  parent_id,
  request_time,
  CASE WHEN status = 'called' THEN request_time ELSE NULL END as called_time,
  -- For completed requests, we'll use the request_time + 10 minutes as completed_time
  -- since we don't have the actual completion time
  request_time + interval '10 minutes' as completed_time,
  CASE WHEN status = 'called' THEN 10 ELSE NULL END as pickup_duration_minutes
FROM pickup_requests 
WHERE status = 'completed'
ON CONFLICT (id) DO NOTHING;