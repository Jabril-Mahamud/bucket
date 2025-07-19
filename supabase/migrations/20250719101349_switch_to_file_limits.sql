-- Migration: Switch from monthly upload limits to total file limits
-- File: supabase/migrations/20250719000000_switch_to_file_limits.sql

-- Update plan_limits table to use file limits instead of monthly uploads
ALTER TABLE plan_limits 
RENAME COLUMN monthly_uploads TO max_files;

-- Update plan limits with new file-based limits
UPDATE plan_limits SET max_files = 20 WHERE plan_name = 'free';
UPDATE plan_limits SET max_files = 500 WHERE plan_name = 'personal'; 
UPDATE plan_limits SET max_files = 2000 WHERE plan_name = 'professional';
UPDATE plan_limits SET max_files = -1 WHERE plan_name = 'enterprise'; -- Unlimited

-- We can remove uploads_count from monthly_usage since we'll count files directly
-- But keep it for now to avoid breaking things during transition
-- ALTER TABLE monthly_usage DROP COLUMN uploads_count;

-- Drop the existing function and recreate with file counting
DROP FUNCTION IF EXISTS get_user_usage_with_limits(uuid);

-- New function that counts total files instead of monthly uploads
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
  total_files integer;
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
  
  -- Count total files for this user
  SELECT COUNT(*)::integer 
  INTO total_files 
  FROM files 
  WHERE user_id = target_user_id;
  
  -- Return usage data with plan limits
  RETURN QUERY
  SELECT 
    COALESCE(total_files, 0)::integer as current_uploads, -- Now represents total files
    COALESCE(u.tts_characters_used, 0)::integer as current_tts_characters,
    ROUND(COALESCE(u.storage_bytes_used::numeric / 1073741824, 0), 2) as current_storage_gb,
    COALESCE(l.max_files, 20)::integer as limit_uploads, -- Now represents max files
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
      COALESCE(total_files, 0)::integer,
      0::integer,
      0::numeric,
      20::integer, -- Free plan default file limit
      25000::integer,
      1::integer,
      'free'::text,
      'active'::text;
  END IF;
END;
$$;

-- Update the increment_upload_usage function to not increment upload count
-- since we're now counting files directly from the files table
CREATE OR REPLACE FUNCTION increment_upload_usage(target_user_id uuid, file_size_bytes bigint DEFAULT 0)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_month text := to_char(now(), 'YYYY-MM');
BEGIN
  -- Only update storage usage, not upload count (we count files directly now)
  INSERT INTO monthly_usage (user_id, month_year, uploads_count, storage_bytes_used)
  VALUES (target_user_id, current_month, 0, file_size_bytes)
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET
    storage_bytes_used = monthly_usage.storage_bytes_used + file_size_bytes,
    updated_at = now();
END;
$$;

-- Update file upload trigger to only handle storage
CREATE OR REPLACE FUNCTION handle_file_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only increment storage usage (file count is calculated directly from files table)
  PERFORM increment_upload_usage(NEW.user_id, COALESCE(NEW.file_size, 0));
  RETURN NEW;
END;
$$;

-- Add helpful comments
COMMENT ON COLUMN plan_limits.max_files IS 'Maximum total files allowed (-1 for unlimited)';
COMMENT ON TABLE plan_limits IS 'Plan limits: max_files is total files, not monthly uploads';

-- Update plan features to reflect file-based limits
UPDATE plan_limits SET features = jsonb_set(
  features, 
  '{file_limit}', 
  to_jsonb(max_files)
) WHERE plan_name IN ('free', 'personal', 'professional', 'enterprise');