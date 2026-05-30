import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@tidbit:app_theme';

export const THEMES = {
  default: {
    id: 'default',
    label: 'Classic',
    emoji: '🟣',
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
  },
  midnight: {
    id: 'midnight',
    label: 'Midnight',
    emoji: '🌙',
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
  },
  forest: {
    id: 'forest',
    label: 'Forest',
    emoji: '🌿',
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
  },
  sunset: {
    id: 'sunset',
    label: 'Sunset',
    emoji: '🌅',
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
  },
  ocean: {
    id: 'ocean',
    label: 'Ocean',
    emoji: '🌊',
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
  },
};

const ThemeContext = createContext({
  theme: THEMES.default,
  setThemeId: () => {},
});

export function ThemeProvider({ children }) {
  const [themeId, setThemeIdState] = useState('default');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved && THEMES[saved]) setThemeIdState(saved);
    }).catch(() => {});
  }, []);

  const setThemeId = async (id) => {
    if (!THEMES[id]) return;
    setThemeIdState(id);
    await AsyncStorage.setItem(THEME_KEY, id).catch(() => {});
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
