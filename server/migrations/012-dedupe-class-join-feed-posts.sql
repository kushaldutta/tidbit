-- Migration 012: Only post "joined the class" on a user's first-ever enrollment.
-- Rejoining after leaving should not spam the class feed.

CREATE TABLE IF NOT EXISTS public.class_first_joins (
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id        TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  first_joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, class_id)
);

-- Internal ledger: no client access; trigger runs as SECURITY DEFINER.
ALTER TABLE public.class_first_joins ENABLE ROW LEVEL SECURITY;

-- Mark current members as already having joined once.
INSERT INTO public.class_first_joins (user_id, class_id, first_joined_at)
SELECT user_id, class_id, joined_at
FROM public.class_memberships
ON CONFLICT (user_id, class_id) DO NOTHING;

-- Mark users who already have a join post in the feed (covers people who left).
INSERT INTO public.class_first_joins (user_id, class_id, first_joined_at)
SELECT DISTINCT fp.author_id, g.class_id, MIN(fp.created_at)
FROM public.feed_posts fp
JOIN public.groups g ON g.id = fp.group_id
WHERE fp.post_type = 'activity'
  AND fp.payload->>'event' = 'class_join'
  AND g.class_id IS NOT NULL
GROUP BY fp.author_id, g.class_id
ON CONFLICT (user_id, class_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.auto_post_class_join()
RETURNS TRIGGER AS $$
DECLARE
  v_group_id     UUID;
  v_display_name TEXT;
  v_class_code   TEXT;
  v_is_first     INTEGER;
BEGIN
  INSERT INTO public.class_first_joins (user_id, class_id)
  VALUES (NEW.user_id, NEW.class_id)
  ON CONFLICT (user_id, class_id) DO NOTHING;

  GET DIAGNOSTICS v_is_first = ROW_COUNT;
  IF v_is_first = 0 THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_group_id FROM public.groups WHERE class_id = NEW.class_id LIMIT 1;
  IF v_group_id IS NULL THEN RETURN NEW; END IF;

  SELECT display_name INTO v_display_name FROM public.profiles WHERE id = NEW.user_id;
  SELECT code        INTO v_class_code   FROM public.classes  WHERE id = NEW.class_id;

  INSERT INTO public.feed_posts (author_id, group_id, post_type, payload)
  VALUES (
    NEW.user_id,
    v_group_id,
    'activity',
    jsonb_build_object(
      'event', 'class_join',
      'text',  COALESCE(v_display_name, 'A new student')
               || ' joined '
               || COALESCE(v_class_code, 'the class')
               || '! 👋'
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
