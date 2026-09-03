-- Migration 088: drop MATH 118 and MATH 126 from the Berkeley class list.
-- They are uncommon offerings and the catalog titles were wrong (118 is not
-- honors analysis; 126 is not mathematical logic). Related groups,
-- memberships, and first-join rows cascade from classes.

DELETE FROM public.classes
WHERE id IN (
  'uc-berkeley:math118:fa26',
  'uc-berkeley:math126:fa26'
);
