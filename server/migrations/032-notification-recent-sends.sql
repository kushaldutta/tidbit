-- Track recently sent notification tidbits per device (server-side rotation; no app update).

ALTER TABLE public.device_tokens
  ADD COLUMN IF NOT EXISTS recent_notification_sends JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.device_tokens.recent_notification_sends IS
  'Recent notification tidbit IDs [{id, sentAt}] — avoids repeating the same card within ~48h.';
