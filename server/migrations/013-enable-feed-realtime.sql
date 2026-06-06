-- Migration 013: Enable Supabase Realtime for class feed live updates.
-- Run in Supabase SQL editor if feed doesn't update until you leave/re-enter.

ALTER TABLE public.feed_posts REPLICA IDENTITY FULL;
ALTER TABLE public.reactions REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_posts;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
