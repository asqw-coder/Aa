-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Add unique constraint to prevent duplicate market data
CREATE UNIQUE INDEX IF NOT EXISTS idx_market_data_cache_unique 
ON market_data_cache(symbol, timestamp);

-- Add unique constraint for model weights (one version per model/symbol combination)
CREATE UNIQUE INDEX IF NOT EXISTS idx_model_weights_unique 
ON model_weights(model_type, symbol, version);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_market_data_symbol_time 
ON market_data_cache(symbol, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_positions_user_status 
ON positions(user_id, status) 
WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_model_weights_lookup 
ON model_weights(model_type, symbol, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ml_predictions_user_time
ON ml_predictions(user_id, prediction_time DESC);

CREATE INDEX IF NOT EXISTS idx_ark_decision_audit_time
ON ark_decision_audit(timestamp DESC);