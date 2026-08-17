/**
 * Study Coin shop catalog.
 * Prices live here AND in purchase_cosmetic() — keep them in sync.
 */
export const SHOP_ITEM = {
  THEME_SUNSET: 'theme:sunset',
};

export const SHOP_ITEMS = {
  [SHOP_ITEM.THEME_SUNSET]: {
    id: SHOP_ITEM.THEME_SUNSET,
    kind: 'theme',
    themeId: 'sunset',
    emoji: '🌅',
    title: 'Sunset theme',
    blurb: 'Warm colors for late-night sessions',
    cost: 80,
  },
};

export const COMING_SOON_ITEMS = [
  { emoji: '🖼️', title: 'Avatar frame', cost: 50, blurb: 'Shows next to your name in class' },
  { emoji: '❤️', title: 'Duel extra life', cost: 40, blurb: 'One miss forgiven in Speed Duel' },
  { emoji: '🏅', title: 'Custom title', cost: 100, blurb: 'A badge on the class feed' },
];

/** Classic is always free. Coin-unlockable ids. Everything else is Premium. */
export const FREE_THEME_IDS = ['default'];
export const COIN_THEME_IDS = ['sunset'];

export function shopItemForTheme(themeId) {
  return Object.values(SHOP_ITEMS).find((item) => item.themeId === themeId) || null;
}

export function isThemeUnlocked(themeId, { isPremium, unlockedItemIds }) {
  if (!themeId || FREE_THEME_IDS.includes(themeId)) return true;
  if (isPremium) return true;
  const item = shopItemForTheme(themeId);
  if (item && unlockedItemIds?.includes(item.id)) return true;
  return false;
}
