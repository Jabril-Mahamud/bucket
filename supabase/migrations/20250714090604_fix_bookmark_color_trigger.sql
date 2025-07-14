-- Migration: Fix bookmark color assignment trigger
-- File: supabase/migrations/fix_bookmark_color_trigger.sql

-- Update the bookmark color assignment trigger to handle edge cases
CREATE OR REPLACE FUNCTION assign_bookmark_color()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only assign color if not provided or if it's invalid
  IF NEW.color IS NULL OR NEW.color NOT IN (
    'rose', 'pink', 'fuchsia', 'purple', 'violet', 'indigo',
    'blue', 'sky', 'cyan', 'teal', 'emerald', 'green',
    'lime', 'yellow', 'amber', 'orange', 'red', 'stone'
  ) THEN
    NEW.color := generate_bookmark_color(NEW.id);
  END IF;
  
  -- Only assign color_index if not provided or if it's invalid
  IF NEW.color_index IS NULL OR NEW.color_index < 0 OR NEW.color_index >= 18 THEN
    NEW.color_index := generate_bookmark_color_index(NEW.id);
  END IF;
  
  -- Double-check that color_index is valid (fallback)
  IF NEW.color_index IS NULL OR NEW.color_index < 0 OR NEW.color_index >= 18 THEN
    NEW.color_index := 0; -- Default to first color if all else fails
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Improve the color index generation function to handle edge cases
CREATE OR REPLACE FUNCTION generate_bookmark_color_index(bookmark_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
  max_colors integer := 18;
  raw_value bigint;
  color_index integer;
BEGIN
  -- Handle potential issues with UUID conversion
  BEGIN
    -- Extract first 8 characters of UUID and convert to integer
    raw_value := ('x' || substring(bookmark_id::text, 1, 8))::bit(32)::bigint;
    
    -- Ensure positive value and get modulo
    color_index := (abs(raw_value) % max_colors)::integer;
    
    -- Final validation
    IF color_index < 0 OR color_index >= max_colors THEN
      color_index := 0;
    END IF;
    
    RETURN color_index;
    
  EXCEPTION WHEN OTHERS THEN
    -- If anything goes wrong, return a default value
    RETURN 0;
  END;
END;
$function$;