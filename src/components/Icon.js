/**
 * Icon — the single icon entry point for the app.
 *
 * Use this instead of emoji anywhere an icon is a system affordance (tab bars,
 * list rows, buttons, stat tiles). Emoji stay ONLY where they are user
 * expression: deck cover emoji and feed reaction chips.
 *
 * Names are semantic (what it means), not visual (what it looks like), so
 * screens read as `<Icon name="streak" />` rather than `<Icon name="flame" />`.
 * That way the glyph can change later without touching call sites.
 *
 *   <Icon name="streak" size={iconSize.md} color={theme.primary} />
 *   <Icon name="home" filled />        // solid variant for active tab state
 */
import React from 'react';
// Import the family directly, NOT `{ Ionicons } from '@expo/vector-icons'`.
// The barrel re-exports every icon family, which pulls ~3.8 MB of unused .ttf
// files into the app bundle.
import Ionicons from '@expo/vector-icons/Ionicons';
import { iconSize } from '../theme/tokens';

/**
 * Semantic name → [outline, filled] Ionicons glyphs.
 * Every glyph below is verified against the Ionicons glyphmap.
 */
const ICONS = {
  // ─── Navigation / tabs ───────────────────────────────────────────────────
  home: ['home-outline', 'home'],
  study: ['book-outline', 'book'],
  categories: ['grid-outline', 'grid'],
  stats: ['stats-chart-outline', 'stats-chart'],
  settings: ['settings-outline', 'settings'],
  feed: ['newspaper-outline', 'newspaper'],

  // ─── Learn modes ─────────────────────────────────────────────────────────
  quiz: ['checkbox-outline', 'checkbox'],
  recall: ['create-outline', 'create'],
  match: ['extension-puzzle-outline', 'extension-puzzle'],
  speedRun: ['timer-outline', 'timer'],

  // ─── Games ───────────────────────────────────────────────────────────────
  games: ['game-controller-outline', 'game-controller'],
  dailyChallenge: ['flash-outline', 'flash'],
  speedDuel: ['people-outline', 'people'],
  runner: ['walk-outline', 'walk'],
  jeopardy: ['grid-outline', 'grid'],
  dungeon: ['shield-outline', 'shield'],
  wordle: ['text-outline', 'text'],

  // ─── Study objects ───────────────────────────────────────────────────────
  deck: ['albums-outline', 'albums'],
  decks: ['library-outline', 'library'],
  reviewQueue: ['layers-outline', 'layers'],
  studyPlan: ['clipboard-outline', 'clipboard'],
  classes: ['school-outline', 'school'],
  section: ['bookmark-outline', 'bookmark'],
  startLearning: ['rocket-outline', 'rocket'],

  // ─── Stats / progress ────────────────────────────────────────────────────
  streak: ['flame-outline', 'flame'],
  due: ['time-outline', 'time'],
  accuracy: ['locate-outline', 'locate'],
  seen: ['eye-outline', 'eye'],
  mastered: ['medal-outline', 'medal'],
  insights: ['trending-up-outline', 'trending-up'],
  exam: ['calendar-outline', 'calendar'],
  trophy: ['trophy-outline', 'trophy'],

  // ─── Social ──────────────────────────────────────────────────────────────
  group: ['people-circle-outline', 'people-circle'],
  members: ['people-outline', 'people'],
  buddy: ['person-add-outline', 'person-add'],
  profile: ['person-circle-outline', 'person-circle'],
  comment: ['chatbubble-outline', 'chatbubble'],

  // ─── Creation ────────────────────────────────────────────────────────────
  ai: ['sparkles-outline', 'sparkles'],
  snap: ['camera-outline', 'camera'],
  add: ['add-circle-outline', 'add-circle'],
  edit: ['pencil-outline', 'pencil'],

  // ─── System / affordances ────────────────────────────────────────────────
  notifications: ['notifications-outline', 'notifications'],
  quietHours: ['moon-outline', 'moon'],
  coins: ['diamond-outline', 'diamond'],
  chevron: ['chevron-forward', 'chevron-forward'],
  back: ['arrow-back', 'arrow-back'],
  close: ['close', 'close'],
  more: ['ellipsis-horizontal', 'ellipsis-horizontal'],
  check: ['checkmark-circle-outline', 'checkmark-circle'],
  wrong: ['close-circle-outline', 'close-circle'],
  info: ['information-circle-outline', 'information-circle'],
  warning: ['alert-circle-outline', 'alert-circle'],
  search: ['search-outline', 'search'],
  lock: ['lock-closed-outline', 'lock-closed'],
};

const FALLBACK = 'ellipse-outline';

export default function Icon({
  name,
  size = iconSize.md,
  color = '#111827',
  filled = false,
  style,
  ...rest
}) {
  const entry = ICONS[name];

  if (!entry && __DEV__) {
    console.warn(
      `[Icon] Unknown name "${name}". Add it to the ICONS map in src/components/Icon.js.`
    );
  }

  const glyph = entry ? (filled ? entry[1] : entry[0]) : FALLBACK;

  return (
    <Ionicons
      name={glyph}
      size={size}
      color={color}
      style={style}
      // Icons are decorative next to a visible label; keep them out of the a11y tree.
      accessibilityElementsHidden
      importantForAccessibility="no"
      {...rest}
    />
  );
}

/** Exported so screens can assert a name exists before rendering dynamic icons. */
export function hasIcon(name) {
  return Object.prototype.hasOwnProperty.call(ICONS, name);
}

export { ICONS };
