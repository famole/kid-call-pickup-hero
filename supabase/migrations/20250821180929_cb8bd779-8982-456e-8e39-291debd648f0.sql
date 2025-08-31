-- Step 2: Create the pickup invitations table now that the enum values exist

-- Create a table to store pickup invitations for family members
CREATE TABLE public.pickup_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Basic info for the invited person
  invited_name text NOT NULL,
  invited_email text NOT NULL,
  invited_role app_role NOT NULL DEFAULT 'family',
  
  -- Who is inviting and for which students
  inviting_parent_id uuid NOT NULL,
  student_ids uuid[] NOT NULL,
  
  -- Authorization dates
  start_date date NOT NULL,
  end_date date NOT NULL,
  
  -- Invitation status
  invitation_status text NOT NULL DEFAULT 'pending', -- pending, accepted, expired
  invitation_token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '30 days'),
  
  -- When accepted, this links to the created parent
  accepted_parent_id uuid,
  
  CONSTRAINT pickup_invitations_inviting_parent_id_fkey 
    FOREIGN KEY (inviting_parent_id) REFERENCES parents(id) ON DELETE CASCADE,
  CONSTRAINT pickup_invitations_accepted_parent_id_fkey 
    FOREIGN KEY (accepted_parent_id) REFERENCES parents(id) ON DELETE SET NULL
);

-- Enable RLS on pickup_invitations table
ALTER TABLE public.pickup_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for pickup_invitations
CREATE POLICY "Users can view their own invitations" ON public.pickup_invitations
FOR SELECT 
USING (inviting_parent_id = get_current_parent_id());

CREATE POLICY "Users can create invitations for their students" ON public.pickup_invitations
FOR INSERT 
WITH CHECK (inviting_parent_id = get_current_parent_id());

CREATE POLICY "Users can update their own invitations" ON public.pickup_invitations
FOR UPDATE 
USING (inviting_parent_id = get_current_parent_id());

CREATE POLICY "Users can delete their own invitations" ON public.pickup_invitations
FOR DELETE 
USING (inviting_parent_id = get_current_parent_id());

CREATE POLICY "Admins can view all invitations" ON public.pickup_invitations
FOR ALL 
USING (get_current_user_role() IN ('admin', 'superadmin'));

-- Create indexes for better performance
CREATE INDEX idx_pickup_invitations_inviting_parent ON public.pickup_invitations(inviting_parent_id);
CREATE INDEX idx_pickup_invitations_token ON public.pickup_invitations(invitation_token);
CREATE INDEX idx_pickup_invitations_email ON public.pickup_invitations(invited_email);
CREATE INDEX idx_pickup_invitations_status ON public.pickup_invitations(invitation_status);

-- Create trigger for updating updated_at timestamp
CREATE TRIGGER update_pickup_invitations_updated_at
BEFORE UPDATE ON public.pickup_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();