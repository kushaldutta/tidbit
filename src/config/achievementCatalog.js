/**
 * Client-side achievement catalog.
 *
 * The `achievements` table is the source of truth for titles and coin values;
 * this file exists so the Achievements screen can render LOCKED rows without a
 * second round trip, and so icons come from src/components/Icon.js rather than
 * the emoji stored in `achievements.icon` (emoji are for notification copy).
 *
 * Rule: only list achievements the app can actually award. Anything here that
 * nothing unlocks is a promise to the user we do not keep.
 *
 * Deliberately absent — no award path yet (rows still exist in the DB):
 *   section_dominance, study_blitz — need class-level aggregation.
 * Retired in migration 048 (game modes cut before v3.0.0):
 *   dungeon_diver, board_claimer.
 */

export const ACHIEVEMENTS = [
  {
    slug: '7_day_streak',
    title: '7-Day Streak',
    description: 'Studied 7 days in a row',
    icon: 'streak',
    coins: 20,
  },
  {
    slug: 'first_100_mastered',
    title: 'Century',
    description: 'Mastered 100 cards',
    icon: 'mastered',
    coins: 30,
  },
  {
    slug: 'daily_challenger',
    title: 'Daily Challenger',
    description: 'Completed a Daily Class Challenge',
    icon: 'dailyChallenge',
    coins: 5,
  },
  {
    slug: 'speed_demon',
    title: 'Speed Demon',
    description: 'Scored 15+ correct in a Speed Run',
    icon: 'speedRun',
    coins: 15,
  },
  {
    slug: 'night_owl',
    title: 'Night Owl',
    description: 'Studied after midnight on 3 nights',
    icon: 'quietHours',
    coins: 10,
  },
  {
    slug: 'runner_1k',
    title: 'On the Run',
    description: 'Ran 1000m in Infinite Runner',
    icon: 'runner',
    coins: 15,
  },
  {
    slug: 'first_duel',
    title: 'First Blood',
    description: 'Played your first Speed Duel',
    icon: 'speedDuel',
    coins: 10,
  },
  {
    slug: 'duel_win',
    title: 'Warlord',
    description: 'Won a Speed Duel',
    icon: 'trophy',
    coins: 15,
  },
  {
    slug: 'warlord_3',
    title: 'Warlord III',
    description: 'Won 3 Speed Duels',
    icon: 'trophy',
    coins: 25,
  },
];

export const ACHIEVEMENT_BY_SLUG = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.slug, a]),
);

/** Total coins available from achievements — shown as the progress denominator. */
export const TOTAL_ACHIEVEMENT_COINS = ACHIEVEMENTS.reduce((sum, a) => sum + a.coins, 0);
