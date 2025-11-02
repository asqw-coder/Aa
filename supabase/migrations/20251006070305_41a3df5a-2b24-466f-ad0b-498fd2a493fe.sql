-- Create function to generate A.R.K ID from UUID
-- Takes first 3 chars, last 3 chars, and chars at positions 8-9 from UUID (removing dashes)
CREATE OR REPLACE FUNCTION public.generate_ark_id(user_uuid uuid)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uuid_str text;
  clean_uuid text;
BEGIN
  -- Convert UUID to string and remove dashes
  uuid_str := user_uuid::text;
  clean_uuid := replace(uuid_str, '-', '');
  
  -- Extract: first 3 + chars at positions 8-9 + last 3 = 8 digits
  RETURN substring(clean_uuid, 1, 3) || substring(clean_uuid, 8, 2) || substring(clean_uuid, length(clean_uuid) - 2, 3);
END;
$$;

-- Create function to get ARK ID for current user
CREATE OR REPLACE FUNCTION public.get_current_ark_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.generate_ark_id(auth.uid());
$$;

-- Add ark_id column to profiles table and populate it
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ark_id text;

-- Populate existing ark_ids
UPDATE public.profiles
SET ark_id = public.generate_ark_id(user_id)
WHERE ark_id IS NULL;

-- Make ark_id NOT NULL and add unique constraint
ALTER TABLE public.profiles ALTER COLUMN ark_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_ark_id_key ON public.profiles(ark_id);

-- Add ark_id to other user-specific tables
ALTER TABLE public.trading_sessions ADD COLUMN IF NOT EXISTS ark_id text;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS ark_id text;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS ark_id text;
ALTER TABLE public.risk_metrics ADD COLUMN IF NOT EXISTS ark_id text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS ark_id text;
ALTER TABLE public.ml_predictions ADD COLUMN IF NOT EXISTS ark_id text;
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS ark_id text;
ALTER TABLE public.kill_switch_config ADD COLUMN IF NOT EXISTS ark_id text;
ALTER TABLE public.user_trading_symbols ADD COLUMN IF NOT EXISTS ark_id text;

-- Populate ark_ids in all tables
UPDATE public.trading_sessions SET ark_id = public.generate_ark_id(user_id) WHERE user_id IS NOT NULL AND ark_id IS NULL;
UPDATE public.positions SET ark_id = public.generate_ark_id(user_id) WHERE user_id IS NOT NULL AND ark_id IS NULL;
UPDATE public.trades SET ark_id = public.generate_ark_id(user_id) WHERE user_id IS NOT NULL AND ark_id IS NULL;
UPDATE public.risk_metrics SET ark_id = public.generate_ark_id(user_id) WHERE user_id IS NOT NULL AND ark_id IS NULL;
UPDATE public.notifications SET ark_id = public.generate_ark_id(user_id) WHERE user_id IS NOT NULL AND ark_id IS NULL;
UPDATE public.ml_predictions SET ark_id = public.generate_ark_id(user_id) WHERE user_id IS NOT NULL AND ark_id IS NULL;
UPDATE public.daily_reports SET ark_id = public.generate_ark_id(user_id) WHERE user_id IS NOT NULL AND ark_id IS NULL;
UPDATE public.kill_switch_config SET ark_id = public.generate_ark_id(user_id) WHERE user_id IS NOT NULL AND ark_id IS NULL;
UPDATE public.user_trading_symbols SET ark_id = public.generate_ark_id(user_id) WHERE user_id IS NOT NULL AND ark_id IS NULL;

-- Create indexes for ark_id columns
CREATE INDEX IF NOT EXISTS trading_sessions_ark_id_idx ON public.trading_sessions(ark_id);
CREATE INDEX IF NOT EXISTS positions_ark_id_idx ON public.positions(ark_id);
CREATE INDEX IF NOT EXISTS trades_ark_id_idx ON public.trades(ark_id);
CREATE INDEX IF NOT EXISTS risk_metrics_ark_id_idx ON public.risk_metrics(ark_id);
CREATE INDEX IF NOT EXISTS notifications_ark_id_idx ON public.notifications(ark_id);
CREATE INDEX IF NOT EXISTS ml_predictions_ark_id_idx ON public.ml_predictions(ark_id);
CREATE INDEX IF NOT EXISTS daily_reports_ark_id_idx ON public.daily_reports(ark_id);
CREATE INDEX IF NOT EXISTS kill_switch_config_ark_id_idx ON public.kill_switch_config(ark_id);
CREATE INDEX IF NOT EXISTS user_trading_symbols_ark_id_idx ON public.user_trading_symbols(ark_id);

