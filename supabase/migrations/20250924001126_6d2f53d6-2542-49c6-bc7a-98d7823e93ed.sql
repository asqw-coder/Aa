-- Create function to get storage metadata
CREATE OR REPLACE FUNCTION public.get_storage_metadata(file_path TEXT)
RETURNS TABLE (
  path TEXT,
  storage_tier TEXT,
  content_type TEXT,
  size_bytes BIGINT,
  metadata JSONB,
  uploaded_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sm.path,
    sm.storage_tier,
    sm.content_type,
    sm.size_bytes,
    sm.metadata,
    sm.uploaded_at
  FROM public.storage_metadata sm
  WHERE sm.path = file_path
  LIMIT 1;
END;
$$;