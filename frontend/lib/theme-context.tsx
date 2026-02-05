'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { themes, Theme, ThemeId, defaultTheme } from './themes';

interface ThemeContextType {
  theme: Theme;
  themeId: ThemeId;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'lms-admin-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
    if (stored && themes[stored]) {
      setThemeId(stored);
    }
    setMounted(true);
  }, []);

  // Apply CSS variables when theme changes
  useEffect(() => {
    if (!mounted) return;

    const theme = themes[themeId];
    const root = document.documentElement;

    // Set CSS variables
    root.style.setProperty('--color-primary-50', theme.colors.primary[50]);
    root.style.setProperty('--color-primary-100', theme.colors.primary[100]);
    root.style.setProperty('--color-primary-200', theme.colors.primary[200]);
    root.style.setProperty('--color-primary-300', theme.colors.primary[300]);
    root.style.setProperty('--color-primary-400', theme.colors.primary[400]);
    root.style.setProperty('--color-primary-500', theme.colors.primary[500]);
    root.style.setProperty('--color-primary-600', theme.colors.primary[600]);
    root.style.setProperty('--color-primary-700', theme.colors.primary[700]);
    root.style.setProperty('--color-primary-800', theme.colors.primary[800]);
    root.style.setProperty('--color-primary-900', theme.colors.primary[900]);

    root.style.setProperty('--color-accent-50', theme.colors.accent[50]);
    root.style.setProperty('--color-accent-100', theme.colors.accent[100]);
    root.style.setProperty('--color-accent-200', theme.colors.accent[200]);
    root.style.setProperty('--color-accent-300', theme.colors.accent[300]);
    root.style.setProperty('--color-accent-400', theme.colors.accent[400]);
    root.style.setProperty('--color-accent-500', theme.colors.accent[500]);
    root.style.setProperty('--color-accent-600', theme.colors.accent[600]);
    root.style.setProperty('--color-accent-700', theme.colors.accent[700]);
    root.style.setProperty('--color-accent-800', theme.colors.accent[800]);
    root.style.setProperty('--color-accent-900', theme.colors.accent[900]);

    root.style.setProperty('--color-text', theme.colors.text);
    root.style.setProperty('--color-text-muted', theme.colors.textMuted);
    root.style.setProperty('--color-background', theme.colors.background);
    root.style.setProperty('--color-surface', theme.colors.surface);
    root.style.setProperty('--color-border', theme.colors.border);

    if (theme.colors.highlight) {
      root.style.setProperty('--color-highlight', theme.colors.highlight);
    }

    // Set data attribute for potential CSS targeting
    root.setAttribute('data-theme', themeId);

    // Save to localStorage
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  }, [themeId, mounted]);

  const setTheme = (id: ThemeId) => {
    setThemeId(id);
  };

  // Prevent flash of unstyled content
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme: themes[themeId], themeId, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
