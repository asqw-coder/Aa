-- Schedule new cron jobs for Priority 3 features

-- Performance monitoring (every 2 hours)
SELECT cron.schedule(
  'performance-degradation-check',
  '0 */2 * * *',
  $$
  SELECT net.http_post(
    url:='https://bggaeemkonwbdqgrklzn.supabase.co/functions/v1/performance-monitor',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnZ2FlZW1rb253YmRxZ3JrbHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MTAzNDAsImV4cCI6MjA2OTQ4NjM0MH0.luEEVXZ8SOc2GPM0klkH7a8X-Zp-m_KCq5Pu74nNXpc"}'::jsonb
  ) as request_id;
  $$
);

-- A/B testing evaluation (every 6 hours)
SELECT cron.schedule(
  'ab-testing-evaluation',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url:='https://bggaeemkonwbdqgrklzn.supabase.co/functions/v1/ab-testing-manager',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnZ2FlZW1rb253YmRxZ3JrbHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MTAzNDAsImV4cCI6MjA2OTQ4NjM0MH0.luEEVXZ8SOc2GPM0klkH7a8X-Zp-m_KCq5Pu74nNXpc"}'::jsonb,
    body:='{"action": "evaluate_tests"}'::jsonb
  ) as request_id;
  $$
);