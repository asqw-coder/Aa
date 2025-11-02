-- Create comprehensive schema for production trading system

-- Environment variables and configuration
CREATE TABLE public.config_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  is_encrypted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Encrypted secrets storage 
CREATE TABLE public.encrypted_secrets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  secret_name TEXT NOT NULL UNIQUE,
  encrypted_value TEXT NOT NULL,
  encryption_key_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Trading sessions and state
CREATE TABLE public.trading_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  session_end TIMESTAMP WITH TIME ZONE,
  mode TEXT CHECK (mode IN ('demo', 'live')) DEFAULT 'demo',
  initial_balance NUMERIC(15,2),
  final_balance NUMERIC(15,2),
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  max_drawdown NUMERIC(8,4) DEFAULT 0,
  status TEXT CHECK (status IN ('active', 'stopped', 'paused', 'error')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Real-time positions tracking
CREATE TABLE public.positions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.trading_sessions(id),
  deal_id TEXT NOT NULL UNIQUE,
  symbol TEXT NOT NULL,
  direction TEXT CHECK (direction IN ('BUY', 'SELL')) NOT NULL,
  size NUMERIC(10,4) NOT NULL,
  entry_price NUMERIC(15,6) NOT NULL,
  current_price NUMERIC(15,6),
  stop_loss NUMERIC(15,6),
  take_profit NUMERIC(15,6),
  pnl NUMERIC(15,4) DEFAULT 0,
  status TEXT CHECK (status IN ('open', 'closed', 'partial')) DEFAULT 'open',
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  close_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ML model registry and performance tracking
CREATE TABLE public.ml_models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_name TEXT NOT NULL,
  model_type TEXT CHECK (model_type IN ('LSTM', 'Transformer', 'XGBoost', 'RL', 'Wavelet', 'Ensemble')) NOT NULL,
  version TEXT NOT NULL,
  status TEXT CHECK (status IN ('training', 'active', 'inactive', 'retired')) DEFAULT 'training',
  accuracy NUMERIC(5,4),
  precision_score NUMERIC(5,4),
  recall_score NUMERIC(5,4),
  sharpe_ratio NUMERIC(8,4),
  max_drawdown NUMERIC(8,4),
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  profit_factor NUMERIC(8,4),
  drive_path TEXT, -- Encrypted model weights location
  training_start TIMESTAMP WITH TIME ZONE,
  training_end TIMESTAMP WITH TIME ZONE,
  last_prediction TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(model_name, version)
);

-- ML predictions and signals
CREATE TABLE public.ml_predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID REFERENCES public.ml_models(id),
  symbol TEXT NOT NULL,
  direction TEXT CHECK (direction IN ('BUY', 'SELL', 'HOLD')) NOT NULL,
  confidence NUMERIC(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  target_price NUMERIC(15,6),
  stop_loss NUMERIC(15,6),
  take_profit NUMERIC(15,6),
  timeframe TEXT,
  features JSONB, -- Store feature vector
  prediction_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
  executed BOOLEAN DEFAULT FALSE,
  execution_time TIMESTAMP WITH TIME ZONE,
  actual_outcome TEXT, -- For model performance tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Risk metrics and limits tracking
CREATE TABLE public.risk_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.trading_sessions(id),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  account_balance NUMERIC(15,2),
  equity NUMERIC(15,2),
  used_margin NUMERIC(15,2),
  free_margin NUMERIC(15,2),
  margin_level NUMERIC(8,4),
  daily_pnl NUMERIC(15,4),
  current_drawdown NUMERIC(8,4),
  risk_utilization NUMERIC(8,4),
  correlation_risk NUMERIC(8,4),
  open_positions INTEGER,
  daily_trades_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RL reward/punishment system
CREATE TABLE public.rl_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.trading_sessions(id),
  date DATE DEFAULT CURRENT_DATE,
  total_profit NUMERIC(15,4) DEFAULT 0,
  total_loss NUMERIC(15,4) DEFAULT 0,
  net_pnl NUMERIC(15,4) DEFAULT 0,
  daily_profit_cap NUMERIC(15,4),
  daily_loss_limit NUMERIC(15,4),
  win_rate NUMERIC(5,4),
  trade_efficiency NUMERIC(8,4),
  loss_severity NUMERIC(5,4),
  final_reward NUMERIC(10,4),
  reward_components JSONB, -- Store detailed reward calculation
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  max_single_loss NUMERIC(15,4) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Symbol performance and statistics
CREATE TABLE public.symbol_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  total_profit NUMERIC(15,4) DEFAULT 0,
  total_loss NUMERIC(15,4) DEFAULT 0,
  net_pnl NUMERIC(15,4) DEFAULT 0,
  avg_trade_duration INTERVAL,
  max_profit NUMERIC(15,4) DEFAULT 0,
  max_loss NUMERIC(15,4) DEFAULT 0,
  volatility NUMERIC(8,6),
  correlation_matrix JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(symbol, date)
);

