-- Migration: Add TTS usage tracking
-- File: supabase/migrations/add_tts_usage_tracking.sql

-- Create TTS usage tracking table
CREATE TABLE IF NOT EXISTS tts_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_id uuid REFERENCES files(id) ON DELETE SET NULL,
  text_snippet text NOT NULL, -- First 100 chars for reference
  character_count integer NOT NULL,
  voice_id text NOT NULL,
  audio_url text, -- S3 URL or storage path
  cost_cents integer, -- Cost in cents for billing
  created_at timestamp with time zone DEFAULT now(),
  month_year text GENERATED ALWAYS AS (to_char(created_at, 'YYYY-MM')) STORED
);

-- Create monthly usage summary table for billing
CREATE TABLE IF NOT EXISTS tts_monthly_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month_year text NOT NULL,
  total_characters integer DEFAULT 0,
  total_cost_cents integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, month_year)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tts_usage_user_id ON tts_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_tts_usage_month_year ON tts_usage(month_year);
CREATE INDEX IF NOT EXISTS idx_tts_usage_file_id ON tts_usage(file_id);
CREATE INDEX IF NOT EXISTS idx_tts_monthly_usage_user_month ON tts_monthly_usage(user_id, month_year);

-- Enable RLS
ALTER TABLE tts_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE tts_monthly_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tts_usage
CREATE POLICY "Users can view their own TTS usage" ON tts_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own TTS usage" ON tts_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for tts_monthly_usage
CREATE POLICY "Users can view their own monthly TTS usage" ON tts_monthly_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own monthly TTS usage" ON tts_monthly_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly TTS usage" ON tts_monthly_usage
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to update monthly usage
CREATE OR REPLACE FUNCTION update_monthly_tts_usage()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO tts_monthly_usage (user_id, month_year, total_characters, total_cost_cents)
  VALUES (NEW.user_id, NEW.month_year, NEW.character_count, NEW.cost_cents)
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET
    total_characters = tts_monthly_usage.total_characters + NEW.character_count,
    total_cost_cents = tts_monthly_usage.total_cost_cents + NEW.cost_cents,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update monthly usage
CREATE TRIGGER update_monthly_tts_usage_trigger
  AFTER INSERT ON tts_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_monthly_tts_usage();

-- Function to get current month usage for a user
CREATE OR REPLACE FUNCTION get_current_month_tts_usage(target_user_id uuid)
RETURNS TABLE (
  total_characters integer,
  total_cost_cents integer,
  current_month text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(mu.total_characters, 0) as total_characters,
    COALESCE(mu.total_cost_cents, 0) as total_cost_cents,
    to_char(now(), 'YYYY-MM') as current_month
  FROM tts_monthly_usage mu
  WHERE mu.user_id = target_user_id 
    AND mu.month_year = to_char(now(), 'YYYY-MM')
  UNION ALL
  SELECT 0, 0, to_char(now(), 'YYYY-MM')
  WHERE NOT EXISTS (
    SELECT 1 FROM tts_monthly_usage 
    WHERE user_id = target_user_id 
      AND month_year = to_char(now(), 'YYYY-MM')
  )
  LIMIT 1;
END;
$$;

-- Comments
COMMENT ON TABLE tts_usage IS 'Tracks individual TTS API calls for billing and analytics';
COMMENT ON TABLE tts_monthly_usage IS 'Monthly aggregated TTS usage for billing';
COMMENT ON COLUMN tts_usage.cost_cents IS 'Cost in cents (AWS Polly ~$4 per 1M chars = 0.0004 cents per char)';
COMMENT ON COLUMN tts_usage.text_snippet IS 'First 100 characters of converted text for reference';