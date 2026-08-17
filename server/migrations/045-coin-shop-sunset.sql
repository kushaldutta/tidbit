-- Coin shop: persist cosmetic unlocks and spend coins server-side.
-- First item: Sunset theme (80 coins). Price is enforced here, not by the client.

CREATE TABLE IF NOT EXISTS public.user_cosmetics (
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, item_id)
);

ALTER TABLE public.user_cosmetics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_uc_read ON public.user_cosmetics;
CREATE POLICY p_uc_read ON public.user_cosmetics
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.purchase_cosmetic(p_item_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user  UUID := auth.uid();
  v_cost  INTEGER;
  v_note  TEXT;
  v_bal   INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  IF p_item_id = 'theme:sunset' THEN
    v_cost := 80;
    v_note := 'Sunset theme';
  ELSE
    RETURN 'unknown_item';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_cosmetics
    WHERE user_id = v_user AND item_id = p_item_id
  ) THEN
    RETURN 'already_owned';
  END IF;

  SELECT coin_balance INTO v_bal
  FROM public.profiles
  WHERE id = v_user
  FOR UPDATE;

  IF v_bal IS NULL THEN
    RETURN 'insufficient_funds';
  END IF;
  IF v_bal < v_cost THEN
    RETURN 'insufficient_funds';
  END IF;

  INSERT INTO public.user_cosmetics (user_id, item_id)
  VALUES (v_user, p_item_id);

  INSERT INTO public.coin_ledger (user_id, amount, source_type, source_id, note)
  VALUES (v_user, -v_cost, 'shop', p_item_id, v_note);

  UPDATE public.profiles
  SET coin_balance = coin_balance - v_cost
  WHERE id = v_user;

  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_cosmetic(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_cosmetic(TEXT) TO authenticated;
