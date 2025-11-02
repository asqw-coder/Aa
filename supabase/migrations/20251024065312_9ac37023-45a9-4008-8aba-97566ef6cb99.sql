-- Add new columns to device_metadata table for comprehensive device data collection
ALTER TABLE device_metadata
  ADD COLUMN IF NOT EXISTS color_depth INTEGER,
  ADD COLUMN IF NOT EXISTS pixel_ratio NUMERIC,
  ADD COLUMN IF NOT EXISTS device_memory NUMERIC,
  ADD COLUMN IF NOT EXISTS hardware_concurrency INTEGER,
  ADD COLUMN IF NOT EXISTS connection_type TEXT,
  ADD COLUMN IF NOT EXISTS connection_downlink NUMERIC,
  ADD COLUMN IF NOT EXISTS online BOOLEAN,
  ADD COLUMN IF NOT EXISTS cookies_enabled BOOLEAN,
  ADD COLUMN IF NOT EXISTS do_not_track TEXT,
  ADD COLUMN IF NOT EXISTS touch_support BOOLEAN,
  ADD COLUMN IF NOT EXISTS max_touch_points INTEGER,
  ADD COLUMN IF NOT EXISTS vendor TEXT,
  ADD COLUMN IF NOT EXISTS languages TEXT[],
  ADD COLUMN IF NOT EXISTS screen_orientation TEXT,
  ADD COLUMN IF NOT EXISTS available_screen_width INTEGER,
  ADD COLUMN IF NOT EXISTS available_screen_height INTEGER;