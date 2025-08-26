-- Allow public access to student names for invitation display
-- This is needed when showing invitation details to unauthenticated users
CREATE POLICY "Allow public access to student names for invitations"
ON students
FOR SELECT
TO anon, authenticated
USING (true);