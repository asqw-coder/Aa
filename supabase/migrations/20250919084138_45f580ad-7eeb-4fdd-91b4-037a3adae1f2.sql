-- Drop existing RLS policies for device_data table
DROP POLICY IF EXISTS "Users can view their own device data" ON public.device_data;
DROP POLICY IF EXISTS "Users can insert their own device data" ON public.device_data;
DROP POLICY IF EXISTS "Users can update their own device data" ON public.device_data;

-- Create restrictive policies that prevent users from accessing device data
CREATE POLICY "No user access to device data - SELECT" 
ON public.device_data 
FOR SELECT 
USING (false);

CREATE POLICY "No user access to device data - INSERT" 
ON public.device_data 
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "No user access to device data - UPDATE" 
ON public.device_data 
FOR UPDATE 
USING (false);