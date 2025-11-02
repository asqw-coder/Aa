-- Add country_code to profiles for storing geolocation information
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS country_code text;