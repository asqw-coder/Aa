-- Fix RLS for trading_sessions so authenticated users can create and manage their own sessions
-- Safe defaults: enable RLS and add scoped policies

-- Enable Row Level Security (if not already enabled)
ALTER TABLE public.trading_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own trading sessions" ON public.trading_sessions;
DROP POLICY IF EXISTS "Users can create their own trading sessions" ON public.trading_sessions;
DROP POLICY IF EXISTS "Users can update their own trading sessions" ON public.trading_sessions;

-- Policy: Users can view their own trading sessions
CREATE POLICY "Users can view their own trading sessions"
ON public.trading_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can create their own trading sessions
CREATE POLICY "Users can create their own trading sessions"
ON public.trading_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own trading sessions
CREATE POLICY "Users can update their own trading sessions"
ON public.trading_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);