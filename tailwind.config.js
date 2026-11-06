/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--ink) / 0.12)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        neon: 'rgb(var(--neon) / <alpha-value>)',
      },
      fontFamily: {
        display: ['Archivo', 'Arial Narrow', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      maxWidth: { page: '1360px' },
    },
  },
  plugins: [],
};
