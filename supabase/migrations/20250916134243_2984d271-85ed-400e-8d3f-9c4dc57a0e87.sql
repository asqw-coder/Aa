-- Fix critical RLS security issues

-- 1. Fix encrypted_secrets table - only system admins should access
DROP POLICY IF EXISTS "Authenticated users can manage encrypted secrets" ON public.encrypted_secrets;
CREATE POLICY "Only system admins can manage encrypted secrets" 
ON public.encrypted_secrets 
FOR ALL 
USING (false) 
WITH CHECK (false);

-- 2. Fix config_settings table - only system admins should access
DROP POLICY IF EXISTS "Authenticated users can manage config settings" ON public.config_settings;
CREATE POLICY "Only system admins can manage config settings" 
ON public.config_settings 
FOR ALL 
USING (false) 
WITH CHECK (false);

-- 3. Fix system_logs table - only system admins should access
DROP POLICY IF EXISTS "Authenticated users can manage system logs" ON public.system_logs;
CREATE POLICY "Only system admins can manage system logs" 
ON public.system_logs 
FOR ALL 
USING (false) 
WITH CHECK (false);

-- 4. Add user_id to trading tables that are missing it and fix their RLS
-- Add user_id to daily_reports if not exists
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add user_id to risk_metrics if not exists  
ALTER TABLE public.risk_metrics ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add user_id to trading_sessions if not exists
ALTER TABLE public.trading_sessions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add user_id to ml_predictions if not exists
ALTER TABLE public.ml_predictions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add user_id to positions if not exists
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add user_id to trades if not exists
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 5. Update RLS policies for user-specific data access

-- Fix daily_reports RLS
DROP POLICY IF EXISTS "Authenticated users can manage their own reports" ON public.daily_reports;
CREATE POLICY "Users can manage their own daily reports" 
ON public.daily_reports 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Fix risk_metrics RLS
DROP POLICY IF EXISTS "Authenticated users can manage risk metrics" ON public.risk_metrics;
CREATE POLICY "Users can manage their own risk metrics" 
ON public.risk_metrics 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Fix trading_sessions RLS
DROP POLICY IF EXISTS "Authenticated users can manage sessions" ON public.trading_sessions;
CREATE POLICY "Users can manage their own trading sessions" 
ON public.trading_sessions 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Fix ml_predictions RLS
DROP POLICY IF EXISTS "Authenticated users can manage predictions" ON public.ml_predictions;
CREATE POLICY "Users can manage their own ML predictions" 
ON public.ml_predictions 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Fix positions RLS
DROP POLICY IF EXISTS "Authenticated users can manage positions" ON public.positions;
CREATE POLICY "Users can manage their own positions" 
ON public.positions 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Fix trades RLS
DROP POLICY IF EXISTS "Authenticated users can manage trades" ON public.trades;
CREATE POLICY "Users can manage their own trades" 
ON public.trades 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 6. Restrict other sensitive tables
DROP POLICY IF EXISTS "Authenticated users can manage ML models" ON public.ml_models;
CREATE POLICY "Only authenticated users can view ML models" 
ON public.ml_models 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Only system can manage ML models" 
ON public.ml_models 
FOR INSERT, UPDATE, DELETE 
USING (false) 
WITH CHECK (false);

-- Fix API usage table
DROP POLICY IF EXISTS "Authenticated users can manage API usage data" ON public.api_usage;
CREATE POLICY "Only system can manage API usage data" 
ON public.api_usage 
FOR ALL 
USING (false) 
WITH CHECK (false);

-- 7. Update existing records to have proper user_id values (set to first user for demo purposes)
-- In production, this should be done more carefully to map to correct users
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    -- Get the first user ID from auth.users (if any exists)
    SELECT id INTO first_user_id FROM auth.users LIMIT 1;
    
    IF first_user_id IS NOT NULL THEN
        -- Update records that don't have user_id set
        UPDATE public.daily_reports SET user_id = first_user_id WHERE user_id IS NULL;
        UPDATE public.risk_metrics SET user_id = first_user_id WHERE user_id IS NULL;
        UPDATE public.trading_sessions SET user_id = first_user_id WHERE user_id IS NULL;
        UPDATE public.ml_predictions SET user_id = first_user_id WHERE user_id IS NULL;
        UPDATE public.positions SET user_id = first_user_id WHERE user_id IS NULL;
        UPDATE public.trades SET user_id = first_user_id WHERE user_id IS NULL;
    END IF;
END
$$;