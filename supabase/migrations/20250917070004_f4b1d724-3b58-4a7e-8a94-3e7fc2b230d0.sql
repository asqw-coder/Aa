-- Create a function to get user email by username
CREATE OR REPLACE FUNCTION public.get_user_email_by_username(_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  SELECT email INTO user_email
  FROM auth.users au
  JOIN public.profiles p ON p.user_id = au.id
  WHERE p.username = _username;
  
  RETURN user_email;
END;
$$;