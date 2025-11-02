-- Fix critical security vulnerability: Trading data publicly accessible
-- This migration restricts access to trading data to authenticated users only

-- Update RLS policies for daily_reports table
DROP POLICY IF EXISTS "Allow all operations" ON public.daily_reports;
CREATE POLICY "Authenticated users can manage their own reports" 
ON public.daily_reports 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Update RLS policies for ml_models table  
DROP POLICY IF EXISTS "Allow all operations" ON public.ml_models;
CREATE POLICY "Authenticated users can manage ML models" 
ON public.ml_models 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Update RLS policies for ml_predictions table
DROP POLICY IF EXISTS "Allow all operations" ON public.ml_predictions;
CREATE POLICY "Authenticated users can manage predictions" 
ON public.ml_predictions 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Update RLS policies for trades table
DROP POLICY IF EXISTS "Allow all operations" ON public.trades;
CREATE POLICY "Authenticated users can manage trades" 
ON public.trades 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Update RLS policies for positions table
DROP POLICY IF EXISTS "Allow all operations" ON public.positions;
CREATE POLICY "Authenticated users can manage positions" 
ON public.positions 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Update RLS policies for trading_sessions table
DROP POLICY IF EXISTS "Allow all operations" ON public.trading_sessions;
CREATE POLICY "Authenticated users can manage sessions" 
ON public.trading_sessions 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Update RLS policies for rl_rewards table
DROP POLICY IF EXISTS "Allow all operations" ON public.rl_rewards;
CREATE POLICY "Authenticated users can manage RL rewards" 
ON public.rl_rewards 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Update RLS policies for risk_metrics table
DROP POLICY IF EXISTS "Allow all operations" ON public.risk_metrics;
CREATE POLICY "Authenticated users can manage risk metrics" 
ON public.risk_metrics 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Update RLS policies for symbol_stats table
DROP POLICY IF EXISTS "Allow all operations" ON public.symbol_stats;
CREATE POLICY "Authenticated users can manage symbol stats" 
ON public.symbol_stats 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Keep non-sensitive tables with existing access patterns
-- api_usage, market_data_cache, ticks, system_logs, config_settings remain unchanged
-- as they don't contain sensitive trading performance data