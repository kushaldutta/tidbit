-- Migration 039: Section Groups
-- Adds section_name to groups so a class can have sub-groups like "CS61A Section 103".
-- Parent class group (section_name IS NULL) is the "whole class" default.
-- Section sub-groups share the parent's group_id FK pattern; they reference parent_group_id.

-- ─────────────────────────────────────────────────────────────
-- 1. Add section columns to groups
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS section_name   TEXT,           -- e.g. "Section 103", NULL = whole class
  ADD COLUMN IF NOT EXISTS parent_group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;

-- Unique constraint: one section with a given name per class
CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_class_section
  ON public.groups (class_id, section_name)
  WHERE section_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_groups_parent
  ON public.groups (parent_group_id)
  WHERE parent_group_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 2. section_memberships: user joins a specific section sub-group
--    Separate from class_memberships (joining the class) so users
--    can be in the class group without being in any section, or in
--    exactly one section within the class.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.section_memberships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id    UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, group_id)
);

-- One section per class per user (enforce via partial unique on class_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_section_memberships_user_class
  ON public.section_memberships (user_id, (
    SELECT class_id FROM public.groups WHERE id = group_id LIMIT 1
  ));

CREATE INDEX IF NOT EXISTS idx_section_memberships_group
  ON public.section_memberships (group_id);

ALTER TABLE public.section_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_sm_read ON public.section_memberships;
CREATE POLICY p_sm_read ON public.section_memberships
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.groups g
      JOIN public.class_memberships cm ON cm.class_id = g.class_id
      WHERE g.id = section_memberships.group_id AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS p_sm_insert ON public.section_memberships;
CREATE POLICY p_sm_insert ON public.section_memberships
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS p_sm_delete ON public.section_memberships;
CREATE POLICY p_sm_delete ON public.section_memberships
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 3. RPC: create_section_group
-- Creates a section sub-group for a class the user belongs to.
-- Returns the new group's ID.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_section_group(
  p_class_id    UUID,
  p_section_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_parent_group_id UUID;
  v_new_group_id    UUID;
BEGIN
  -- Caller must be a class member
  IF NOT EXISTS (
    SELECT 1 FROM public.class_memberships
    WHERE class_id = p_class_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a member of this class';
  END IF;

  -- Get the parent (whole-class) group
  SELECT id INTO v_parent_group_id
  FROM public.groups
  WHERE class_id = p_class_id AND section_name IS NULL
  LIMIT 1;

  IF v_parent_group_id IS NULL THEN
    RAISE EXCEPTION 'No parent group found for this class';
  END IF;

  INSERT INTO public.groups (class_id, section_name, parent_group_id)
  VALUES (p_class_id, p_section_name, v_parent_group_id)
  ON CONFLICT (class_id, section_name) DO NOTHING
  RETURNING id INTO v_new_group_id;

  -- If already existed, fetch the existing id
  IF v_new_group_id IS NULL THEN
    SELECT id INTO v_new_group_id
    FROM public.groups
    WHERE class_id = p_class_id AND section_name = p_section_name;
  END IF;

  RETURN v_new_group_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 4. RPC: join_section
-- Joins a section group; auto-joins the parent class if needed.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.join_section(p_group_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_class_id UUID;
BEGIN
  SELECT class_id INTO v_class_id
  FROM public.groups
  WHERE id = p_group_id AND section_name IS NOT NULL;

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Group is not a section group';
  END IF;

  -- Ensure user is a class member (section implies class membership)
  INSERT INTO public.class_memberships (user_id, class_id)
  VALUES (auth.uid(), v_class_id)
  ON CONFLICT (user_id, class_id) DO NOTHING;

  -- Join section
  INSERT INTO public.section_memberships (user_id, group_id)
  VALUES (auth.uid(), p_group_id)
  ON CONFLICT (user_id, group_id) DO NOTHING;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. class_sections view: lists section groups per class with member counts
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.class_sections AS
SELECT
  g.id AS group_id,
  g.class_id,
  g.section_name,
  g.parent_group_id,
  COUNT(sm.user_id) AS member_count
FROM public.groups g
LEFT JOIN public.section_memberships sm ON sm.group_id = g.id
WHERE g.section_name IS NOT NULL
GROUP BY g.id, g.class_id, g.section_name, g.parent_group_id;
