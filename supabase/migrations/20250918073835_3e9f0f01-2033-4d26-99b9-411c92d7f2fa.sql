-- Update the handle_new_user function to better extract Google OAuth data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  username_value TEXT;
  first_name_value TEXT;
  last_name_value TEXT;
  full_name_value TEXT;
BEGIN
  -- Extract user metadata from different possible sources
  -- Try manual signup fields first
  first_name_value := NEW.raw_user_meta_data ->> 'first_name';
  last_name_value := NEW.raw_user_meta_data ->> 'last_name';
  
  -- If not found, try Google OAuth fields
  IF first_name_value IS NULL OR first_name_value = '' THEN
    -- Google OAuth provides different field names
    first_name_value := NEW.raw_user_meta_data ->> 'given_name';
    last_name_value := NEW.raw_user_meta_data ->> 'family_name';
    
    -- If still not found, try full_name or name field
    IF first_name_value IS NULL OR first_name_value = '' THEN
      full_name_value := COALESCE(
        NEW.raw_user_meta_data ->> 'full_name',
        NEW.raw_user_meta_data ->> 'name'
      );
      
      -- Split full name into first and last name
      IF full_name_value IS NOT NULL AND full_name_value != '' THEN
        -- Extract first name (everything before the last space)
        IF position(' ' in full_name_value) > 0 THEN
          first_name_value := split_part(full_name_value, ' ', 1);
          -- Extract last name (everything after the first space)
          last_name_value := trim(substring(full_name_value from position(' ' in full_name_value) + 1));
        ELSE
          -- If no space, use the whole name as first name
          first_name_value := full_name_value;
          last_name_value := NULL;
        END IF;
      END IF;
    END IF;
  END IF;
  
  -- Generate username based on available data
  -- Priority: 1) existing username in metadata, 2) email prefix, 3) first_name + random
  username_value := NEW.raw_user_meta_data ->> 'username';
  
  IF username_value IS NULL OR username_value = '' THEN
    IF NEW.email IS NOT NULL THEN
      -- Use email prefix as username
      username_value := split_part(NEW.email, '@', 1);
    ELSIF first_name_value IS NOT NULL THEN
      -- Use first name + random number (lowercase and clean)
      username_value := lower(regexp_replace(first_name_value, '[^a-zA-Z0-9]', '', 'g')) || floor(random() * 10000)::text;
    ELSE
      -- Fallback to user + random number
      username_value := 'user' || floor(random() * 100000)::text;
    END IF;
  END IF;
  
  -- Clean username (remove special characters and make lowercase)
  username_value := lower(regexp_replace(username_value, '[^a-zA-Z0-9_]', '', 'g'));
  
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
    -- Only set date_of_birth if provided (Google OAuth doesn't provide this)
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'date_of_birth' IS NOT NULL 
      THEN (NEW.raw_user_meta_data ->> 'date_of_birth')::date 
      ELSE NULL 
    END,
    -- Only set gender if provided (Google OAuth doesn't provide this)
    NEW.raw_user_meta_data ->> 'gender',
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$;