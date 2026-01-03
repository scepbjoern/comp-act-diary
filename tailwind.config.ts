import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: {
          light: '#f8fafc',
          DEFAULT: '#0f172a',
        },
        surface: {
          light: '#ffffff',
          DEFAULT: '#1e293b',
        },
        primary: {
          DEFAULT: '#38bdf8',
          foreground: '#0f172a',
        },
        muted: {
          light: '#e2e8f0',
          DEFAULT: '#475569',
        },
        pill: {
          light: 'rgb(241 245 249)',
          DEFAULT: 'rgb(241 245 249 / 0.2)',
        },
        border: {
          light: '#e2e8f0',
          DEFAULT: '#475569',
        },
      },
      backgroundColor: {
        'surface/60': 'rgba(30, 41, 59, 0.6)',
        'surface/80': 'rgba(30, 41, 59, 0.8)',
      },
      borderRadius: {
        pill: '9999px',
      },
    },
  },
  variants: {
    extend: {
      backgroundColor: ['dark'],
      textColor: ['dark'],
      borderColor: ['dark'],
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('daisyui'),
  ],
  daisyui: {
    themes: [
      {
        light: {
          'primary': '#0ea5e9',
          'primary-focus': '#0284c7',
          'primary-content': '#ffffff',
          'base-100': '#f8fafc',
          'base-200': '#f1f5f9',
          'base-300': '#e2e8f0',
          'base-content': '#1e293b',
          'neutral': '#64748b',
          'neutral-content': '#f8fafc',
          'info': '#0ea5e9',
          'success': '#10b981',
          'warning': '#f59e0b',
          'error': '#ef4444',
        },
      },
      {
        dark: {
          'primary': '#38bdf8',
          'primary-focus': '#0ea5e9',
          'primary-content': '#ffffff',
          'base-100': '#0f172a',
          'base-200': '#1e293b',
          'base-300': '#334155',
          'base-content': '#f1f5f9',
          'neutral': '#475569',
          'neutral-content': '#f8fafc',
          'info': '#38bdf8',
          'success': '#22c55e',
          'warning': '#fbbf24',
          'error': '#f87171',
        },
      },
    ],
    darkTheme: 'dark',
    base: true,
    styled: true,
    utils: true,
  },
}
export default config
