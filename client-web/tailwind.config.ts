import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Graphik', 'system-ui', 'sans-serif'],
      },
      colors: {
        'rdc-blue': '#006AFF',
        'rdc-blue-dark': '#0050CC',
        'rdc-text': '#1C2733',
        'rdc-text-secondary': '#55687A',
        'rdc-border': '#D6DEE6',
        'rdc-surface': '#F5F7FA',
        'rdc-sidebar': '#1C2733',
        'rdc-sidebar-text': '#FFFFFF',
        'rdc-sidebar-active': '#006AFF',
      },
      width: {
        sidebar: '220px',
      },
    },
  },
  plugins: [],
} satisfies Config
