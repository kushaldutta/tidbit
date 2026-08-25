-- Migration 048: retire achievements for game modes that were cut before v3.0.0.
--
-- DungeonScreen / JeopardyScreen / DailyTermScreen were built but never routed
-- in App.js and never appeared in GAME_CATALOG, so no user could reach them.
-- The code is deleted; drop the catalog rows so the in-app Achievements screen
-- does not advertise anything unearnable.
--
-- ON DELETE CASCADE on user_achievements.achievement_slug clears any stray
-- rows, though none are expected (the screens were unreachable in every build).

DELETE FROM public.achievements
WHERE slug IN ('dungeon_diver', 'board_claimer');

-- Left in place deliberately: 'section_dominance' and 'study_blitz' are class
-- achievements with no award path yet. They are excluded from the client
-- catalog (src/config/achievementCatalog.js) until group aggregation lands.
