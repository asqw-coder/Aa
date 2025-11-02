-- Add max_views_per_user to system_broadcasts
ALTER TABLE public.system_broadcasts 
ADD COLUMN max_views_per_user integer DEFAULT 1;

-- Create broadcast_views tracking table
CREATE TABLE public.broadcast_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid REFERENCES public.system_broadcasts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  view_count integer DEFAULT 1,
  last_viewed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(broadcast_id, user_id)
);

-- Enable RLS
ALTER TABLE public.broadcast_views ENABLE ROW LEVEL SECURITY;

-- Users can view their own broadcast views
CREATE POLICY "Users can view their own broadcast views"
ON public.broadcast_views
FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own broadcast views
CREATE POLICY "Users can insert their own broadcast views"
ON public.broadcast_views
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own broadcast views
CREATE POLICY "Users can update their own broadcast views"
ON public.broadcast_views
FOR UPDATE
USING (user_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX idx_broadcast_views_user_broadcast ON public.broadcast_views(user_id, broadcast_id);