-- Add suspended field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS suspended BOOLEAN NOT NULL DEFAULT false;

-- Update device_data RLS policies to allow users to insert/update their own data
DROP POLICY IF EXISTS "No user access to device data - INSERT" ON public.device_data;
DROP POLICY IF EXISTS "No user access to device data - UPDATE" ON public.device_data;

CREATE POLICY "Users can insert their own device data"
ON public.device_data
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own device data"
ON public.device_data
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Add index for suspended field for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_suspended ON public.profiles(suspended) WHERE suspended = true;