-- Create device_metadata table for collecting anonymous device information
CREATE TABLE public.device_metadata (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT,
  device_name TEXT,
  country_code TEXT,
  ip_address TEXT,
  user_agent TEXT,
  language TEXT,
  platform TEXT,
  screen_width INTEGER,
  screen_height INTEGER,
  viewport_width INTEGER,
  viewport_height INTEGER,
  timezone TEXT,
  collected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for performance
CREATE INDEX idx_device_metadata_visitor_id ON public.device_metadata(visitor_id);
CREATE INDEX idx_device_metadata_country_code ON public.device_metadata(country_code);
CREATE INDEX idx_device_metadata_collected_at ON public.device_metadata(collected_at);

-- No RLS needed as this is for anonymous data collection