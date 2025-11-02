-- Update encrypt function to require encryption key parameter (no default fallback)
CREATE OR REPLACE FUNCTION public.encrypt_credential_password(plain_password text, encryption_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate that encryption key is provided
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Encryption key is required';
  END IF;
  
  -- Encrypt the password using AES-256 with the provided key
  RETURN encode(
    pgp_sym_encrypt(plain_password, encryption_key),
    'base64'
  );
END;
$function$;

-- Update decrypt function to require encryption key parameter (no default fallback)
CREATE OR REPLACE FUNCTION public.decrypt_credential_password(encrypted_password text, encryption_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate that encryption key is provided
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Encryption key is required';
  END IF;
  
  -- Decrypt the password using the provided key
  RETURN pgp_sym_decrypt(
    decode(encrypted_password, 'base64'),
    encryption_key
  );
EXCEPTION
  WHEN OTHERS THEN
    -- If decryption fails, return NULL but log the error
    RAISE WARNING 'Failed to decrypt password: %', SQLERRM;
    RETURN NULL;
END;
$function$;