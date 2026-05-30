-- W9: Premium entitlements
-- Kept in sync by the /api/revenuecat-webhook endpoint.
-- Server-side AI/analytics endpoints query this table directly.

CREATE TABLE IF NOT EXISTS public.entitlements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product     TEXT NOT NULL DEFAULT 'premium_monthly',
  expires_at  TIMESTAMPTZ,          -- NULL means lifetime / no expiry
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product)
);

-- Only the service role (server webhook) can write; users can read their own row.
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own entitlement"
  ON public.entitlements FOR SELECT
  USING (auth.uid() = user_id);

-- Service role bypasses RLS automatically, so no insert/update policy needed
-- for the webhook path (it uses the service-role key).
