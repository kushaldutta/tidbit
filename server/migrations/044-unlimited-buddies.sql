-- Remove the 3-buddies-per-class cap on accept_buddy_request.

CREATE OR REPLACE FUNCTION public.accept_buddy_request(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req RECORD;
  v_u1  UUID;
  v_u2  UUID;
BEGIN
  SELECT * INTO v_req FROM public.buddy_requests
  WHERE id = p_request_id AND target_id = auth.uid() AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or not addressable by this user';
  END IF;

  IF v_req.requester_id < v_req.target_id THEN
    v_u1 := v_req.requester_id; v_u2 := v_req.target_id;
  ELSE
    v_u1 := v_req.target_id;    v_u2 := v_req.requester_id;
  END IF;

  UPDATE public.buddy_requests
  SET status = 'accepted', updated_at = NOW()
  WHERE id = p_request_id;

  INSERT INTO public.buddy_pairs (user1_id, user2_id, class_id)
  VALUES (v_u1, v_u2, v_req.class_id)
  ON CONFLICT (user1_id, user2_id, class_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_buddy_request(UUID) TO authenticated;
