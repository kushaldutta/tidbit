-- FSRS repetition count never had a column here. rowToState hardcoded reps to 0,
-- so every pullFromCloud overwrote the local value and two things broke:
--
--   1. A card with real review history came back looking unstudied, which is
--      what made Topic Breakdown report finished sections as "Not started".
--   2. Worse, scheduleReview branches on `prev.reps === 0` to detect a first
--      encounter, so the next review of any cloud-pulled card reset its
--      stability to the initial value and threw away its memory strength.
--
-- total_seen is the closest proxy available for rows written before this column
-- existed. It over-counts slightly (saves and re-shows bump it too), but any
-- non-zero value is enough to keep scheduleReview out of the first-review branch,
-- which is the damaging part.

ALTER TABLE public.user_card_state
  ADD COLUMN IF NOT EXISTS reps INTEGER NOT NULL DEFAULT 0;

UPDATE public.user_card_state
   SET reps = total_seen
 WHERE reps = 0
   AND total_seen > 0;
