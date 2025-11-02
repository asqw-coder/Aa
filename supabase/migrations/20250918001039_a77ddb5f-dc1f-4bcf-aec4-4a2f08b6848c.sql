-- Create function to handle new user creation (including Google OAuth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  username_value TEXT;
  first_name_value TEXT;
  last_name_value TEXT;
BEGIN
  -- Extract user metadata
  first_name_value := NEW.raw_user_meta_data ->> 'first_name';
  last_name_value := NEW.raw_user_meta_data ->> 'last_name';
  
  -- Generate username based on available data
  -- Priority: 1) existing username in metadata, 2) email prefix, 3) first_name + random
  username_value := NEW.raw_user_meta_data ->> 'username';
  
  IF username_value IS NULL OR username_value = '' THEN
    IF NEW.email IS NOT NULL THEN
      -- Use email prefix as username
      username_value := split_part(NEW.email, '@', 1);
    ELSIF first_name_value IS NOT NULL THEN
      -- Use first name + random number
      username_value := lower(first_name_value) || floor(random() * 10000)::text;
    ELSE
      -- Fallback to user + random number
      username_value := 'user' || floor(random() * 100000)::text;
    END IF;
  END IF;
  
  -- Ensure username is unique by appending numbers if needed
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = username_value) LOOP
    username_value := username_value || floor(random() * 1000)::text;
  END LOOP;
  
  -- Insert profile record
  INSERT INTO public.profiles (
    user_id,
    username,
    first_name,
    last_name,
    date_of_birth,
    gender,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    username_value,
    first_name_value,
    last_name_value,
    (NEW.raw_user_meta_data ->> 'date_of_birth')::date,
    NEW.raw_user_meta_data ->> 'gender',
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create profile for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();