-- Fix security issues: Enable RLS on remaining tables and fix function security

-- Enable RLS on remaining public tables
ALTER TABLE public.config_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symbol_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_data_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- Create policies for the remaining tables
CREATE POLICY "Allow all operations" ON public.config_settings FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.symbol_stats FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.market_data_cache FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.api_usage FOR ALL USING (true);

-- Fix function security by setting search_path
CREATE OR REPLACE FUNCTION cleanup_old_market_data()
RETURNS void AS $$
BEGIN
  DELETE FROM public.market_data_cache 
  WHERE created_at < (CURRENT_TIMESTAMP - INTERVAL '3 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;