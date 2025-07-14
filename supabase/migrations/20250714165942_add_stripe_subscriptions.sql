-- Migration: Add Stripe subscription management
-- File: supabase/migrations/20250715000000_add_stripe_subscriptions.sql

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id text UNIQUE NOT NULL,
  stripe_subscription_id text UNIQUE,
  stripe_price_id text,
  status text NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'incomplete', 'trialing')),
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean DEFAULT false,
  plan_name text NOT NULL CHECK (plan_name IN ('free', 'personal', 'professional', 'enterprise')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Create plan limits table
CREATE TABLE IF NOT EXISTS plan_limits (
  plan_name text PRIMARY KEY,
  monthly_uploads integer NOT NULL,
  monthly_tts_characters integer NOT NULL,
  storage_gb integer NOT NULL,
  features jsonb DEFAULT '{}'::jsonb
);

-- Insert plan limits
INSERT INTO plan_limits (plan_name, monthly_uploads, monthly_tts_characters, storage_gb, features) VALUES
('free', 5, 25000, 1, '{"conversion": true, "basic_formats": true}'::jsonb),
('personal', 100, 200000, 2, '{"conversion": true, "all_formats": true, "progress_sync": true}'::jsonb),
('professional', 500, 1000000, 10, '{"conversion": true, "all_formats": true, "progress_sync": true, "advanced_search": true, "collections": true}'::jsonb),
('enterprise', -1, 3000000, 50, '{"conversion": true, "all_formats": true, "progress_sync": true, "advanced_search": true, "collections": true, "team_sharing": true, "priority_support": true}'::jsonb);

-- Create enhanced monthly usage table (extend existing TTS tracking)
CREATE TABLE IF NOT EXISTS monthly_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month_year text NOT NULL, -- Format: YYYY-MM
  uploads_count integer DEFAULT 0,
  tts_characters_used integer DEFAULT 0,
  storage_bytes_used bigint DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, month_year)
);

-- Migrate existing TTS usage data to new monthly_usage table
INSERT INTO monthly_usage (user_id, month_year, tts_characters_used, uploads_count, storage_bytes_used, created_at, updated_at)
SELECT 
  user_id,
  month_year,
  COALESCE(total_characters, 0) as tts_characters_used,
  0 as uploads_count, -- Will be populated by trigger
  0 as storage_bytes_used, -- Will be populated by trigger
  created_at,
  updated_at
FROM tts_monthly_usage
ON CONFLICT (user_id, month_year) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can manage subscriptions" ON subscriptions
  FOR ALL USING (true); -- Allow service role full access

-- RLS Policies for plan_limits (public read)
CREATE POLICY "Anyone can view plan limits" ON plan_limits
  FOR SELECT USING (true);

-- RLS Policies for monthly_usage
CREATE POLICY "Users can view their own usage" ON monthly_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can manage usage" ON monthly_usage
  FOR ALL USING (true); -- Allow service role full access

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_monthly_usage_user_month ON monthly_usage(user_id, month_year);

-- Function to get current usage with limits
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
AS $$
DECLARE
  current_month text := to_char(now(), 'YYYY-MM');
  user_plan text := 'free';
  user_status text := 'active';
BEGIN
  -- Get user's subscription info (default to free if no subscription)
  SELECT COALESCE(s.plan_name, 'free'), COALESCE(s.status, 'active') 
  INTO user_plan, user_status
  FROM subscriptions s 
  WHERE s.user_id = target_user_id;
  
  RETURN QUERY
  SELECT 
    COALESCE(u.uploads_count, 0) as current_uploads,
    COALESCE(u.tts_characters_used, 0) as current_tts_characters,
    ROUND((COALESCE(u.storage_bytes_used, 0)::numeric / 1073741824), 2) as current_storage_gb,
    l.monthly_uploads as limit_uploads,
    l.monthly_tts_characters as limit_tts_characters,
    l.storage_gb as limit_storage_gb,
    user_plan,
    user_status
  FROM plan_limits l
  LEFT JOIN monthly_usage u ON u.user_id = target_user_id AND u.month_year = current_month
  WHERE l.plan_name = user_plan;
