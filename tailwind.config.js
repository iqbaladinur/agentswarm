/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          0: '#0a0a0b',
          1: '#111114',
          2: '#1a1a1f',
          3: '#25252b',
          4: '#2e2e36',
        },
        border: {
          DEFAULT: '#2a2a33',
          soft: '#1f1f26',
          accent: '#3d3780',
        },
        accent: {
          DEFAULT: '#8b7cf7',
          dim: '#7262e3',
          bg: 'rgba(139,124,247,0.08)',
          'bg-hover': 'rgba(139,124,247,0.14)',
        },
        success: '#4ade80',
        warning: '#fbbf24',
        error: '#f87171',
        muted: '#727280',
        'muted-dim': '#4e4e5a',
        text: {
          primary: '#e4e4ed',
          secondary: '#9a9aab',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', '"Cascadia Code"', 'monospace'],
      },
      boxShadow: {
        dropdown: '0 4px 12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
        modal: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
        glow: '0 0 12px rgba(139,124,247,0.25)',
      },
      ringWidth: {
        focus: '2px',
      },
      ringColor: {
        focus: 'rgba(139,124,247,0.5)',
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'fade-in-up': 'fadeInUp 0.15s ease-out',
        'slide-left': 'slideLeft 0.15s ease-out',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideLeft: {
          '0%': { opacity: '0', transform: 'translateX(-2px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
    },
  },
  plugins: [],
}
