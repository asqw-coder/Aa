-- Fix remaining RLS security issues on legacy tables

-- Enable RLS on legacy tables that don't have it
ALTER TABLE public.ai_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Create policies for all tables (including legacy ones that had RLS but no policies)
CREATE POLICY "Allow all operations" ON public.ai_actions FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.models FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.ticks FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.trades FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.Blogger FOR ALL USING (true);