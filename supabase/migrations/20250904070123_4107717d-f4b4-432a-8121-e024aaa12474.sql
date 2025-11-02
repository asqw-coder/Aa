-- Enable real-time for key tables
ALTER TABLE public.positions REPLICA IDENTITY FULL;
ALTER TABLE public.trading_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.ml_predictions REPLICA IDENTITY FULL;
ALTER TABLE public.risk_metrics REPLICA IDENTITY FULL;
ALTER TABLE public.daily_reports REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER publication supabase_realtime ADD TABLE public.positions;
ALTER publication supabase_realtime ADD TABLE public.trading_sessions;
ALTER publication supabase_realtime ADD TABLE public.ml_predictions;
ALTER publication supabase_realtime ADD TABLE public.risk_metrics;
ALTER publication supabase_realtime ADD TABLE public.daily_reports;