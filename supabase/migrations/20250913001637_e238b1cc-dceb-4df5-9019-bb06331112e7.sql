-- Phase 1: Secure remaining critical data tables
-- This migration completes the security hardening by protecting configuration, system, and market data

-- Secure config_settings table - contains sensitive trading configuration
DROP POLICY IF EXISTS "Allow all operations" ON public.config_settings;
CREATE POLICY "Authenticated users can manage config settings" 
ON public.config_settings 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Secure system_logs table - contains sensitive system operations
DROP POLICY IF EXISTS "Allow all operations" ON public.system_logs;
CREATE POLICY "Authenticated users can manage system logs" 
ON public.system_logs 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Secure api_usage table - contains API usage patterns
DROP POLICY IF EXISTS "Allow all operations" ON public.api_usage;
CREATE POLICY "Authenticated users can manage API usage data" 
ON public.api_usage 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Secure ai_actions table - contains AI decision data
DROP POLICY IF EXISTS "Allow all operations" ON public.ai_actions;
CREATE POLICY "Authenticated users can manage AI actions" 
ON public.ai_actions 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Secure ticks table - contains market tick data
DROP POLICY IF EXISTS "Allow all operations" ON public.ticks;
CREATE POLICY "Authenticated users can manage tick data" 
ON public.ticks 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Secure market_data_cache table - contains cached market data
DROP POLICY IF EXISTS "Allow all operations" ON public.market_data_cache;
CREATE POLICY "Authenticated users can manage market data cache" 
ON public.market_data_cache 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Secure encrypted_secrets table - already secured but ensuring consistency
DROP POLICY IF EXISTS "Allow all operations" ON public.encrypted_secrets;
CREATE POLICY "Authenticated users can manage encrypted secrets" 
ON public.encrypted_secrets 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Clean up and secure Blogger table - appears to be test data
DROP POLICY IF EXISTS "Allow all operations" ON public.Blogger;
CREATE POLICY "Authenticated users can manage blogger data" 
ON public.Blogger 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Secure models table - contains ML model metadata
DROP POLICY IF EXISTS "Allow all operations" ON public.models;
CREATE POLICY "Authenticated users can manage models" 
ON public.models 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);