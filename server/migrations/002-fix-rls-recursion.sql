-- Fix infinite recursion in RLS policies that reference class_memberships
-- from within a class_memberships policy (or via joins from profiles /
-- card_attempts / decks / cards / deck_shares / feed_posts).
--
-- The fix: replace the recursive subqueries with SECURITY DEFINER helper
-- functions. SECURITY DEFINER lets the function bypass RLS on its inner
-- query, breaking the recursion.
--
-- Idempotent; safe to re-run.

-- =====================================================================
-- 1. Helper functions
-- =====================================================================

CREATE OR REPLACE FUNCTION public.my_class_ids()
RETURNS SETOF text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT class_id FROM public.class_memberships WHERE user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.my_class_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_class_ids() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_classmate(other_user_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_memberships me
    JOIN public.class_memberships you ON you.class_id = me.class_id
    WHERE me.user_id = auth.uid() AND you.user_id = other_user_id
  );
$$;
REVOKE ALL ON FUNCTION public.is_classmate(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_classmate(uuid) TO authenticated;

-- =====================================================================
-- 2. Replace recursive policies
-- =====================================================================

-- class_memberships: classmate-read no longer self-joins.
DROP POLICY IF EXISTS p_cm_classmate_read ON public.class_memberships;
CREATE POLICY p_cm_classmate_read ON public.class_memberships
  FOR SELECT USING (class_id IN (SELECT public.my_class_ids()));

-- profiles: classmate visibility goes through is_classmate().
DROP POLICY IF EXISTS p_profiles_classmate_select ON public.profiles;
CREATE POLICY p_profiles_classmate_select ON public.profiles
  FOR SELECT USING (public.is_classmate(id));

-- card_attempts: same pattern.
DROP POLICY IF EXISTS p_attempts_classmate_read ON public.card_attempts;
CREATE POLICY p_attempts_classmate_read ON public.card_attempts
  FOR SELECT USING (public.is_classmate(user_id));

-- decks shared-via-group: rewrite to use my_class_ids() so the inner
-- class_memberships access goes through the SECURITY DEFINER function
-- and never re-enters RLS.
DROP POLICY IF EXISTS p_decks_shared_read ON public.decks;
CREATE POLICY p_decks_shared_read ON public.decks
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.deck_shares ds
      JOIN public.groups g ON g.id = ds.group_id
      WHERE ds.deck_id = decks.id
        AND g.class_id IN (SELECT public.my_class_ids())
    )
  );

-- cards: derived from deck readability. Rewrite the deck-shared branch.
DROP POLICY IF EXISTS p_cards_read ON public.cards;
CREATE POLICY p_cards_read ON public.cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.decks d
      WHERE d.id = cards.deck_id
        AND (
          d.owner_id = auth.uid()
          OR d.is_public = TRUE
          OR d.owner_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.deck_shares ds
            JOIN public.groups g ON g.id = ds.group_id
            WHERE ds.deck_id = d.id
              AND g.class_id IN (SELECT public.my_class_ids())
          )
        )
    )
  );

-- deck_shares: group-member read.
DROP POLICY IF EXISTS p_deck_shares_member_read ON public.deck_shares;
CREATE POLICY p_deck_shares_member_read ON public.deck_shares
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = deck_shares.group_id
        AND g.class_id IN (SELECT public.my_class_ids())
    )
  );

-- feed_posts: group-scoped read.
DROP POLICY IF EXISTS p_feed_group_read ON public.feed_posts;
CREATE POLICY p_feed_group_read ON public.feed_posts
  FOR SELECT USING (
    group_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = feed_posts.group_id
        AND g.class_id IN (SELECT public.my_class_ids())
    )
  );
