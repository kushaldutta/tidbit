/**
 * Design tokens — the values that do NOT change between themes.
 *
 * Theme-varying colors (primary, background, card, text) live in ThemeContext.
 * Everything here is shared: spacing rhythm, radii, type scale, semantic colors.
 *
 * Rule of thumb: if you are about to type a raw hex or a magic number into a
 * StyleSheet, it probably belongs here instead.
 */

/** 4pt spacing rhythm. Use these instead of arbitrary padding numbers. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

/** Corner radii. `card` is the default for surfaces, `pill` for chips/badges. */
export const radius = {
  sm: 8,
  md: 12,
  card: 16,
  lg: 20,
  pill: 999,
};

/**
 * Type scale. Pair `size` with `weight` and `lineHeight` from the same step so
 * text blocks stay on a consistent vertical rhythm.
 */
export const type = {
  display: { fontSize: 32, fontWeight: '700', lineHeight: 38 },
  title: { fontSize: 24, fontWeight: '700', lineHeight: 30 },
  heading: { fontSize: 19, fontWeight: '700', lineHeight: 25 },
  subheading: { fontSize: 17, fontWeight: '600', lineHeight: 23 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 23 },
  bodyStrong: { fontSize: 16, fontWeight: '600', lineHeight: 23 },
  callout: { fontSize: 15, fontWeight: '400', lineHeight: 21 },
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  /** All-caps section labels ("CLASS PRESET DECKS"). */
  overline: { fontSize: 12, fontWeight: '700', lineHeight: 16, letterSpacing: 0.6 },
  /** Big numbers in stat tiles. */
  stat: { fontSize: 28, fontWeight: '700', lineHeight: 32 },
};

/**
 * Semantic colors — meaning, not decoration.
 *
 * Use `success`/`danger` for correctness feedback only. Do NOT use `danger` for
 * low-progress numbers: a 0% readiness score is a prompt, not an error.
 * Reach for `warning` or `textMuted` there instead.
 */
export const semantic = {
  success: '#16a34a',
  successBg: '#f0fdf4',
  successText: '#14532d',
  warning: '#f59e0b',
  warningBg: '#fff7ed',
  warningText: '#9a3412',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  dangerText: '#991b1b',
  info: '#0ea5e9',
  infoBg: '#f0f9ff',
  infoText: '#075985',
};

/** Neutral ramp — light-theme surfaces and text. */
export const neutral = {
  0: '#ffffff',
  50: '#f9fafb',
  100: '#f3f4f6',
  200: '#e5e7eb',
  300: '#d1d5db',
  400: '#9ca3af',
  500: '#6b7280',
  700: '#374151',
  900: '#111827',
};

/** Elevation. `card` is subtle by design — most surfaces need borders, not shadows. */
export const elevation = {
  none: {},
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  raised: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
};

/** Standard sizes so icons stay optically consistent across screens. */
export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  hero: 40,
};

/** Durations for Animated transitions, in ms. */
export const duration = {
  fast: 150,
  base: 200,
  slow: 320,
};

export default { spacing, radius, type, semantic, neutral, elevation, iconSize, duration };
