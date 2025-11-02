-- Enhanced schema for ARK AI system

-- Create ARK model training history table
CREATE TABLE IF NOT EXISTS public.ark_training_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES public.ml_models(id) ON DELETE CASCADE,
  training_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  training_end TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'training',
  hyperparameters JSONB,
  training_metrics JSONB,
  validation_metrics JSONB,
  loss_history JSONB,
  accuracy_history JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ARK sentiment analysis table
CREATE TABLE IF NOT EXISTS public.ark_sentiment_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  price_action_sentiment NUMERIC,
  volume_sentiment NUMERIC,
  volatility_sentiment NUMERIC,
  correlation_sentiment NUMERIC,
  overall_sentiment NUMERIC NOT NULL,
  fear_greed_index NUMERIC,
  market_strength NUMERIC,
  confidence_score NUMERIC,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ARK model performance tracking table
CREATE TABLE IF NOT EXISTS public.ark_model_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES public.ml_models(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  accuracy NUMERIC,
  precision_score NUMERIC,
  recall_score NUMERIC,
  f1_score NUMERIC,
  sharpe_ratio NUMERIC,
  max_drawdown NUMERIC,
  profit_factor NUMERIC,
  win_rate NUMERIC,
  total_trades INTEGER,
  winning_trades INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ARK decision audit trail table
CREATE TABLE IF NOT EXISTS public.ark_decision_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  symbol TEXT NOT NULL,
  decision_type TEXT NOT NULL,
  model_predictions JSONB NOT NULL,
  ensemble_weights JSONB,
  final_prediction JSONB NOT NULL,
  sentiment_analysis JSONB,
  risk_assessment JSONB,
  confidence_score NUMERIC,
  executed BOOLEAN DEFAULT FALSE,
  outcome JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ark_training_history_model_id ON public.ark_training_history(model_id);
CREATE INDEX IF NOT EXISTS idx_ark_training_history_status ON public.ark_training_history(status);
CREATE INDEX IF NOT EXISTS idx_ark_sentiment_symbol_timestamp ON public.ark_sentiment_analysis(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ark_model_performance_model_id ON public.ark_model_performance(model_id);
CREATE INDEX IF NOT EXISTS idx_ark_decision_audit_symbol_timestamp ON public.ark_decision_audit(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ark_decision_audit_executed ON public.ark_decision_audit(executed);

-- Enable RLS
ALTER TABLE public.ark_training_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ark_sentiment_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ark_model_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ark_decision_audit ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Authenticated users can view ARK training history"
ON public.ark_training_history FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view ARK sentiment"
ON public.ark_sentiment_analysis FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view ARK performance"
ON public.ark_model_performance FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view ARK decisions"
ON public.ark_decision_audit FOR SELECT
TO authenticated
USING (true);

-- System can insert/update ARK data
CREATE POLICY "System can manage ARK training history"
ON public.ark_training_history FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "System can manage ARK sentiment"
ON public.ark_sentiment_analysis FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "System can manage ARK performance"
ON public.ark_model_performance FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "System can manage ARK decisions"
ON public.ark_decision_audit FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);