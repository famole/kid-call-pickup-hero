-- Fix RLS security issue on backup table
ALTER TABLE pickup_history_backup ENABLE ROW LEVEL SECURITY;

-- Add a simple policy for the backup table (admin access only)
CREATE POLICY "Only admins can access backup table" ON pickup_history_backup
FOR ALL USING (get_current_user_role() = 'admin'::app_role);