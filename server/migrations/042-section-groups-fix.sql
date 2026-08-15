-- Allow section sub-groups (039 left UNIQUE(class_id) on groups, so inserts failed).
-- Fix create_section_group class_id type (TEXT, not UUID). Switch section on join.

ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS groups_class_id_key;
ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS groups_class_id_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_class_parent
  ON public.groups (class_id)
  WHERE section_name IS NULL;

DROP FUNCTION IF EXISTS public.create_section_group(UUID, TEXT);
DROP FUNCTION IF EXISTS public.create_section_group(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.create_section_group(
  p_class_id TEXT,
  p_section_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_group_id UUID;
  v_new_group_id    UUID;
  v_name            TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  v_name := btrim(p_section_name);
  IF v_name IS NULL OR v_name = '' THEN
    RAISE EXCEPTION 'Section name required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.class_memberships
    WHERE class_id = p_class_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a member of this class';
  END IF;

  SELECT id INTO v_parent_group_id
  FROM public.groups
  WHERE class_id = p_class_id AND section_name IS NULL
  LIMIT 1;

  IF v_parent_group_id IS NULL THEN
    RAISE EXCEPTION 'No parent group found for this class';
  END IF;

  INSERT INTO public.groups (class_id, section_name, parent_group_id)
  VALUES (p_class_id, v_name, v_parent_group_id)
  RETURNING id INTO v_new_group_id;
  RETURN v_new_group_id;
EXCEPTION WHEN unique_violation THEN
  SELECT id INTO v_new_group_id
  FROM public.groups
  WHERE class_id = p_class_id AND section_name = v_name;
  RETURN v_new_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_section(p_group_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class_id TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  SELECT class_id INTO v_class_id
  FROM public.groups
  WHERE id = p_group_id AND section_name IS NOT NULL;

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Group is not a section group';
  END IF;

  INSERT INTO public.class_memberships (user_id, class_id)
  VALUES (auth.uid(), v_class_id)
  ON CONFLICT (user_id, class_id) DO NOTHING;

  DELETE FROM public.section_memberships
  WHERE user_id = auth.uid()
    AND class_id = v_class_id
    AND group_id <> p_group_id;

  INSERT INTO public.section_memberships (user_id, group_id, class_id)
  VALUES (auth.uid(), p_group_id, v_class_id)
  ON CONFLICT (user_id, group_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_section_group(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_section(UUID) TO authenticated;
GRANT SELECT ON public.class_sections TO authenticated;
