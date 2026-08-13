/**
 * Shared catalog for live game modes.
 * game_type strings are stored on game_challenges / game_runs — never migrate to add a mode.
 */
export const GAME_TYPE = {
  DAILY_CHALLENGE: 'daily_challenge',
  SPEED_RUN: 'speed_run',
  MATCH: 'match',
  SPEED_DUEL: 'speed_duel',
  WORDLE: 'wordle',
  JEOPARDY: 'jeopardy',
  BATTLE_ROYALE: 'battle_royale',
  DUNGEON: 'dungeon',
  RUNNER: 'runner',
  TOWER_DEFENSE: 'tower_defense',
  RHYTHM: 'rhythm',
  BOSS: 'boss',
  CITY: 'city',
};

export const GAME_CATALOG = [
  {
    type: GAME_TYPE.DAILY_CHALLENGE,
    emoji: '⚡',
    title: 'Daily Challenge',
    subtitle: 'Same 10 cards as your class · recall first',
    route: 'DailyChallenge',
  },
  {
    type: GAME_TYPE.SPEED_DUEL,
    emoji: '⚔️',
    title: 'Speed Duel',
    subtitle: 'Challenge a classmate · same 10 cards · race',
    route: 'SpeedDuel',
  },
  {
    type: GAME_TYPE.SPEED_RUN,
    emoji: '💨',
    title: 'Speed Run',
    subtitle: '60 or 90s blitz on a deck',
    route: 'LearnModePicker',
  },
  {
    type: GAME_TYPE.MATCH,
    emoji: '🧩',
    title: 'Match',
    subtitle: 'Tap-to-pair · class leaderboard',
    route: 'LearnModePicker',
  },
  {
    type: GAME_TYPE.RUNNER,
    emoji: '🏃',
    title: 'Infinite Runner',
    subtitle: 'Dodge with the right term',
    route: 'InfiniteRunner',
  },
];
