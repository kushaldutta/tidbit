-- Add term column to tidbits for flashcard-style term/definition format.
-- Nullable so all existing rows are unaffected and the app can fall back gracefully.

ALTER TABLE tidbits ADD COLUMN IF NOT EXISTS term text;
