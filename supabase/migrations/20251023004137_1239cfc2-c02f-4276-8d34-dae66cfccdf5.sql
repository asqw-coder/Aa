-- Update handle_new_user to set country_code on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  username_value TEXT;
  first_name_value TEXT;
  last_name_value TEXT;
  full_name_value TEXT;
  ark_id_value TEXT;
  country_code_value TEXT;
BEGIN
  -- Extract country code from metadata or default to 'XX'
  country_code_value := COALESCE(
    NEW.raw_user_meta_data ->> 'country_code',
    NEW.raw_user_meta_data ->> 'country',
    'XX'
  );

  -- Ensure it's uppercase and exactly 2 characters
  country_code_value := upper(substring(country_code_value, 1, 2));
  IF length(country_code_value) != 2 THEN
    country_code_value := 'XX';
  END IF;

  -- Generate ARK ID with country code
  ark_id_value := public.generate_ark_id(NEW.id, country_code_value);

  -- Extract user metadata
  first_name_value := NEW.raw_user_meta_data ->> 'first_name';
  last_name_value := NEW.raw_user_meta_data ->> 'last_name';

  IF first_name_value IS NULL OR first_name_value = '' THEN
    first_name_value := NEW.raw_user_meta_data ->> 'given_name';
    last_name_value := NEW.raw_user_meta_data ->> 'family_name';

    IF first_name_value IS NULL OR first_name_value = '' THEN
      full_name_value := COALESCE(
        NEW.raw_user_meta_data ->> 'full_name',
        NEW.raw_user_meta_data ->> 'name'
      );

      IF full_name_value IS NOT NULL AND full_name_value != '' THEN
        IF position(' ' in full_name_value) > 0 THEN
          first_name_value := split_part(full_name_value, ' ', 1);
          last_name_value := trim(substring(full_name_value from position(' ' in full_name_value) + 1));
        ELSE
          first_name_value := full_name_value;
          last_name_value := NULL;
        END IF;
      END IF;
    END IF;
  END IF;

  -- Generate username
  username_value := NEW.raw_user_meta_data ->> 'username';

  IF username_value IS NULL OR username_value = '' THEN
    IF NEW.email IS NOT NULL THEN
      username_value := split_part(NEW.email, '@', 1);
    ELSIF first_name_value IS NOT NULL THEN
      username_value := lower(regexp_replace(first_name_value, '[^a-zA-Z0-9]', '', 'g')) || floor(random() * 10000)::text;
    ELSE
      username_value := 'user' || floor(random() * 100000)::text;
    END IF;
  END IF;

  username_value := lower(regexp_replace(username_value, '[^a-zA-Z0-9_]', '', 'g'));

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = username_value) LOOP
    username_value := username_value || floor(random() * 1000)::text;
  END LOOP;

  -- Insert profile with country_code
  INSERT INTO public.profiles (
    user_id,
    ark_id,
    username,
    first_name,
    last_name,
    date_of_birth,
    gender,
    country_code,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    ark_id_value,
    username_value,
    first_name_value,
    last_name_value,
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'date_of_birth' IS NOT NULL 
      THEN (NEW.raw_user_meta_data ->> 'date_of_birth')::date 
      ELSE NULL 
    END,
    NEW.raw_user_meta_data ->> 'gender',
    country_code_value,
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$function$;