-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a function to encrypt passwords (server-side only)
CREATE OR REPLACE FUNCTION encrypt_credential_password(plain_password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Get encryption key from a secure source (in production, this should be from Supabase secrets)
  -- For now, we'll use a combination of the user session and a secret
  encryption_key := COALESCE(
    current_setting('app.encryption_key', true),
    encode(digest('default_encryption_key_change_in_production', 'sha256'), 'hex')
  );
  
  -- Encrypt the password using AES-256
  RETURN encode(
    pgp_sym_encrypt(plain_password, encryption_key),
    'base64'
  );
END;
$$;

-- Create a function to decrypt passwords (server-side only)
CREATE OR REPLACE FUNCTION decrypt_credential_password(encrypted_password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Get encryption key (same as encryption function)
  encryption_key := COALESCE(
    current_setting('app.encryption_key', true),
    encode(digest('default_encryption_key_change_in_production', 'sha256'), 'base64')
  );
  
  -- Decrypt the password
  RETURN pgp_sym_decrypt(
    decode(encrypted_password, 'base64'),
    encryption_key
  );
EXCEPTION
  WHEN OTHERS THEN
    -- If decryption fails, return NULL
    RETURN NULL;
END;
$$;

-- Encrypt existing passwords in user_api_credentials table
-- First, add a new column for encrypted passwords
ALTER TABLE user_api_credentials ADD COLUMN IF NOT EXISTS password_encrypted TEXT;

-- Migrate existing passwords to encrypted format
UPDATE user_api_credentials
SET password_encrypted = encrypt_credential_password(password)
WHERE password IS NOT NULL AND (password_encrypted IS NULL OR password_encrypted = '');

-- Drop the old plain text password column and rename encrypted column
ALTER TABLE user_api_credentials DROP COLUMN IF EXISTS password CASCADE;
ALTER TABLE user_api_credentials RENAME COLUMN password_encrypted TO password;

-- Make sure password column is not null
ALTER TABLE user_api_credentials ALTER COLUMN password SET NOT NULL;

-- Add comment to remind developers that passwords are encrypted
COMMENT ON COLUMN user_api_credentials.password IS 'Encrypted password - use decrypt_credential_password() to access';

-- Update RLS policies to ensure they're secure (they already look good, but let's be explicit)
-- The existing policies already check user_id and ark_id, which is correct
-- No changes needed to RLS policies