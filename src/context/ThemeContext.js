import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService } from '../services/AuthService';
import { ProfileService } from '../services/ProfileService';
import { semantic, neutral } from '../theme/tokens';

const THEME_KEY = '@tidbit:app_theme';

/**
 * Surface/text tokens shared by every light theme. Screens should read
 * `theme.border` / `theme.textMuted` rather than hardcoding hexes — that is what
 * kept the old indigo bleeding through on non-default themes.
 */
const LIGHT_SURFACES = {
  border: neutral[200],
  borderStrong: neutral[300],
  textMuted: neutral[400],
  surfaceAlt: neutral[100],
  overlay: 'rgba(17, 24, 39, 0.45)',
  isDark: false,
};

const DARK_SURFACES = {
  border: '#2b2840',
  borderStrong: '#3d3956',
  textMuted: '#6b7280',
  surfaceAlt: '#241f38',
  overlay: 'rgba(0, 0, 0, 0.6)',
  isDark: true,
};

/** Every theme gets the same semantic colors — correctness never changes hue. */
function buildTheme(base, surfaces = LIGHT_SURFACES) {
  return { ...surfaces, ...semantic, ...base };
}

export const THEMES = {
  default: buildTheme({
    id: 'default',
    label: 'Classic',
    primary: '#6366f1',
    primaryDark: '#4338ca',
    primaryLight: '#eef2ff',
    accent: '#a5b4fc',
    background: '#f9fafb',
    card: '#ffffff',
    text: '#111827',
    textSecondary: '#6b7280',
    tabBar: '#ffffff',
    tabBarActive: '#6366f1',
  }),
  midnight: buildTheme(
    {
      id: 'midnight',
      label: 'Midnight',
      primary: '#818cf8',
      primaryDark: '#6366f1',
      primaryLight: '#1e1b4b',
      accent: '#c7d2fe',
      background: '#0f0e1a',
      card: '#1a1829',
      text: '#f1f5f9',
      textSecondary: '#94a3b8',
      tabBar: '#1a1829',
      tabBarActive: '#818cf8',
      // Semantic colors need more lift against a dark surface, and the
      // "on-tint" text colors invert entirely (light text on a dark tint).
      success: '#4ade80',
      successBg: '#14301f',
      successText: '#bbf7d0',
      warning: '#fbbf24',
      warningBg: '#3a2c0a',
      warningText: '#fde68a',
      danger: '#f87171',
      dangerBg: '#3b1616',
      dangerText: '#fecaca',
      info: '#38bdf8',
      infoBg: '#0c2b3d',
      infoText: '#bae6fd',
    },
    DARK_SURFACES
  ),
  forest: buildTheme({
    id: 'forest',
    label: 'Forest',
    primary: '#16a34a',
    primaryDark: '#15803d',
    primaryLight: '#f0fdf4',
    accent: '#86efac',
    background: '#f9fafb',
    card: '#ffffff',
    text: '#111827',
    textSecondary: '#6b7280',
    tabBar: '#ffffff',
    tabBarActive: '#16a34a',
  }),
  sunset: buildTheme({
    id: 'sunset',
    label: 'Sunset',
    primary: '#f97316',
    primaryDark: '#ea580c',
    primaryLight: '#fff7ed',
    accent: '#fdba74',
    background: '#fff7f5',
    card: '#ffffff',
    text: '#111827',
    textSecondary: '#6b7280',
    tabBar: '#ffffff',
    tabBarActive: '#f97316',
  }),
  ocean: buildTheme({
    id: 'ocean',
    label: 'Ocean',
    primary: '#0ea5e9',
    primaryDark: '#0284c7',
    primaryLight: '#f0f9ff',
    accent: '#7dd3fc',
    background: '#f0f9ff',
    card: '#ffffff',
    text: '#0c4a6e',
    textSecondary: '#0369a1',
    tabBar: '#ffffff',
    tabBarActive: '#0ea5e9',
  }),
};

const ThemeContext = createContext({
  theme: THEMES.default,
  setThemeId: () => {},
});

function isValidThemeId(id) {
  return Boolean(id && THEMES[id]);
}

export function ThemeProvider({ children }) {
  const [themeId, setThemeIdState] = useState('default');

  const applyThemeId = useCallback(async (id, { persistLocal = true } = {}) => {
    const next = isValidThemeId(id) ? id : 'default';
    setThemeIdState(next);
    if (persistLocal) {
      await AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
    }
  }, []);

  const loadThemeForSession = useCallback(async () => {
    if (!AuthService.isAuthenticated()) {
      await applyThemeId('default');
      return;
    }

    try {
      const profile = await ProfileService.getMyProfile();
      if (isValidThemeId(profile?.theme)) {
        await applyThemeId(profile.theme);
        return;
      }
    } catch {
      // Fall back to local cache below.
    }

    const saved = await AsyncStorage.getItem(THEME_KEY).catch(() => null);
    if (isValidThemeId(saved)) {
      await applyThemeId(saved);
      if (AuthService.isAuthenticated()) {
        ProfileService.upsertProfile({ theme: saved }).catch(() => {});
      }
      return;
    }

    await applyThemeId('default');
  }, [applyThemeId]);

  useEffect(() => {
    loadThemeForSession();
    const unsubscribe = AuthService.onAuthChange(() => {
      loadThemeForSession();
    });
    return unsubscribe;
  }, [loadThemeForSession]);

  const setThemeId = async (id) => {
    if (!isValidThemeId(id)) return;
    await applyThemeId(id);
    if (AuthService.isAuthenticated()) {
      ProfileService.upsertProfile({ theme: id }).catch((err) => {
        console.warn('[THEME] Failed to save theme to account:', err.message);
      });
    }
  };

  return (
    <ThemeContext.Provider value={{ theme: THEMES[themeId], setThemeId, themeId }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
