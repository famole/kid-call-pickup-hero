-- Create posts table for communication feed
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  image_url TEXT,
  attachment_url TEXT,
  attachment_name TEXT,
  link_url TEXT,
  target_audience_type TEXT NOT NULL DEFAULT 'all' CHECK (target_audience_type IN ('all', 'classes')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create post_classes junction table for class-specific posts
CREATE TABLE public.post_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, class_id)
);

-- Create post_reads table to track when parents read posts
CREATE TABLE public.post_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, parent_id)
);

-- Create post_reactions table for emoji reactions
CREATE TABLE public.post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, parent_id, emoji)
);

-- Enable RLS on all tables
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for posts table

-- Admins and teachers can create posts
CREATE POLICY "Admins and teachers can create posts"
ON public.posts
FOR INSERT
TO authenticated
WITH CHECK (
  get_current_user_role() IN ('admin', 'teacher', 'superadmin')
);

-- Admins and teachers can update their own posts
CREATE POLICY "Admins and teachers can update their posts"
ON public.posts
FOR UPDATE
TO authenticated
USING (
  author_id = get_current_parent_id() AND
  get_current_user_role() IN ('admin', 'teacher', 'superadmin')
);

-- Admins can delete any post, teachers can delete their own
CREATE POLICY "Admins and teachers can delete posts"
ON public.posts
FOR DELETE
TO authenticated
USING (
  (get_current_user_role() = 'admin' OR get_current_user_role() = 'superadmin') OR
  (author_id = get_current_parent_id() AND get_current_user_role() = 'teacher')
);

-- Parents can view posts relevant to them
CREATE POLICY "Parents can view relevant posts"
ON public.posts
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL AND (
    -- All-school posts visible to everyone
    target_audience_type = 'all' OR
    -- Class-specific posts visible if parent has child in that class
    (
      target_audience_type = 'classes' AND
      EXISTS (
        SELECT 1 FROM post_classes pc
        JOIN students s ON s.class_id = pc.class_id
        JOIN student_parents sp ON sp.student_id = s.id
        WHERE pc.post_id = posts.id
        AND sp.parent_id = get_current_parent_id()
      )
    ) OR
    -- Admins and teachers can see all posts
    get_current_user_role() IN ('admin', 'teacher', 'superadmin')
  )
);

-- RLS Policies for post_classes table

-- Admins and teachers can manage post-class assignments
CREATE POLICY "Admins and teachers can manage post classes"
ON public.post_classes
FOR ALL
TO authenticated
USING (
  get_current_user_role() IN ('admin', 'teacher', 'superadmin')
)
WITH CHECK (
  get_current_user_role() IN ('admin', 'teacher', 'superadmin')
);

-- Parents can view post-class assignments for posts they can see
CREATE POLICY "Parents can view post classes"
ON public.post_classes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM posts p
    WHERE p.id = post_classes.post_id
    AND p.deleted_at IS NULL
  )
);

-- RLS Policies for post_reads table

-- Users can create their own read receipts
CREATE POLICY "Users can create their own read receipts"
ON public.post_reads
FOR INSERT
TO authenticated
WITH CHECK (
  parent_id = get_current_parent_id()
);

-- Users can view their own read receipts
CREATE POLICY "Users can view their own read receipts"
ON public.post_reads
FOR SELECT
TO authenticated
USING (
  parent_id = get_current_parent_id()
);

-- Admins can view all read receipts
CREATE POLICY "Admins can view all read receipts"
ON public.post_reads
FOR SELECT
TO authenticated
USING (
  get_current_user_role() IN ('admin', 'superadmin')
);

-- Post authors can view read receipts for their posts
CREATE POLICY "Authors can view read receipts for their posts"
ON public.post_reads
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM posts p
    WHERE p.id = post_reads.post_id
    AND p.author_id = get_current_parent_id()
  )
);

-- RLS Policies for post_reactions table

-- Users can add reactions to posts they can view
CREATE POLICY "Users can add reactions"
ON public.post_reactions
FOR INSERT
TO authenticated
WITH CHECK (
  parent_id = get_current_parent_id() AND
  EXISTS (
    SELECT 1 FROM posts p
    WHERE p.id = post_reactions.post_id
    AND p.deleted_at IS NULL
  )
);

-- Users can remove their own reactions
CREATE POLICY "Users can remove their own reactions"
ON public.post_reactions
FOR DELETE
TO authenticated
USING (
  parent_id = get_current_parent_id()
);

-- Anyone can view reactions on posts they can see
CREATE POLICY "Users can view reactions"
ON public.post_reactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM posts p
    WHERE p.id = post_reactions.post_id
    AND p.deleted_at IS NULL
  )
);

-- Create updated_at trigger for posts
CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_posts_author_id ON public.posts(author_id);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX idx_posts_target_audience ON public.posts(target_audience_type);
CREATE INDEX idx_post_classes_post_id ON public.post_classes(post_id);
CREATE INDEX idx_post_classes_class_id ON public.post_classes(class_id);
CREATE INDEX idx_post_reads_post_id ON public.post_reads(post_id);
CREATE INDEX idx_post_reads_parent_id ON public.post_reads(parent_id);
CREATE INDEX idx_post_reactions_post_id ON public.post_reactions(post_id);

-- Enable realtime for posts table
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER TABLE public.posts REPLICA IDENTITY FULL;