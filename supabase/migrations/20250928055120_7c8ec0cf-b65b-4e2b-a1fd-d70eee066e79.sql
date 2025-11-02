-- Create the darkstar-assets storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('darkstar-assets', 'darkstar-assets', true);

-- Create policy for public access to darkstar-assets bucket
CREATE POLICY "Public access to darkstar-assets bucket" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'darkstar-assets');

-- Create policy for authenticated users to upload to darkstar-assets
CREATE POLICY "Authenticated users can upload to darkstar-assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'darkstar-assets' AND auth.role() = 'authenticated');

-- Create policy for authenticated users to update files in darkstar-assets
CREATE POLICY "Authenticated users can update darkstar-assets files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'darkstar-assets' AND auth.role() = 'authenticated');

-- Create policy for authenticated users to delete from darkstar-assets
CREATE POLICY "Authenticated users can delete from darkstar-assets" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'darkstar-assets' AND auth.role() = 'authenticated');