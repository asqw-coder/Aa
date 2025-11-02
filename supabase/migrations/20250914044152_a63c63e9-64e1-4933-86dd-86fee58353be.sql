-- Update profiles table to include first_name and last_name
-- Add new columns for better user profile management

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text;

-- Update the trigger function to handle first_name and last_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, date_of_birth, gender, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'username',
    (NEW.raw_user_meta_data ->> 'date_of_birth')::date,
    NEW.raw_user_meta_data ->> 'gender',
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  RETURN NEW;
END;
$$;