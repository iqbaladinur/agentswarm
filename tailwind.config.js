/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          0: '#0d0d0d',
          1: '#181818',
          2: '#202020',
          3: '#2a2a2a',
          4: '#333333',
        },
        border: '#3f3f46',
        accent: '#8b7cf7',
        'accent-dim': '#6b5de8',
        success: '#4ade80',
        warning: '#facc15',
        error: '#f87171',
        muted: '#9ca3af',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
