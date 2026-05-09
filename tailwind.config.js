/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        navy: {
          DEFAULT: '#0A0C10',
          50: '#0E1117',
          100: '#12151C',
          200: '#161A23',
          300: '#1C2029',
          400: '#232730',
          500: '#2A2E38',
          600: '#343842',
          700: '#42464F',
          800: '#52565F',
          900: '#6B6F78',
        },
        violet: {
          electric: '#7C3AED',
        },
        emerald: {
          fluency: '#10B981',
        },
        gold: {
          achievement: '#F59E0B',
        },
      },
      animation: {
        blob: 'blob 12s ease-in-out infinite',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        shake: 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        'wave-pulse': 'wavePulse 1.2s ease-in-out infinite',
        'liquid-wave': 'liquidWave 2s ease-in-out infinite',
        'aurora-shift': 'auroraShift 12s ease-in-out infinite',
        'icon-glow': 'iconGlow 2s ease-in-out infinite',
      },
      keyframes: {
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(30px, -20px) scale(1.05)' },
          '50%': { transform: 'translate(-20px, 30px) scale(0.95)' },
          '75%': { transform: 'translate(20px, 20px) scale(1.02)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shake: {
          '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(4px, 0, 0)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 12px rgba(124, 58, 237, 0.3)' },
          '50%': { boxShadow: '0 0 24px rgba(124, 58, 237, 0.6)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        wavePulse: {
          '0%, 100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
        liquidWave: {
          '0%, 100%': { backgroundPosition: '0% 0' },
          '50%': { backgroundPosition: '100% 0' },
        },
        auroraShift: {
          '0%': { backgroundPosition: '0% 0%' },
          '50%': { backgroundPosition: '100% 100%' },
          '100%': { backgroundPosition: '0% 0%' },
        },
        iconGlow: {
          '0%, 100%': { filter: 'drop-shadow(0 0 4px currentColor) drop-shadow(0 0 8px currentColor)' },
          '50%': { filter: 'drop-shadow(0 0 8px currentColor) drop-shadow(0 0 16px currentColor)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
