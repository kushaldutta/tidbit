-- W8: Bedtime brief
-- Adds a "bedtime_sent_date" column to device_tokens so the server can
-- track whether today's 10 PM bedtime brief has already been sent per device.
-- Stored as TEXT "YYYY-MM-DD" (UTC date), reset implicitly each new day.

ALTER TABLE public.device_tokens
  ADD COLUMN IF NOT EXISTS bedtime_sent_date TEXT DEFAULT NULL;
