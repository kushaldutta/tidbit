-- Supabase Database Schema for Tidbit App
-- Run this in Supabase SQL Editor

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tidbits table
CREATE TABLE IF NOT EXISTS tidbits (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'easy',
  tags JSONB DEFAULT '[]'::jsonb,
  source TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tidbits_category_id ON tidbits(category_id);
CREATE INDEX IF NOT EXISTS idx_tidbits_is_active ON tidbits(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
-- Drop existing triggers if they exist (for re-running the script)
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tidbits_updated_at ON tidbits;
CREATE TRIGGER update_tidbits_updated_at
  BEFORE UPDATE ON tidbits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Device tokens table for push notifications
CREATE TABLE IF NOT EXISTS device_tokens (
  id SERIAL PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  user_id TEXT, -- Optional: for multi-user support later
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  app_version TEXT,
  -- User preferences (stored as JSON)
  notification_interval INTEGER DEFAULT 60, -- minutes
  notifications_enabled BOOLEAN DEFAULT true,
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start INTEGER DEFAULT 23, -- 0-23
  quiet_hours_end INTEGER DEFAULT 9, -- 0-23
  selected_categories JSONB DEFAULT '[]'::jsonb, -- array of category IDs
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens(token);
CREATE INDEX IF NOT EXISTS idx_device_tokens_platform ON device_tokens(platform);
CREATE INDEX IF NOT EXISTS idx_device_tokens_last_active ON device_tokens(last_active);

-- Trigger to update updated_at for device_tokens
DROP TRIGGER IF EXISTS update_device_tokens_updated_at ON device_tokens;
CREATE TRIGGER update_device_tokens_updated_at
  BEFORE UPDATE ON device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories (matching your current structure)
INSERT INTO categories (id, name, description, sort_order) VALUES
  ('math-54', 'MATH 54', 'Linear algebra and differential equations', 1),
  ('history', 'History', 'Fascinating historical moments', 2),
  ('science', 'Science', 'Scientific discoveries and phenomena', 3),
  ('berkeley-fun-facts', 'Berkeley Fun Facts', 'Interesting facts about UC Berkeley', 4),
  ('miscellaneous', 'Miscellaneous', 'Tech, psychology, finance, fun facts, and health', 5)
ON CONFLICT (id) DO NOTHING;

