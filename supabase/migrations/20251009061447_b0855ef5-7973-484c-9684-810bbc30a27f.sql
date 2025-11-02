-- Phase 2: Create secure credentials table
CREATE TABLE IF NOT EXISTS public.user_api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ark_id TEXT NOT NULL,
  api_key TEXT NOT NULL,
  password TEXT NOT NULL,
  account_id TEXT NOT NULL,
  is_demo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_api_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies with dual verification
CREATE POLICY "Users can view their own credentials"
  ON public.user_api_credentials
  FOR SELECT
  USING (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can insert their own credentials"
  ON public.user_api_credentials
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can update their own credentials"
  ON public.user_api_credentials
  FOR UPDATE
  USING (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can delete their own credentials"
  ON public.user_api_credentials
  FOR DELETE
  USING (user_id = auth.uid() AND ark_id = get_current_ark_id());

-- Trigger for updated_at
CREATE TRIGGER update_user_api_credentials_updated_at
  BEFORE UPDATE ON public.user_api_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();