-- System logs and events
CREATE TABLE public.system_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT CHECK (level IN ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL')) NOT NULL,
  module TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  session_id UUID REFERENCES public.trading_sessions(id),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Daily reports
CREATE TABLE public.daily_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE DEFAULT CURRENT_DATE UNIQUE,
  session_id UUID REFERENCES public.trading_sessions(id),
  total_daily_profit NUMERIC(15,4) DEFAULT 0,
  total_daily_loss NUMERIC(15,4) DEFAULT 0,
  current_balance NUMERIC(15,2),
  profit_per_symbol JSONB,
  loss_per_symbol JSONB,
  top_profit_symbols JSONB,
  top_loss_symbols JSONB,
  today_vs_yesterday JSONB,
  total_trades INTEGER DEFAULT 0,
  win_rate NUMERIC(5,4),
  max_drawdown NUMERIC(8,4),
  sharpe_ratio NUMERIC(8,4),
  report_generated BOOLEAN DEFAULT FALSE,
  report_sent BOOLEAN DEFAULT FALSE,
  drive_path TEXT, -- Path to detailed PDF report
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Market data cache (3 days only as specified)
CREATE TABLE public.market_data_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  bid NUMERIC(15,6) NOT NULL,
  ask NUMERIC(15,6) NOT NULL,
  volume NUMERIC(15,2),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  INDEX(symbol, timestamp DESC)
);

-- Capital.com API usage tracking
CREATE TABLE public.api_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  response_time_ms INTEGER,
  status_code INTEGER,
  requests_per_second NUMERIC(6,2),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on sensitive tables
ALTER TABLE public.encrypted_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rl_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated access (no user authentication in this case, so allow all)
CREATE POLICY "Allow all operations" ON public.encrypted_secrets FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.trading_sessions FOR ALL USING (true);  
CREATE POLICY "Allow all operations" ON public.positions FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.ml_models FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.ml_predictions FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.risk_metrics FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.rl_rewards FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.system_logs FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.daily_reports FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX idx_positions_symbol ON public.positions(symbol);
CREATE INDEX idx_positions_session ON public.positions(session_id);
CREATE INDEX idx_positions_status ON public.positions(status);
CREATE INDEX idx_ml_predictions_symbol ON public.ml_predictions(symbol);
CREATE INDEX idx_ml_predictions_time ON public.ml_predictions(prediction_time DESC);
CREATE INDEX idx_risk_metrics_session ON public.risk_metrics(session_id);
CREATE INDEX idx_risk_metrics_time ON public.risk_metrics(timestamp DESC);
CREATE INDEX idx_system_logs_level ON public.system_logs(level);
CREATE INDEX idx_system_logs_time ON public.system_logs(timestamp DESC);
CREATE INDEX idx_market_data_symbol_time ON public.market_data_cache(symbol, timestamp DESC);

-- Auto-cleanup old market data (keep only 3 days)
CREATE OR REPLACE FUNCTION cleanup_old_market_data()
RETURNS void AS $$
BEGIN
  DELETE FROM public.market_data_cache 
  WHERE created_at < (CURRENT_TIMESTAMP - INTERVAL '3 days');
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_positions_updated_at 
  BEFORE UPDATE ON public.positions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_config_updated_at 
  BEFORE UPDATE ON public.config_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_models_updated_at 
  BEFORE UPDATE ON public.ml_models 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_symbol_stats_updated_at 
  BEFORE UPDATE ON public.symbol_stats 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default configuration
INSERT INTO public.config_settings (key, value, description, category) VALUES
  ('CAPITAL_API_KEY', '', 'Capital.com API key', 'broker'),
  ('CAPITAL_BASE_URL', 'https://api-capital.backend-capital.com', 'Capital.com REST API base URL', 'broker'),
  ('CAPITAL_WS_URL', 'wss://streaming-capital.backend-capital.com/prices', 'Capital.com WebSocket URL', 'broker'),
  ('ACCOUNT_MODE', 'demo', 'Trading account mode (demo/live)', 'broker'),
  ('SYMBOL_LIST', 'EURUSD,USDNGN,GBPUSD,USDJPY,EURNGN,XAUUSD,XAGUSD,USOIL,UKOIL,BLCO,XPTUSD,NVDA,AAPL,TSLA,MSFT,GOOGL,AMZN', 'Default trading symbols', 'trading'),
  ('DAILY_LOSS_LIMIT', '0.05', 'Daily loss limit as percentage of balance', 'risk'),
  ('MAX_DRAWDOWN_PCT', '0.14', 'Maximum drawdown percentage', 'risk'),
  ('RISK_PER_TRADE_PCT', '0.07', 'Risk per trade percentage', 'risk'),
  ('DAILY_PROFIT_CAP_MODE', '40% of current balance + previous day profit', 'Daily profit cap calculation method', 'risk'),
  ('MAX_POSITIONS', '10', 'Maximum number of open positions', 'risk'),
  ('MAX_TRADES_PER_SYMBOL_HOUR', '5', 'Maximum trades per symbol per hour', 'risk'),
  ('ML_UPDATE_INTERVAL', '86400', 'ML model update interval in seconds (daily)', 'ml'),
  ('GMAIL_SMTP_HOST', 'smtp.gmail.com', 'Gmail SMTP host', 'email'),
  ('GMAIL_SMTP_PORT', '587', 'Gmail SMTP port', 'email'),
  ('DRIVE_FOLDER_ID', '', 'Google Drive folder ID for storage', 'storage');