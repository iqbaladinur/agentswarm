/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          0: '#0d0d0d',
          1: '#141414',
          2: '#1c1c1c',
          3: '#252525',
          4: '#2e2e2e',
        },
        border: '#2e2e2e',
        accent: '#7c6af7',
        'accent-dim': '#5b4fd4',
        success: '#4ade80',
        warning: '#facc15',
        error: '#f87171',
        muted: '#6b7280',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
