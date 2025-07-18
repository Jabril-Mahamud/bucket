-- Migration: Fix usage function and add better defaults
-- File: supabase/migrations/20250718_fix_usage_function.sql

-- Drop the existing function first
DROP FUNCTION IF EXISTS get_user_usage_with_limits(uuid);

-- Recreate with better error handling and defaults
CREATE OR REPLACE FUNCTION get_user_usage_with_limits(target_user_id uuid)
RETURNS TABLE (
  current_uploads integer,
  current_tts_characters integer,
  current_storage_gb numeric,
  limit_uploads integer,
  limit_tts_characters integer,
  limit_storage_gb integer,
  plan_name text,
  subscription_status text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month text := to_char(now(), 'YYYY-MM');
  user_plan text;
  user_status text;
BEGIN
  -- Get user's subscription info (default to free if no subscription)
  SELECT 
    COALESCE(s.plan_name, 'free'), 
    COALESCE(s.status, 'active') 
  INTO user_plan, user_status
  FROM subscriptions s 
  WHERE s.user_id = target_user_id
  LIMIT 1;
  
  -- If no subscription found, use free plan
  IF user_plan IS NULL THEN
    user_plan := 'free';
    user_status := 'active';
  END IF;
  
  -- Return usage data with plan limits
  RETURN QUERY
  SELECT 
    COALESCE(u.uploads_count, 0)::integer as current_uploads,
    COALESCE(u.tts_characters_used, 0)::integer as current_tts_characters,
    ROUND(COALESCE(u.storage_bytes_used::numeric / 1073741824, 0), 2) as current_storage_gb,
    COALESCE(l.monthly_uploads, 5)::integer as limit_uploads,
    COALESCE(l.monthly_tts_characters, 25000)::integer as limit_tts_characters,
    COALESCE(l.storage_gb, 1)::integer as limit_storage_gb,
    user_plan::text,
    user_status::text
  FROM (SELECT user_plan as plan) p
  LEFT JOIN plan_limits l ON l.plan_name = p.plan
  LEFT JOIN monthly_usage u ON u.user_id = target_user_id AND u.month_year = current_month
  LIMIT 1;
  
  -- If no rows returned (shouldn't happen), return defaults
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      0::integer,
      0::integer,
      0::numeric,
      5::integer,
      25000::integer,
      1::integer,
      'free'::text,
      'active'::text;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_usage_with_limits(uuid) TO authenticated;

-- Ensure the monthly_usage table can be read by the function
GRANT SELECT ON monthly_usage TO authenticated;
GRANT SELECT ON plan_limits TO authenticated;
GRANT SELECT ON subscriptions TO authenticated;

-- Create a simpler fallback function for checking if user exists
CREATE OR REPLACE FUNCTION check_user_exists(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION check_user_exists(uuid) TO authenticated;