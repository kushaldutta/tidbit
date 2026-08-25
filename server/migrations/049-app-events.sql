-- Migration 049: product analytics event log.
--
-- Why a table instead of a third-party SDK: the metrics that matter here are
-- joins against data we already own ("daily challenge participation as a share
-- of enrolled class members" is one SQL join). An external tool does not know
-- what a class enrollment is, so those questions would become export-and-
-- reconcile problems. Keeping events next to the class tables also means no new
-- vendor holds student behavioural data — some AP users are minors.
--
-- Design notes:
--   * user_id is NULLABLE on purpose. Onboarding drop-off is the whole point,
--     and someone who abandons before signup has no auth.uid() yet.
--   * occurred_at is client time (when it happened, possibly offline);
--     received_at is server time. Trust received_at for ordering, occurred_at
--     for user-local reasoning. Never assume they are close together.
--   * NO SELECT POLICY. Students must not read each other's behaviour. Query
--     this from the Supabase SQL editor or the server (service role bypasses
--     RLS). Adding a read policy later would be a privacy regression.
--   * props must never carry PII or content — no emails, no card text. See the
--     allow-list in src/services/AnalyticsService.js.

CREATE TABLE IF NOT EXISTS public.app_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id   TEXT NOT NULL,
  event        TEXT NOT NULL,
  props        JSONB NOT NULL DEFAULT '{}'::jsonb,
  app_version  TEXT,
  build        TEXT,
  platform     TEXT,
  occurred_at  TIMESTAMPTZ NOT NULL,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_events_event_time
  ON public.app_events(event, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_events_user_time
  ON public.app_events(user_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_events_session
  ON public.app_events(session_id);

ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

-- Insert-only, own-rows-only. anon is allowed so the pre-signup onboarding
-- funnel can be recorded; those rows carry user_id IS NULL.
DROP POLICY IF EXISTS p_app_events_insert ON public.app_events;
CREATE POLICY p_app_events_insert ON public.app_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Deliberately no SELECT / UPDATE / DELETE policy — see header.

-- ─────────────────────────────────────────────────────────────
-- Reporting views. Read these in the Supabase SQL editor; they are the
-- dashboard. Each answers one launch question from SUMMER_VISION.md.
-- ─────────────────────────────────────────────────────────────

-- Daily active users — "opened the app", which user_stats.last_active_date
-- cannot tell us because it only moves when someone actually studies.
CREATE OR REPLACE VIEW public.v_daily_active_users AS
SELECT
  (received_at AT TIME ZONE 'UTC')::date AS day,
  COUNT(DISTINCT user_id)                AS users,
  COUNT(DISTINCT session_id)             AS sessions
FROM public.app_events
WHERE event = 'app_opened' AND user_id IS NOT NULL
GROUP BY 1
ORDER BY 1 DESC;

-- Signup-day cohort retention. Day 0 is the profile's creation date, so a user
-- who signs up and never returns still appears (as a cohort of one with no
-- later days) — which is exactly the population we are blind to today.
CREATE OR REPLACE VIEW public.v_retention_by_cohort AS
WITH opens AS (
  SELECT DISTINCT
    e.user_id,
    (e.received_at AT TIME ZONE 'UTC')::date AS day
  FROM public.app_events e
  WHERE e.event = 'app_opened' AND e.user_id IS NOT NULL
)
SELECT
  (p.created_at AT TIME ZONE 'UTC')::date        AS cohort_day,
  (o.day - (p.created_at AT TIME ZONE 'UTC')::date) AS day_offset,
  COUNT(DISTINCT o.user_id)                      AS users
FROM public.profiles p
JOIN opens o ON o.user_id = p.id
GROUP BY 1, 2
ORDER BY 1 DESC, 2;

-- Onboarding funnel. Counts distinct sessions, not users, because the whole
-- point is the sessions that never became users.
CREATE OR REPLACE VIEW public.v_onboarding_funnel AS
SELECT
  event,
  COUNT(DISTINCT session_id) AS sessions,
  MIN(received_at)           AS first_seen,
  MAX(received_at)           AS last_seen
FROM public.app_events
WHERE event IN (
  'onboarding_started',
  'signup_completed',
  'profile_completed',
  'classes_selected',
  'frequency_selected',
  'notification_permission',
  'first_study_started'
)
GROUP BY event;

-- Notification funnel: sent (already tracked in 032) vs. opened vs. answered.
-- The middle number is the one we could not see before.
CREATE OR REPLACE VIEW public.v_notification_funnel AS
SELECT
  (received_at AT TIME ZONE 'UTC')::date AS day,
  COUNT(*) FILTER (WHERE event = 'notification_opened')  AS opened,
  COUNT(*) FILTER (WHERE event = 'notification_action')  AS actioned
FROM public.app_events
WHERE event IN ('notification_opened', 'notification_action')
GROUP BY 1
ORDER BY 1 DESC;

-- Daily Challenge: starts vs. completions, per class per day. Divide by the
-- class's member count for the >30% participation target.
CREATE OR REPLACE VIEW public.v_daily_challenge_funnel AS
SELECT
  (received_at AT TIME ZONE 'UTC')::date AS day,
  props->>'category'                     AS category_slug,
  COUNT(*) FILTER (WHERE event = 'daily_challenge_started')   AS started,
  COUNT(*) FILTER (WHERE event = 'daily_challenge_completed') AS completed
FROM public.app_events
WHERE event IN ('daily_challenge_started', 'daily_challenge_completed')
GROUP BY 1, 2
ORDER BY 1 DESC, 2;

-- Premium funnel — how many saw the paywall, not just how many bought.
-- RevenueCat has the purchases; it does not have the bounces.
CREATE OR REPLACE VIEW public.v_paywall_funnel AS
SELECT
  (received_at AT TIME ZONE 'UTC')::date AS day,
  props->>'source'                       AS entry_point,
  COUNT(*) FILTER (WHERE event = 'paywall_viewed')      AS viewed,
  COUNT(*) FILTER (WHERE event = 'purchase_started')    AS started,
  COUNT(*) FILTER (WHERE event = 'purchase_completed')  AS completed,
  -- Split out because they mean opposite things: cancelled is a pricing or
  -- intent signal, failed is a bug in the purchase path.
  COUNT(*) FILTER (WHERE event = 'purchase_cancelled')  AS cancelled,
  COUNT(*) FILTER (WHERE event = 'purchase_failed')     AS failed
FROM public.app_events
WHERE event IN (
  'paywall_viewed', 'purchase_started', 'purchase_completed',
  'purchase_cancelled', 'purchase_failed'
)
GROUP BY 1, 2
ORDER BY 1 DESC;

-- Dead ends. Every row is a user who tapped into something and got nothing.
-- If this table is busy in launch week, that is the bug list.
CREATE OR REPLACE VIEW public.v_dead_ends AS
SELECT
  props->>'feature' AS feature,
  props->>'reason'  AS reason,
  props->>'category' AS category_slug,
  COUNT(*)          AS hits,
  COUNT(DISTINCT user_id) AS users,
  MAX(received_at)  AS last_seen
FROM public.app_events
WHERE event = 'feature_unavailable'
GROUP BY 1, 2, 3
ORDER BY hits DESC;

-- Study mode mix — which learn modes people actually choose.
CREATE OR REPLACE VIEW public.v_study_mode_mix AS
SELECT
  (received_at AT TIME ZONE 'UTC')::date AS day,
  props->>'mode'                         AS mode,
  COUNT(*) FILTER (WHERE event = 'study_session_started')   AS started,
  COUNT(*) FILTER (WHERE event = 'study_session_completed') AS completed
FROM public.app_events
WHERE event IN ('study_session_started', 'study_session_completed')
GROUP BY 1, 2
ORDER BY 1 DESC, 2;

-- ─────────────────────────────────────────────────────────────
-- Lock the views down.
--
-- This is not belt-and-braces, it is load-bearing. A Postgres view runs with
-- its OWNER's privileges, not the caller's, so these views would happily read
-- straight through app_events' RLS — the "no SELECT policy" above would buy us
-- nothing, and any signed-in student could query class-level behaviour from
-- the app's own anon key. Revoke explicitly; service_role still bypasses RLS,
-- so the Supabase SQL editor and the server keep full access.
--
-- If you add a view here later, add it to this list too.
-- ─────────────────────────────────────────────────────────────

REVOKE ALL ON public.v_daily_active_users      FROM anon, authenticated;
REVOKE ALL ON public.v_retention_by_cohort     FROM anon, authenticated;
REVOKE ALL ON public.v_onboarding_funnel       FROM anon, authenticated;
REVOKE ALL ON public.v_notification_funnel     FROM anon, authenticated;
REVOKE ALL ON public.v_daily_challenge_funnel  FROM anon, authenticated;
REVOKE ALL ON public.v_paywall_funnel          FROM anon, authenticated;
REVOKE ALL ON public.v_dead_ends               FROM anon, authenticated;
REVOKE ALL ON public.v_study_mode_mix          FROM anon, authenticated;

-- The table itself: insert only, never read, for app-facing roles.
REVOKE ALL     ON public.app_events FROM anon, authenticated;
GRANT  INSERT  ON public.app_events TO   anon, authenticated;
