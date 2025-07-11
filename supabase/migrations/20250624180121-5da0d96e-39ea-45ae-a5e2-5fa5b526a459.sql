
-- Create a new table for self-checkout authorizations
CREATE TABLE public.self_checkout_authorizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  authorizing_parent_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create a new table to track when students actually leave
CREATE TABLE public.student_departures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  departed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  marked_by_user_id UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE public.self_checkout_authorizations 
ADD CONSTRAINT fk_self_checkout_student 
FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

ALTER TABLE public.self_checkout_authorizations 
ADD CONSTRAINT fk_self_checkout_parent 
FOREIGN KEY (authorizing_parent_id) REFERENCES public.parents(id) ON DELETE CASCADE;

ALTER TABLE public.student_departures 
ADD CONSTRAINT fk_departure_student 
FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE public.self_checkout_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_departures ENABLE ROW LEVEL SECURITY;

-- RLS policies for self_checkout_authorizations
CREATE POLICY "Parents can view their own authorizations" 
ON public.self_checkout_authorizations 
FOR SELECT 
USING (authorizing_parent_id = public.get_current_parent_id());

CREATE POLICY "Parents can create their own authorizations" 
ON public.self_checkout_authorizations 
FOR INSERT 
WITH CHECK (authorizing_parent_id = public.get_current_parent_id());

CREATE POLICY "Parents can update their own authorizations" 
ON public.self_checkout_authorizations 
FOR UPDATE 
USING (authorizing_parent_id = public.get_current_parent_id());

CREATE POLICY "Parents can delete their own authorizations" 
ON public.self_checkout_authorizations 
FOR DELETE 
USING (authorizing_parent_id = public.get_current_parent_id());

CREATE POLICY "Teachers and admins can view all authorizations" 
ON public.self_checkout_authorizations 
FOR SELECT 
USING (public.get_current_user_role() IN ('teacher', 'admin', 'superadmin'));

-- RLS policies for student_departures
CREATE POLICY "Teachers and admins can manage departures" 
ON public.student_departures 
FOR ALL 
USING (public.get_current_user_role() IN ('teacher', 'admin', 'superadmin'));

CREATE POLICY "Parents can view departures of their children" 
ON public.student_departures 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.student_parents sp 
    WHERE sp.student_id = student_departures.student_id 
    AND sp.parent_id = public.get_current_parent_id()
  )
);

-- Add indexes for better performance
CREATE INDEX idx_self_checkout_authorizations_student_id ON public.self_checkout_authorizations(student_id);
CREATE INDEX idx_self_checkout_authorizations_parent_id ON public.self_checkout_authorizations(authorizing_parent_id);
CREATE INDEX idx_self_checkout_authorizations_dates ON public.self_checkout_authorizations(start_date, end_date);
CREATE INDEX idx_student_departures_student_id ON public.student_departures(student_id);
CREATE INDEX idx_student_departures_departed_at ON public.student_departures(departed_at);
