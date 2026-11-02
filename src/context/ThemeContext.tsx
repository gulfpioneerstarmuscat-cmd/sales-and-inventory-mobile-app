import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ThemeColors,
  ThemeMode,
  DARK_THEME_COLORS,
  LIGHT_THEME_COLORS,
  getShadows,
} from '../styles/theme';

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  isDark: boolean;
  colors: ThemeColors;
  shadows: ReturnType<typeof getShadows>;
}

const THEME_STORAGE_KEY = '@app_theme_mode';

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'dark',
  setThemeMode: async () => {},
  isDark: true,
  colors: DARK_THEME_COLORS,
  shadows: getShadows(true),
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'auto') {
          setThemeModeState(stored);
        }
      } catch (e) {
        console.warn('Failed to load theme preference', e);
      }
    })();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.warn('Failed to save theme preference', e);
    }
  };

  const isDark =
    themeMode === 'auto'
      ? systemColorScheme === 'light'
        ? false
        : true
      : themeMode === 'dark';

  const colors = isDark ? DARK_THEME_COLORS : LIGHT_THEME_COLORS;
  const shadows = getShadows(isDark);

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, isDark, colors, shadows }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
