-- Phase 4: Kill Switch Configuration Table
CREATE TABLE IF NOT EXISTS public.kill_switch_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
  condition_type TEXT NOT NULL,
  threshold NUMERIC NOT NULL,
  action TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.kill_switch_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own kill switch config"
ON public.kill_switch_config
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Phase 7: Model Symbol Performance Table for Kelly Criterion
CREATE TABLE IF NOT EXISTS public.model_symbol_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES public.ml_models(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  win_rate NUMERIC NOT NULL DEFAULT 0.5,
  avg_win NUMERIC NOT NULL DEFAULT 0,
  avg_loss NUMERIC NOT NULL DEFAULT 0,
  total_trades INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(model_id, symbol)
);

ALTER TABLE public.model_symbol_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view model performance"
ON public.model_symbol_performance
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can manage model performance"
ON public.model_symbol_performance
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Phase 8: Model Weights Table
CREATE TABLE IF NOT EXISTS public.model_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES public.ml_models(id) ON DELETE CASCADE,
  model_type TEXT NOT NULL,
  symbol TEXT NOT NULL,
  weights_data JSONB NOT NULL,
  architecture JSONB,
  version INTEGER NOT NULL DEFAULT 1,
  training_accuracy NUMERIC,
  validation_accuracy NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(model_id, symbol, version)
);

ALTER TABLE public.model_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view model weights"
ON public.model_weights
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can manage model weights"
ON public.model_weights
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Insert default kill switch configurations
INSERT INTO public.kill_switch_config (user_id, level, condition_type, threshold, action, enabled)
SELECT 
  auth.uid(),
  1,
  'drawdown',
  0.08,
  'reduce_position_size',
  true
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.kill_switch_config (user_id, level, condition_type, threshold, action, enabled)
SELECT 
  auth.uid(),
  2,
  'drawdown',
  0.12,
  'halt_new_trades',
  true
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.kill_switch_config (user_id, level, condition_type, threshold, action, enabled)
SELECT 
  auth.uid(),
  3,
  'drawdown',
  0.14,
  'close_all_positions',
  true
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_kill_switch_user ON public.kill_switch_config(user_id);
CREATE INDEX IF NOT EXISTS idx_model_symbol_perf ON public.model_symbol_performance(model_id, symbol);
CREATE INDEX IF NOT EXISTS idx_model_weights_lookup ON public.model_weights(model_id, symbol, version DESC);