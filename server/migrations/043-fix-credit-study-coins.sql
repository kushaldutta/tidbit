-- Fix credit_study_coins: ON CONFLICT targeted a partial unique index without
-- repeating the index predicate, so every award failed and balances stayed 0.
-- Also grant EXECUTE (034 never did) and pin search_path.

CREATE OR REPLACE FUNCTION public.credit_study_coins(
  p_user_id     UUID,
  p_amount      INTEGER,
  p_source_type TEXT,
  p_source_id   TEXT DEFAULT NULL,
  p_note        TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  IF auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'cannot credit coins for another user';
  END IF;
  IF p_amount = 0 THEN
    RETURN false;
  END IF;

  BEGIN
    INSERT INTO public.coin_ledger (user_id, amount, source_type, source_id, note)
    VALUES (p_user_id, p_amount, p_source_type, p_source_id, p_note);
  EXCEPTION
    WHEN unique_violation THEN
      RETURN false;
  END;

  UPDATE public.profiles
  SET
    coin_balance       = coin_balance + p_amount,
    total_coins_earned = total_coins_earned + GREATEST(p_amount, 0)
  WHERE id = p_user_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_study_coins(UUID, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_study_coins(UUID, INTEGER, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_study_coins(UUID, INTEGER, TEXT, TEXT, TEXT) TO service_role;
