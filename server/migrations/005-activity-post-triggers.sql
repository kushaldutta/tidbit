-- Migration 005: Automatic activity-post generation
-- Triggers on deck_shares and class_memberships create feed_posts so group
-- members see social signals without any server polling.
-- Both functions use SECURITY DEFINER so they run as the postgres role and
-- bypass per-user RLS when inserting the activity post.

-- ── 1. Deck share → activity post ────────────────────────────────────────────
-- Fires once every time a deck is shared to a group.
CREATE OR REPLACE FUNCTION public.auto_post_deck_share()
RETURNS TRIGGER AS $$
DECLARE
  v_deck_title TEXT;
BEGIN
  SELECT title INTO v_deck_title FROM public.decks WHERE id = NEW.deck_id;

  INSERT INTO public.feed_posts (author_id, group_id, post_type, payload)
  VALUES (
    NEW.shared_by,
    NEW.group_id,
    'deck_share',
    jsonb_build_object(
      'event',     'deck_share',
      'deckId',    NEW.deck_id,
      'deckTitle', COALESCE(v_deck_title, 'a deck'),
      'text',      'shared a deck with the group: "' || COALESCE(v_deck_title, 'Untitled') || '"'
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_post_deck_share ON public.deck_shares;
CREATE TRIGGER trg_auto_post_deck_share
  AFTER INSERT ON public.deck_shares
  FOR EACH ROW EXECUTE FUNCTION public.auto_post_deck_share();

-- ── 2. Class join → welcome activity post ────────────────────────────────────
-- Fires once every time a user joins a class. Looks up the class's group and
-- posts a "joined the group" activity so existing members are notified.
CREATE OR REPLACE FUNCTION public.auto_post_class_join()
RETURNS TRIGGER AS $$
DECLARE
  v_group_id     UUID;
  v_display_name TEXT;
  v_class_code   TEXT;
BEGIN
  -- Find the group for this class (1:1 per class)
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

DROP TRIGGER IF EXISTS trg_auto_post_class_join ON public.class_memberships;
CREATE TRIGGER trg_auto_post_class_join
  AFTER INSERT ON public.class_memberships
  FOR EACH ROW EXECUTE FUNCTION public.auto_post_class_join();
