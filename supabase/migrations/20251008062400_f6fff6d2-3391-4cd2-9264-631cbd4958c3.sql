-- Update RLS policies to use both user_id and ark_id for enhanced security
-- This prevents any potential unauthorized access by requiring both identifiers to match

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (user_id = auth.uid() AND ark_id = get_current_ark_id());

-- ============================================================================
-- DAILY REPORTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own daily reports" ON public.daily_reports;
DROP POLICY IF EXISTS "Users can insert their own daily reports" ON public.daily_reports;
DROP POLICY IF EXISTS "Users can update their own daily reports" ON public.daily_reports;
DROP POLICY IF EXISTS "Users can delete their own daily reports" ON public.daily_reports;

CREATE POLICY "Users can view their own daily reports"
ON public.daily_reports
FOR SELECT
USING (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can insert their own daily reports"
ON public.daily_reports
FOR INSERT
WITH CHECK (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can update their own daily reports"
ON public.daily_reports
FOR UPDATE
USING (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can delete their own daily reports"
ON public.daily_reports
FOR DELETE
USING (user_id = auth.uid() AND ark_id = get_current_ark_id());

-- ============================================================================
-- KILL SWITCH CONFIG TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own kill switch config" ON public.kill_switch_config;
DROP POLICY IF EXISTS "Users can insert their own kill switch config" ON public.kill_switch_config;
DROP POLICY IF EXISTS "Users can update their own kill switch config" ON public.kill_switch_config;
DROP POLICY IF EXISTS "Users can delete their own kill switch config" ON public.kill_switch_config;

CREATE POLICY "Users can view their own kill switch config"
ON public.kill_switch_config
FOR SELECT
USING (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can insert their own kill switch config"
ON public.kill_switch_config
FOR INSERT
WITH CHECK (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can update their own kill switch config"
ON public.kill_switch_config
FOR UPDATE
USING (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can delete their own kill switch config"
ON public.kill_switch_config
FOR DELETE
USING (user_id = auth.uid() AND ark_id = get_current_ark_id());

-- ============================================================================
-- ML PREDICTIONS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own ML predictions" ON public.ml_predictions;
DROP POLICY IF EXISTS "Users can insert their own ML predictions" ON public.ml_predictions;
DROP POLICY IF EXISTS "Users can update their own ML predictions" ON public.ml_predictions;
DROP POLICY IF EXISTS "Users can delete their own ML predictions" ON public.ml_predictions;

CREATE POLICY "Users can view their own ML predictions"
ON public.ml_predictions
FOR SELECT
USING (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can insert their own ML predictions"
ON public.ml_predictions
FOR INSERT
WITH CHECK (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can update their own ML predictions"
ON public.ml_predictions
FOR UPDATE
USING (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can delete their own ML predictions"
ON public.ml_predictions
FOR DELETE
USING (user_id = auth.uid() AND ark_id = get_current_ark_id());

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can insert their own notifications"
ON public.notifications
FOR INSERT
WITH CHECK (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (user_id = auth.uid() AND ark_id = get_current_ark_id());

-- ============================================================================
-- POSITIONS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own positions" ON public.positions;
DROP POLICY IF EXISTS "Users can insert their own positions" ON public.positions;
DROP POLICY IF EXISTS "Users can update their own positions" ON public.positions;
DROP POLICY IF EXISTS "Users can delete their own positions" ON public.positions;

CREATE POLICY "Users can view their own positions"
ON public.positions
FOR SELECT
USING (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can insert their own positions"
ON public.positions
FOR INSERT
WITH CHECK (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can update their own positions"
ON public.positions
FOR UPDATE
USING (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can delete their own positions"
ON public.positions
FOR DELETE
USING (user_id = auth.uid() AND ark_id = get_current_ark_id());

-- ============================================================================
-- RISK METRICS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own risk metrics" ON public.risk_metrics;
DROP POLICY IF EXISTS "Users can insert their own risk metrics" ON public.risk_metrics;
DROP POLICY IF EXISTS "Users can update their own risk metrics" ON public.risk_metrics;
DROP POLICY IF EXISTS "Users can delete their own risk metrics" ON public.risk_metrics;

CREATE POLICY "Users can view their own risk metrics"
ON public.risk_metrics
FOR SELECT
USING (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can insert their own risk metrics"
ON public.risk_metrics
FOR INSERT
WITH CHECK (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can update their own risk metrics"
ON public.risk_metrics
FOR UPDATE
USING (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can delete their own risk metrics"
ON public.risk_metrics
FOR DELETE
USING (user_id = auth.uid() AND ark_id = get_current_ark_id());

-- ============================================================================
-- TRADES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can insert their own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can update their own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can delete their own trades" ON public.trades;

CREATE POLICY "Users can view their own trades"
ON public.trades
FOR SELECT
USING (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can insert their own trades"
ON public.trades
FOR INSERT
WITH CHECK (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can update their own trades"
ON public.trades
FOR UPDATE
USING (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can delete their own trades"
ON public.trades
FOR DELETE
USING (user_id = auth.uid() AND ark_id = get_current_ark_id());

-- ============================================================================
-- TRADING SESSIONS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own trading sessions" ON public.trading_sessions;
DROP POLICY IF EXISTS "Users can insert their own trading sessions" ON public.trading_sessions;
DROP POLICY IF EXISTS "Users can update their own trading sessions" ON public.trading_sessions;
DROP POLICY IF EXISTS "Users can delete their own trading sessions" ON public.trading_sessions;

CREATE POLICY "Users can view their own trading sessions"
ON public.trading_sessions
FOR SELECT
USING (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can insert their own trading sessions"
ON public.trading_sessions
FOR INSERT
WITH CHECK (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can update their own trading sessions"
ON public.trading_sessions
FOR UPDATE
USING (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can delete their own trading sessions"
ON public.trading_sessions
FOR DELETE
USING (user_id = auth.uid() AND ark_id = get_current_ark_id());

-- ============================================================================
-- USER TRADING SYMBOLS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own symbols" ON public.user_trading_symbols;
DROP POLICY IF EXISTS "Users can insert their own symbols" ON public.user_trading_symbols;
DROP POLICY IF EXISTS "Users can update their own symbols" ON public.user_trading_symbols;

CREATE POLICY "Users can view their own symbols"
ON public.user_trading_symbols
FOR SELECT
USING (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can insert their own symbols"
ON public.user_trading_symbols
FOR INSERT
WITH CHECK (user_id = auth.uid() AND ark_id = get_current_ark_id());

CREATE POLICY "Users can update their own symbols"
ON public.user_trading_symbols
FOR UPDATE
USING (user_id = auth.uid() AND ark_id = get_current_ark_id());