END;
$$;

-- Function to increment usage (file uploads)
CREATE OR REPLACE FUNCTION increment_upload_usage(target_user_id uuid, file_size_bytes bigint DEFAULT 0)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_month text := to_char(now(), 'YYYY-MM');
BEGIN
  INSERT INTO monthly_usage (user_id, month_year, uploads_count, storage_bytes_used)
  VALUES (target_user_id, current_month, 1, file_size_bytes)
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET
    uploads_count = monthly_usage.uploads_count + 1,
    storage_bytes_used = monthly_usage.storage_bytes_used + file_size_bytes,
    updated_at = now();
END;
$$;

-- Function to increment TTS usage
CREATE OR REPLACE FUNCTION increment_tts_usage(target_user_id uuid, character_count integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_month text := to_char(now(), 'YYYY-MM');
BEGIN
  INSERT INTO monthly_usage (user_id, month_year, tts_characters_used)
  VALUES (target_user_id, current_month, character_count)
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET
    tts_characters_used = monthly_usage.tts_characters_used + character_count,
    updated_at = now();
END;
$$;

-- Function to update storage usage (for file deletions)
CREATE OR REPLACE FUNCTION update_storage_usage(target_user_id uuid, size_delta bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_month text := to_char(now(), 'YYYY-MM');
BEGIN
  INSERT INTO monthly_usage (user_id, month_year, storage_bytes_used)
  VALUES (target_user_id, current_month, GREATEST(0, size_delta))
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET
    storage_bytes_used = GREATEST(0, monthly_usage.storage_bytes_used + size_delta),
    updated_at = now();
END;
$$;

-- Trigger to auto-increment usage when files are uploaded
CREATE OR REPLACE FUNCTION handle_file_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Increment upload count and storage usage
  PERFORM increment_upload_usage(NEW.user_id, COALESCE(NEW.file_size, 0));
  RETURN NEW;
END;
$$;

-- Create trigger for file uploads
CREATE TRIGGER handle_file_upload_trigger
  AFTER INSERT ON files
  FOR EACH ROW
  EXECUTE FUNCTION handle_file_upload();

-- Trigger to handle file deletions
CREATE OR REPLACE FUNCTION handle_file_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Decrease storage usage when file is deleted
  PERFORM update_storage_usage(OLD.user_id, -COALESCE(OLD.file_size, 0));
  RETURN OLD;
END;
$$;

-- Create trigger for file deletions
CREATE TRIGGER handle_file_deletion_trigger
  AFTER DELETE ON files
  FOR EACH ROW
  EXECUTE FUNCTION handle_file_deletion();

-- Update existing TTS usage trigger to use new monthly_usage table
CREATE OR REPLACE FUNCTION update_monthly_tts_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Use the new increment function
  PERFORM increment_tts_usage(NEW.user_id, NEW.character_count);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add helpful comments
COMMENT ON TABLE subscriptions IS 'Stores Stripe subscription information for users';
COMMENT ON TABLE plan_limits IS 'Defines limits and features for each subscription plan';
COMMENT ON TABLE monthly_usage IS 'Tracks monthly usage across all features (uploads, TTS, storage)';
COMMENT ON COLUMN monthly_usage.uploads_count IS 'Number of files uploaded this month';
COMMENT ON COLUMN monthly_usage.tts_characters_used IS 'Total TTS characters used this month';
COMMENT ON COLUMN monthly_usage.storage_bytes_used IS 'Total storage used in bytes this month';
COMMENT ON COLUMN subscriptions.status IS 'Stripe subscription status';
COMMENT ON COLUMN subscriptions.plan_name IS 'Plan tier: free, personal, professional, enterprise';