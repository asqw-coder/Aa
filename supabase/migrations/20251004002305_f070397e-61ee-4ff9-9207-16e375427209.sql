-- Schedule cron jobs for automated maintenance and processing

-- Schedule market data cleanup (runs every 6 hours)
SELECT cron.schedule(
  'cleanup-old-market-data',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url:='https://bggaeemkonwbdqgrklzn.supabase.co/functions/v1/market-data-cleanup',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnZ2FlZW1rb253YmRxZ3JrbHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MTAzNDAsImV4cCI6MjA2OTQ4NjM0MH0.luEEVXZ8SOc2GPM0klkH7a8X-Zp-m_KCq5Pu74nNXpc"}'::jsonb
  ) as request_id;
  $$
);

-- Schedule correlation calculation (runs every hour)
SELECT cron.schedule(
  'calculate-correlations',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url:='https://bggaeemkonwbdqgrklzn.supabase.co/functions/v1/correlation-calculator',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnZ2FlZW1rb253YmRxZ3JrbHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MTAzNDAsImV4cCI6MjA2OTQ4NjM0MH0.luEEVXZ8SOc2GPM0klkH7a8X-Zp-m_KCq5Pu74nNXpc"}'::jsonb
  ) as request_id;
  $$
);

-- Schedule ARK feedback loop (runs every 30 minutes)
SELECT cron.schedule(
  'ark-feedback-loop',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url:='https://bggaeemkonwbdqgrklzn.supabase.co/functions/v1/ark-feedback-loop',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnZ2FlZW1rb253YmRxZ3JrbHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MTAzNDAsImV4cCI6MjA2OTQ4NjM0MH0.luEEVXZ8SOc2GPM0klkH7a8X-Zp-m_KCq5Pu74nNXpc"}'::jsonb
  ) as request_id;
  $$
);