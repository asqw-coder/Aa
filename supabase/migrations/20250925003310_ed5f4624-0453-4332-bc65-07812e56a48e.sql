-- Add unique constraint on path for storage_metadata table
ALTER TABLE public.storage_metadata 
ADD CONSTRAINT storage_metadata_path_unique UNIQUE (path);