-- Add secret_key column to user_api_credentials table for Alpaca API
ALTER TABLE public.user_api_credentials 
ADD COLUMN IF NOT EXISTS secret_key text;

-- Remove old Capital.com specific columns if they exist
ALTER TABLE public.user_api_credentials 
DROP COLUMN IF EXISTS password,
DROP COLUMN IF EXISTS account_id;

-- Add comment to table
COMMENT ON TABLE public.user_api_credentials IS 'Stores encrypted API credentials for Alpaca trading platform';
COMMENT ON COLUMN public.user_api_credentials.api_key IS 'Alpaca API Key ID';
COMMENT ON COLUMN public.user_api_credentials.secret_key IS 'Encrypted Alpaca Secret Key';
COMMENT ON COLUMN public.user_api_credentials.is_demo IS 'Paper trading (true) or Live trading (false)';
