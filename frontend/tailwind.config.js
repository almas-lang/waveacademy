/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Deep slate/navy - sophisticated primary (also used as fallback)
        slate: {
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
          950: '#020617',
        },
        // Primary colors (Deep Teal)
        primary: {
          50: '#e6f4f7',
          100: '#cce9ef',
          200: '#99d3df',
          300: '#66bdcf',
          400: '#33a7bf',
          500: '#195E72',
          600: '#155163',
          700: '#114454',
          800: '#0d3745',
          900: '#092a36',
        },
        // Accent colors (Warm Coral)
        accent: {
          50: '#fff1ef',
          100: '#ffe3df',
          200: '#ffc7bf',
          300: '#ffab9f',
          400: '#ff8b7b',
          500: '#FF6B57',
          600: '#e55a47',
          700: '#cc4937',
          800: '#b23827',
          900: '#992717',
        },
        // Gold (for highlights, awards)
        gold: {
          50: '#fdf8eb',
          100: '#fbf1d7',
          200: '#f7e3af',
          300: '#f3d587',
          400: '#efc75f',
          500: '#E8A93A',
          600: '#c99030',
          700: '#aa7726',
          800: '#8b5e1c',
          900: '#6c4512',
        },
        // Neutrals
        charcoal: '#333333',
        carbon: '#333333',
        surface: '#FFFFFF',
        background: '#F7F7F7',
        // Gold highlight for premium elements
        highlight: '#E8A93A',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      boxShadow: {
        'soft': '0 2px 8px -2px rgba(0, 0, 0, 0.05), 0 4px 16px -4px rgba(0, 0, 0, 0.08)',
        'elevated': '0 4px 12px -2px rgba(0, 0, 0, 0.08), 0 8px 24px -4px rgba(0, 0, 0, 0.12)',
        'inner-soft': 'inset 0 1px 2px rgba(0, 0, 0, 0.04)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shake': 'shake 0.5s ease-in-out',
        'pulse-once': 'pulseOnce 0.3s ease-out',
        'check-draw': 'checkDraw 0.3s ease-out forwards',
        'error-pulse': 'errorPulse 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
        pulseOnce: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
        checkDraw: {
          '0%': { strokeDashoffset: '24' },
          '100%': { strokeDashoffset: '0' },
        },
        errorPulse: {
          '0%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.4)' },
          '70%': { boxShadow: '0 0 0 6px rgba(239, 68, 68, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)' },
        },
      },
    },
  },
  plugins: [],
};
