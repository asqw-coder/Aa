-- Enable RLS for device_metadata for safety (edge function uses service role)
ALTER TABLE public.device_metadata ENABLE ROW LEVEL SECURITY;

-- Do not add permissive policies; only service role (edge functions) should write.
