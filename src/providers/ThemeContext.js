import React, { createContext, useContext, useState, useEffect } from 'react';
import { LIGHT_THEME, DARK_THEME, ACCENT_PRESETS, applyAccent } from '../constants/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

const THEME_KEY = '@theme_mode';
const ACCENT_KEY = '@accent_preset';

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const [accentKey, setAccentKey] = useState('indigo');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((val) => {
      if (val === 'dark') setIsDark(true);
    });
    AsyncStorage.getItem(ACCENT_KEY).then((val) => {
      if (val && ACCENT_PRESETS.some((p) => p.key === val)) setAccentKey(val);
    });
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
  };

  const setAccent = async (key) => {
    setAccentKey(key);
    await AsyncStorage.setItem(ACCENT_KEY, key);
  };

  const preset = ACCENT_PRESETS.find((p) => p.key === accentKey) || null;
  const base = isDark ? DARK_THEME : LIGHT_THEME;
  const theme = applyAccent(base, preset);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, accentKey, setAccent, accentPresets: ACCENT_PRESETS }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
