-- Create storage metadata table for multi-tier storage tracking
CREATE TABLE public.storage_metadata (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path TEXT NOT NULL,
  storage_tier TEXT NOT NULL CHECK (storage_tier IN ('supabase', 'r2_active', 'backblaze_backup', 'backblaze_archive')),
  content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes BIGINT NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.storage_metadata ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can manage storage metadata"
ON public.storage_metadata
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_storage_metadata_path ON public.storage_metadata(path);
CREATE INDEX idx_storage_metadata_tier ON public.storage_metadata(storage_tier);
CREATE INDEX idx_storage_metadata_uploaded_at ON public.storage_metadata(uploaded_at);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_storage_metadata_updated_at
BEFORE UPDATE ON public.storage_metadata
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();