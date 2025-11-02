-- Add A/B testing infrastructure
CREATE TABLE IF NOT EXISTS public.model_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name TEXT NOT NULL,
  model_a_id UUID REFERENCES public.ml_models(id),
  model_b_id UUID REFERENCES public.ml_models(id),
  symbol TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  split_ratio NUMERIC DEFAULT 0.5, -- 0.5 = 50/50 split
  model_a_trades INTEGER DEFAULT 0,
  model_b_trades INTEGER DEFAULT 0,
  model_a_win_rate NUMERIC DEFAULT 0,
  model_b_win_rate NUMERIC DEFAULT 0,
  model_a_pnl NUMERIC DEFAULT 0,
  model_b_pnl NUMERIC DEFAULT 0,
  winner TEXT, -- 'model_a', 'model_b', or NULL
  confidence_level NUMERIC, -- statistical significance
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add performance degradation tracking
CREATE TABLE IF NOT EXISTS public.model_performance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES public.ml_models(id),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  accuracy NUMERIC,
  win_rate NUMERIC,
  sharpe_ratio NUMERIC,
  max_drawdown NUMERIC,
  total_trades INTEGER,
  degradation_score NUMERIC, -- 0-1, higher = worse degradation
  alert_triggered BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add data quality metrics
CREATE TABLE IF NOT EXISTS public.data_quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  source TEXT NOT NULL, -- 'market_data', 'ml_prediction', etc.
  total_records INTEGER DEFAULT 0,
  valid_records INTEGER DEFAULT 0,
  invalid_records INTEGER DEFAULT 0,
  duplicate_records INTEGER DEFAULT 0,
  missing_fields INTEGER DEFAULT 0,
  outliers_detected INTEGER DEFAULT 0,
  quality_score NUMERIC, -- 0-1, higher = better
  issues JSONB, -- detailed issues
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_model_ab_tests_active ON public.model_ab_tests(symbol, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_model_performance_history ON public.model_performance_history(model_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_data_quality_metrics ON public.data_quality_metrics(source, timestamp DESC);

-- Enable RLS
ALTER TABLE public.model_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_performance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_quality_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view AB tests" ON public.model_ab_tests FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "System can manage AB tests" ON public.model_ab_tests FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view performance history" ON public.model_performance_history FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "System can manage performance history" ON public.model_performance_history FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view data quality" ON public.data_quality_metrics FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "System can manage data quality" ON public.data_quality_metrics FOR ALL USING (true) WITH CHECK (true);