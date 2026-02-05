// Theme definitions for the LMS admin interface

export type ThemeId = 'slate-red' | 'teal-coral';

export interface ThemeColors {
  // Primary - main brand color for buttons, headers, icons
  primary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  // Accent - CTAs, badges, hover states
  accent: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  // Neutrals
  text: string;
  textMuted: string;
  background: string;
  surface: string;
  border: string;
  // Optional highlight (gold for premium elements)
  highlight?: string;
}

export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  colors: ThemeColors;
}

export const themes: Record<ThemeId, Theme> = {
  'slate-red': {
    id: 'slate-red',
    name: 'Slate & Red',
    description: 'Professional slate with bold red accents. Based on CCD brand colors.',
    colors: {
      primary: {
        50: '#f8fafc',
        100: '#f1f5f9',
        200: '#e2e8f0',
        300: '#cbd5e1',
        400: '#94a3b8',
        500: '#64748b',
        600: '#475569',
        700: '#334155',
        800: '#1e293b',
        900: '#0f172a',
      },
      accent: {
        50: '#fff1f2',
        100: '#ffe4e6',
        200: '#fecdd3',
        300: '#fda4af',
        400: '#fb7185',
        500: '#FF0023', // CCD brand red
        600: '#e6001f',
        700: '#be0019',
        800: '#9f0016',
        900: '#7f0012',
      },
      text: '#18181B', // Carbon
      textMuted: '#64748b',
      background: '#FAFAFA',
      surface: '#FFFFFF',
      border: '#e2e8f0',
    },
  },
  'teal-coral': {
    id: 'teal-coral',
    name: 'Teal & Coral',
    description: 'Warm and inviting with deep teal and coral accents.',
    colors: {
      primary: {
        50: '#f0f9fa',
        100: '#d4eef2',
        200: '#a9dde5',
        300: '#7ecbd8',
        400: '#4fb5c5',
        500: '#2a9aad',
        600: '#1f7d8f',
        700: '#195E72', // Deep Teal - main brand
        800: '#154d5e',
        900: '#113f4d',
      },
      accent: {
        50: '#fff5f3',
        100: '#ffe8e4',
        200: '#ffd4cc',
        300: '#ffb5a8',
        400: '#ff8f7d',
        500: '#FF6B57', // Warm Coral
        600: '#f04d38',
        700: '#d63a26',
        800: '#b32f1f',
        900: '#8f261a',
      },
      text: '#333333', // Charcoal
      textMuted: '#6b7280',
      background: '#F7F7F7', // Light Gray
      surface: '#FFFFFF',
      border: '#e5e5e5',
      highlight: '#E8A93A', // Gold for premium elements
    },
  },
};

export const defaultTheme: ThemeId = 'slate-red';

// Generate CSS variables from theme
export function generateThemeCSS(theme: Theme): string {
  const { colors } = theme;
  return `
    --color-primary-50: ${colors.primary[50]};
    --color-primary-100: ${colors.primary[100]};
    --color-primary-200: ${colors.primary[200]};
    --color-primary-300: ${colors.primary[300]};
    --color-primary-400: ${colors.primary[400]};
    --color-primary-500: ${colors.primary[500]};
    --color-primary-600: ${colors.primary[600]};
    --color-primary-700: ${colors.primary[700]};
    --color-primary-800: ${colors.primary[800]};
    --color-primary-900: ${colors.primary[900]};
    --color-accent-50: ${colors.accent[50]};
    --color-accent-100: ${colors.accent[100]};
    --color-accent-200: ${colors.accent[200]};
    --color-accent-300: ${colors.accent[300]};
    --color-accent-400: ${colors.accent[400]};
    --color-accent-500: ${colors.accent[500]};
    --color-accent-600: ${colors.accent[600]};
    --color-accent-700: ${colors.accent[700]};
    --color-accent-800: ${colors.accent[800]};
    --color-accent-900: ${colors.accent[900]};
    --color-text: ${colors.text};
    --color-text-muted: ${colors.textMuted};
    --color-background: ${colors.background};
    --color-surface: ${colors.surface};
    --color-border: ${colors.border};
    ${colors.highlight ? `--color-highlight: ${colors.highlight};` : ''}
  `;
}
