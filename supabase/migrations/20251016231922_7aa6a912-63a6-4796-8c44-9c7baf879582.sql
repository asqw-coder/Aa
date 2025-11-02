-- Create enum for broadcast types
CREATE TYPE public.broadcast_type AS ENUM ('announcement', 'maintenance', 'update', 'terms_change', 'urgent');

-- Create system_broadcasts table for admin announcements
CREATE TABLE public.system_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type public.broadcast_type NOT NULL DEFAULT 'announcement',
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true NOT NULL
);

-- Enable RLS
ALTER TABLE public.system_broadcasts ENABLE ROW LEVEL SECURITY;

-- Everyone can read active broadcasts
CREATE POLICY "Anyone can view active broadcasts"
  ON public.system_broadcasts
  FOR SELECT
  USING (is_active = true);

-- Only admins can create broadcasts
CREATE POLICY "Admins can create broadcasts"
  ON public.system_broadcasts
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update broadcasts
CREATE POLICY "Admins can update broadcasts"
  ON public.system_broadcasts
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete broadcasts
CREATE POLICY "Admins can delete broadcasts"
  ON public.system_broadcasts
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create user_reports table for issue reporting
CREATE TABLE public.user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ark_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('bug', 'feature_request', 'technical_issue', 'account_issue', 'other')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  admin_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own reports
CREATE POLICY "Users can view their own reports"
  ON public.user_reports
  FOR SELECT
  USING (user_id = auth.uid() AND ark_id = public.get_current_ark_id());

-- Users can create their own reports
CREATE POLICY "Users can create their own reports"
  ON public.user_reports
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND ark_id = public.get_current_ark_id());

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
  ON public.user_reports
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update all reports
CREATE POLICY "Admins can update all reports"
  ON public.user_reports
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_user_reports_updated_at
  BEFORE UPDATE ON public.user_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_broadcasts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_reports;