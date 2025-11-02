-- Change darkstar-assets bucket from public to private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'darkstar-assets';