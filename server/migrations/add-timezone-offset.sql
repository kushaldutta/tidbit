-- Migration: Add timezone_offset_minutes to device_tokens table
-- Run this in Supabase SQL Editor

ALTER TABLE device_tokens 
ADD COLUMN IF NOT EXISTS timezone_offset_minutes INTEGER DEFAULT 0;

COMMENT ON COLUMN device_tokens.timezone_offset_minutes IS 'Timezone offset in minutes from UTC (e.g., PST = -480, EST = -300, UTC = 0)';

