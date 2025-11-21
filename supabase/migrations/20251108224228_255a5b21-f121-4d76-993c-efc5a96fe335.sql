-- Create school_activities table
CREATE TABLE public.school_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  activity_date DATE NOT NULL,
  activity_time TIME,
  image_url TEXT,
  class_id UUID REFERENCES public.classes(id),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.school_activities ENABLE ROW LEVEL SECURITY;

-- Everyone can view activities (not soft-deleted)
CREATE POLICY "Anyone can view activities"
ON public.school_activities
FOR SELECT
USING (deleted_at IS NULL);

-- Only admins can insert activities
CREATE POLICY "Admins can insert activities"
ON public.school_activities
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.parents
    WHERE id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Only admins can update activities
CREATE POLICY "Admins can update activities"
ON public.school_activities
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.parents
    WHERE id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Only admins can delete activities (soft delete)
CREATE POLICY "Admins can delete activities"
ON public.school_activities
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.parents
    WHERE id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_school_activities_updated_at
BEFORE UPDATE ON public.school_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert mock activities data
INSERT INTO public.school_activities (title, description, activity_date, activity_time, image_url, class_id)
VALUES
  ('Spring Festival', 'Join us for our annual Spring Festival with games, food, and fun activities for all ages!', '2025-04-15', '10:00:00', 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800', NULL),
  ('Parent-Teacher Conference', 'Individual meetings with teachers to discuss student progress and goals.', '2025-03-20', '14:00:00', NULL, NULL),
  ('Science Fair', 'Students will present their amazing science projects. Come see what they''ve been working on!', '2025-05-10', '09:00:00', 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800', NULL),
  ('Field Trip - Natural History Museum', 'All grades will visit the Natural History Museum. Permission slips required.', '2025-03-28', '08:30:00', 'https://images.unsplash.com/photo-1605326152964-56fb991b95ff?w=800', NULL),
  ('Book Fair Week', 'Browse and purchase books for all reading levels. Supporting our school library!', '2025-04-07', NULL, 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800', NULL),
  ('School Play - The Lion King', 'Our students perform a spectacular rendition of The Lion King. Don''t miss it!', '2025-05-22', '18:00:00', 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800', NULL),
  ('Sports Day', 'Annual sports competition with track and field events, team games, and more.', '2025-06-05', '09:00:00', 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800', NULL),
  ('Art Exhibition', 'Showcasing student artwork from throughout the year. Reception with light refreshments.', '2025-04-25', '15:00:00', 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800', NULL),
  ('International Day', 'Celebrate cultures from around the world with food, performances, and displays.', '2025-05-15', '11:00:00', 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=800', NULL),
  ('End of Year Picnic', 'Join us for our end-of-year celebration with food, games, and memories!', '2025-06-20', '12:00:00', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800', NULL);