-- Add model versioning system and auto-retrain scheduler

-- Add version tracking to model_weights
ALTER TABLE model_weights
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS performance_score NUMERIC,
ADD COLUMN IF NOT EXISTS deployment_date TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create index for active model lookups
CREATE INDEX IF NOT EXISTS idx_model_weights_active
ON model_weights(model_type, symbol, is_active)
WHERE is_active = true;

-- Add retraining metadata to ml_models
ALTER TABLE ml_models
ADD COLUMN IF NOT EXISTS last_retrain_trigger TEXT,
ADD COLUMN IF NOT EXISTS retrain_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS performance_degradation NUMERIC DEFAULT 0;

-- Schedule automatic model retraining (runs daily at 2 AM)
SELECT cron.schedule(
  'auto-retrain-models',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url:='https://bggaeemkonwbdqgrklzn.supabase.co/functions/v1/auto-retrain-models',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnZ2FlZW1rb253YmRxZ3JrbHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MTAzNDAsImV4cCI6MjA2OTQ4NjM0MH0.luEEVXZ8SOc2GPM0klkH7a8X-Zp-m_KCq5Pu74nNXpc"}'::jsonb
  ) as request_id;
  $$
);

-- Create function to activate model version
CREATE OR REPLACE FUNCTION activate_model_version(
  p_model_type TEXT,
  p_symbol TEXT,
  p_version INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deactivate all versions for this model/symbol
  UPDATE model_weights
  SET is_active = false
  WHERE model_type = p_model_type 
  AND symbol = p_symbol;
  
  -- Activate the specified version
  UPDATE model_weights
  SET is_active = true,
      deployment_date = now()
  WHERE model_type = p_model_type 
  AND symbol = p_symbol 
  AND version = p_version;
  
  RETURN FOUND;
END;
$$;

-- Create function to get active model version
CREATE OR REPLACE FUNCTION get_active_model_version(
  p_model_type TEXT,
  p_symbol TEXT
)
RETURNS TABLE(
  id UUID,
  version INTEGER,
  weights_data JSONB,
  architecture JSONB,
  training_accuracy NUMERIC,
  validation_accuracy NUMERIC,
  performance_score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mw.id,
    mw.version,
    mw.weights_data,
    mw.architecture,
    mw.training_accuracy,
    mw.validation_accuracy,
    mw.performance_score,
    mw.created_at
  FROM model_weights mw
  WHERE mw.model_type = p_model_type
  AND mw.symbol = p_symbol
  AND mw.is_active = true
  LIMIT 1;
END;
$$;