-- Update handle_new_user trigger to set ark_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  username_value TEXT;
  first_name_value TEXT;
  last_name_value TEXT;
  full_name_value TEXT;
  ark_id_value TEXT;
BEGIN
  -- Generate ARK ID
  ark_id_value := public.generate_ark_id(NEW.id);
  
  -- Extract user metadata (existing logic)
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
  
  -- Insert profile with ark_id
  INSERT INTO public.profiles (
    user_id,
    ark_id,
    username,
    first_name,
    last_name,
    date_of_birth,
    gender,
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
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$;

-- ==========================================
-- SECURITY: Update RLS Policies
-- ==========================================

-- Drop existing policies and recreate with ark_id

-- PROFILES
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (ark_id = public.get_current_ark_id());

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (ark_id = public.get_current_ark_id());

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (ark_id = public.get_current_ark_id());

-- TRADING SESSIONS
DROP POLICY IF EXISTS "Users can manage their own trading sessions" ON public.trading_sessions;

CREATE POLICY "Users can view their own trading sessions"
ON public.trading_sessions FOR SELECT
USING (ark_id = public.get_current_ark_id());

CREATE POLICY "Users can insert their own trading sessions"
ON public.trading_sessions FOR INSERT
WITH CHECK (ark_id = public.get_current_ark_id());

CREATE POLICY "Users can update their own trading sessions"
ON public.trading_sessions FOR UPDATE
USING (ark_id = public.get_current_ark_id());

CREATE POLICY "Users can delete their own trading sessions"
ON public.trading_sessions FOR DELETE
USING (ark_id = public.get_current_ark_id());

-- POSITIONS
DROP POLICY IF EXISTS "Users can manage their own positions" ON public.positions;

CREATE POLICY "Users can view their own positions"
ON public.positions FOR SELECT
USING (ark_id = public.get_current_ark_id());

CREATE POLICY "Users can insert their own positions"
ON public.positions FOR INSERT
WITH CHECK (ark_id = public.get_current_ark_id());

CREATE POLICY "Users can update their own positions"
ON public.positions FOR UPDATE
USING (ark_id = public.get_current_ark_id());

CREATE POLICY "Users can delete their own positions"
ON public.positions FOR DELETE
USING (ark_id = public.get_current_ark_id());

-- TRADES
DROP POLICY IF EXISTS "Users can manage their own trades" ON public.trades;

CREATE POLICY "Users can view their own trades"
ON public.trades FOR SELECT
USING (ark_id = public.get_current_ark_id());

CREATE POLICY "Users can insert their own trades"
ON public.trades FOR INSERT
WITH CHECK (ark_id = public.get_current_ark_id());

CREATE POLICY "Users can update their own trades"
ON public.trades FOR UPDATE
USING (ark_id = public.get_current_ark_id());

CREATE POLICY "Users can delete their own trades"
ON public.trades FOR DELETE
USING (ark_id = public.get_current_ark_id());

-- RISK METRICS
DROP POLICY IF EXISTS "Users can manage their own risk metrics" ON public.risk_metrics;

CREATE POLICY "Users can view their own risk metrics"
ON public.risk_metrics FOR SELECT
USING (ark_id = public.get_current_ark_id());

CREATE POLICY "Users can insert their own risk metrics"
ON public.risk_metrics FOR INSERT
WITH CHECK (ark_id = public.get_current_ark_id());

CREATE POLICY "Users can update their own risk metrics"
ON public.risk_metrics FOR UPDATE
USING (ark_id = public.get_current_ark_id());

CREATE POLICY "Users can delete their own risk metrics"
ON public.risk_metrics FOR DELETE
USING (ark_id = public.get_current_ark_id());

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can create their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (ark_id = public.get_current_ark_id());

CREATE POLICY "Users can insert their own notifications"
ON public.notifications FOR INSERT
WITH CHECK (ark_id = public.get_current_ark_id());

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (ark_id = public.get_current_ark_id());

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (ark_id = public.get_current_ark_id());

-- ML PREDICTIONS
DROP POLICY IF EXISTS "Users can manage their own ML predictions" ON public.ml_predictions;

CREATE POLICY "Users can view their own ML predictions"
ON public.ml_predictions FOR SELECT
USING (ark_id = public.get_current_ark_id());

CREATE POLICY "Users can insert their own ML predictions"
ON public.ml_predictions FOR INSERT
WITH CHECK (ark_id = public.get_current_ark_id());

CREATE POLICY "Users can update their own ML predictions"
ON public.ml_predictions FOR UPDATE
USING (ark_id = public.get_current_ark_id());

CREATE POLICY "Users can delete their own ML predictions"
ON public.ml_predictions FOR DELETE
USING (ark_id = public.get_current_ark_id());

-- DAILY REPORTS
DROP POLICY IF EXISTS "Users can manage their own daily reports" ON public.daily_reports;

CREATE POLICY "Users can view their own daily reports"
ON public.daily_reports FOR SELECT
USING (ark_id = public.get_current_ark_id());

CREATE POLICY "Users can insert their own daily reports"
ON public.daily_reports FOR INSERT
WITH CHECK (ark_id = public.get_current_ark_id());

CREATE POLICY "Users can update their own daily reports"
ON public.daily_reports FOR UPDATE
USING (ark_id = public.get_current_ark_id());

CREATE POLICY "Users can delete their own daily reports"
ON public.daily_reports FOR DELETE
USING (ark_id = public.get_current_ark_id());

-- KILL SWITCH CONFIG
DROP POLICY IF EXISTS "Users can manage their own kill switch config" ON public.kill_switch_config;

CREATE POLICY "Users can view their own kill switch config"
ON public.kill_switch_config FOR SELECT
USING (ark_id = public.get_current_ark_id());

CREATE POLICY "Users can insert their own kill switch config"
ON public.kill_switch_config FOR INSERT
WITH CHECK (ark_id = public.get_current_ark_id());

CREATE POLICY "Users can update their own kill switch config"
ON public.kill_switch_config FOR UPDATE
USING (ark_id = public.get_current_ark_id());

CREATE POLICY "Users can delete their own kill switch config"
ON public.kill_switch_config FOR DELETE
USING (ark_id = public.get_current_ark_id());

-- USER TRADING SYMBOLS
DROP POLICY IF EXISTS "Users can view their own symbols" ON public.user_trading_symbols;
DROP POLICY IF EXISTS "Users can insert their own symbols" ON public.user_trading_symbols;
DROP POLICY IF EXISTS "Users can update their own symbols" ON public.user_trading_symbols;

CREATE POLICY "Users can view their own symbols"
ON public.user_trading_symbols FOR SELECT
USING (ark_id = public.get_current_ark_id());

CREATE POLICY "Users can insert their own symbols"
ON public.user_trading_symbols FOR INSERT
WITH CHECK (ark_id = public.get_current_ark_id());

CREATE POLICY "Users can update their own symbols"
ON public.user_trading_symbols FOR UPDATE
USING (ark_id = public.get_current_ark_id());

-- ==========================================
-- SECURITY: Restrict System Tables
-- ==========================================

-- ARK DECISION AUDIT - System only
DROP POLICY IF EXISTS "Authenticated users can view ARK decisions" ON public.ark_decision_audit;
DROP POLICY IF EXISTS "System can manage ARK decisions" ON public.ark_decision_audit;

CREATE POLICY "System only can manage ARK decisions"
ON public.ark_decision_audit FOR ALL
USING (false) WITH CHECK (false);

-- ARK MODEL PERFORMANCE - System only
DROP POLICY IF EXISTS "Authenticated users can view ARK performance" ON public.ark_model_performance;
DROP POLICY IF EXISTS "System can manage ARK performance" ON public.ark_model_performance;

CREATE POLICY "System only can manage ARK performance"
ON public.ark_model_performance FOR ALL
USING (false) WITH CHECK (false);

-- ARK SENTIMENT ANALYSIS - System only
DROP POLICY IF EXISTS "Authenticated users can view ARK sentiment" ON public.ark_sentiment_analysis;
DROP POLICY IF EXISTS "System can manage ARK sentiment" ON public.ark_sentiment_analysis;

CREATE POLICY "System only can manage ARK sentiment"
ON public.ark_sentiment_analysis FOR ALL
USING (false) WITH CHECK (false);

-- ARK TRAINING HISTORY - System only
DROP POLICY IF EXISTS "Authenticated users can view ARK training history" ON public.ark_training_history;
DROP POLICY IF EXISTS "System can manage ARK training history" ON public.ark_training_history;

CREATE POLICY "System only can manage ARK training history"
ON public.ark_training_history FOR ALL
USING (false) WITH CHECK (false);

-- MARKET DATA CACHE - System only
DROP POLICY IF EXISTS "Authenticated users can manage market data cache" ON public.market_data_cache;

CREATE POLICY "System only can manage market data cache"
ON public.market_data_cache FOR ALL
USING (false) WITH CHECK (false);

-- STORAGE METADATA - System only
DROP POLICY IF EXISTS "Authenticated users can manage storage metadata" ON public.storage_metadata;

CREATE POLICY "System only can manage storage metadata"
ON public.storage_metadata FOR ALL
USING (false) WITH CHECK (false);

-- SYMBOL STATS - System only
DROP POLICY IF EXISTS "Authenticated users can manage symbol stats" ON public.symbol_stats;

CREATE POLICY "System only can manage symbol stats"
ON public.symbol_stats FOR ALL
USING (false) WITH CHECK (false);

-- RL REWARDS - System only
DROP POLICY IF EXISTS "Authenticated users can manage RL rewards" ON public.rl_rewards;

CREATE POLICY "System only can manage RL rewards"
ON public.rl_rewards FOR ALL
USING (false) WITH CHECK (false);

-- TICKS - System only
DROP POLICY IF EXISTS "Authenticated users can manage tick data" ON public.ticks;

CREATE POLICY "System only can manage tick data"
ON public.ticks FOR ALL
USING (false) WITH CHECK (false);

-- AI ACTIONS - System only
DROP POLICY IF EXISTS "Authenticated users can manage AI actions" ON public.ai_actions;

CREATE POLICY "System only can manage AI actions"
ON public.ai_actions FOR ALL
USING (false) WITH CHECK (false);

-- DATA QUALITY METRICS - System only
DROP POLICY IF EXISTS "Authenticated users can view data quality" ON public.data_quality_metrics;
DROP POLICY IF EXISTS "System can manage data quality" ON public.data_quality_metrics;

CREATE POLICY "System only can manage data quality"
ON public.data_quality_metrics FOR ALL
USING (false) WITH CHECK (false);

-- MODEL SYMBOL PERFORMANCE - System only
DROP POLICY IF EXISTS "Authenticated users can view model performance" ON public.model_symbol_performance;
DROP POLICY IF EXISTS "System can manage model performance" ON public.model_symbol_performance;

CREATE POLICY "System only can manage model performance"
ON public.model_symbol_performance FOR ALL
USING (false) WITH CHECK (false);

-- MODEL WEIGHTS - System only
DROP POLICY IF EXISTS "Authenticated users can view model weights" ON public.model_weights;
DROP POLICY IF EXISTS "System can manage model weights" ON public.model_weights;

CREATE POLICY "System only can manage model weights"
ON public.model_weights FOR ALL
USING (false) WITH CHECK (false);

-- MODEL AB TESTS - System only
DROP POLICY IF EXISTS "Authenticated users can view AB tests" ON public.model_ab_tests;
DROP POLICY IF EXISTS "System can manage AB tests" ON public.model_ab_tests;

CREATE POLICY "System only can manage AB tests"
ON public.model_ab_tests FOR ALL
USING (false) WITH CHECK (false);

-- MODEL PERFORMANCE HISTORY - System only
DROP POLICY IF EXISTS "Authenticated users can view performance history" ON public.model_performance_history;
DROP POLICY IF EXISTS "System can manage performance history" ON public.model_performance_history;

CREATE POLICY "System only can manage performance history"
ON public.model_performance_history FOR ALL
USING (false) WITH CHECK (false);

-- ML MODELS - System only
DROP POLICY IF EXISTS "Only authenticated users can view ML models" ON public.ml_models;
DROP POLICY IF EXISTS "Only system can insert ML models" ON public.ml_models;
DROP POLICY IF EXISTS "Only system can update ML models" ON public.ml_models;
DROP POLICY IF EXISTS "Only system can delete ML models" ON public.ml_models;

CREATE POLICY "System only can manage ML models"
ON public.ml_models FOR ALL
USING (false) WITH CHECK (false);

-- MODELS - System only
DROP POLICY IF EXISTS "Authenticated users can manage models" ON public.models;

CREATE POLICY "System only can manage models"
ON public.models FOR ALL
USING (false) WITH CHECK (false);