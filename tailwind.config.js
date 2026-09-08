/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Instrument Serif', 'Georgia', 'serif'],
        numeral: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        'display-xl': ['54px', { lineHeight: '1', fontWeight: '400', letterSpacing: '-0.022em' }],
        'display-l': ['40px', { lineHeight: '1.05', fontWeight: '400', letterSpacing: '-0.02em' }],
        'display-m': ['30px', { lineHeight: '1.1', fontWeight: '400', letterSpacing: '-0.015em' }],
        title: ['22px', { lineHeight: '1.25', fontWeight: '600', letterSpacing: '-0.012em' }],
        subtitle: ['18px', { lineHeight: '1.35', fontWeight: '600' }],
        'body-l': ['16px', { lineHeight: '1.6' }],
        'body-base': ['15px', { lineHeight: '1.55' }],
        'body-s': ['14px', { lineHeight: '1.5' }],
        label: ['13px', { lineHeight: '1.4', fontWeight: '600' }],
        eyebrow: ['11px', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '0.16em' }],
      },
      borderRadius: {
        control: 'var(--radius-control)',
        card: 'var(--radius-card)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        overlay: 'var(--shadow-overlay)',
      },
      transitionTimingFunction: {
        smooth: 'var(--ease)',
        'smooth-out': 'var(--ease-out)',
      },
      transitionDuration: {
        state: '120ms',
        enter: '200ms',
        overlay: '320ms',
        celebrate: '600ms',
      },
      colors: {
        /* role-named tokens — resolve to the CSS vars in index.css.
           Additive; the .glass→.surface sweep and legacy-alias remap
           are a later reviewed pass. */
        bg: 'var(--bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          raised: 'var(--surface-raised)',
          recessed: 'var(--surface-recessed)',
        },
        hairline: {
          DEFAULT: 'var(--hairline)',
          strong: 'var(--hairline-strong)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          muted: 'var(--ink-muted)',
          subtle: 'var(--ink-subtle)',
        },
        action: {
          DEFAULT: 'var(--action)',
          hover: 'var(--action-hover)',
          press: 'var(--action-press)',
          ink: 'var(--action-ink)',
          text: 'var(--action-text)',
          soft: 'var(--action-soft)',
        },
        progress: {
          DEFAULT: 'var(--progress)',
          text: 'var(--progress-text)',
          soft: 'var(--progress-soft)',
        },
        reward: {
          DEFAULT: 'var(--reward)',
          text: 'var(--reward-text)',
          soft: 'var(--reward-soft)',
        },
        streak: {
          DEFAULT: 'var(--streak)',
          text: 'var(--streak-text)',
        },
        correction: {
          DEFAULT: 'var(--correction)',
          text: 'var(--correction-text)',
          soft: 'var(--correction-soft)',
        },
        focus: 'var(--focus)',
        track: 'var(--track)',

        /* legacy, colour-named — unchanged values, kept compiling until
           the sweep remaps them per README's alias table, then deleted. */
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
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        shake: 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
        'wave-pulse': 'wavePulse 1.2s ease-in-out infinite',
      },
      keyframes: {
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
        wavePulse: {
          '0%, 100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
