/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      /* Design System v2: Bricolage Grotesque everywhere. `numeral` is
         retired as a face — it maps to Bricolage, and index.css gives
         .font-numeral its 500 weight + tabular figures. Libre Baskerville
         (`exam`) is for Exam mode and quoted model answers only. */
      fontFamily: {
        sans: ['"Bricolage Grotesque"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        numeral: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        exam: ['"Libre Baskerville"', 'Georgia', 'serif'],
      },
      /* Type scale (README "Type scale"). Nothing below 12px. */
      fontSize: {
        display: ['60px', { lineHeight: '1', fontWeight: '600', letterSpacing: '-0.035em' }],
        'display-xl': ['60px', { lineHeight: '1', fontWeight: '600', letterSpacing: '-0.035em' }],
        'display-l': ['40px', { lineHeight: '1.05', fontWeight: '600', letterSpacing: '-0.025em' }],
        h1: ['40px', { lineHeight: '1.05', fontWeight: '600', letterSpacing: '-0.025em' }],
        'display-m': ['30px', { lineHeight: '1.12', fontWeight: '600', letterSpacing: '-0.015em' }],
        h2: ['30px', { lineHeight: '1.12', fontWeight: '600', letterSpacing: '-0.015em' }],
        title: ['22px', { lineHeight: '1.25', fontWeight: '600', letterSpacing: '-0.01em' }],
        subtitle: ['18px', { lineHeight: '1.35', fontWeight: '600' }],
        section: ['16px', { lineHeight: '1.3', fontWeight: '600' }],
        'body-l': ['16px', { lineHeight: '1.6' }],
        'body-base': ['15px', { lineHeight: '1.6' }],
        'body-s': ['14px', { lineHeight: '1.5' }],
        label: ['13px', { lineHeight: '1.4', fontWeight: '600' }],
        caption: ['12px', { lineHeight: '1.4', fontWeight: '400' }],
        eyebrow: ['12px', { lineHeight: '1.2', fontWeight: '600', letterSpacing: '0.06em' }],
        'num-xl': ['52px', { lineHeight: '1', fontWeight: '500', letterSpacing: '-0.02em' }],
        'num-l': ['32px', { lineHeight: '1.15', fontWeight: '500', letterSpacing: '-0.01em' }],
        'num-m': ['28px', { lineHeight: '1.15', fontWeight: '500' }],
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
        spring: 'var(--ease-spring)',
        slide: 'var(--ease-slide)',
      },
      transitionDuration: {
        state: '120ms',
        press: '80ms',
        enter: '240ms',
        overlay: '320ms',
        slide: '320ms',
        fill: '700ms',
        celebrate: '900ms',
      },
      colors: {
        /* role-named tokens — resolve to the CSS vars in index.css.
           The .glass→.surface sweep is done; the legacy-alias remap
           is still a later reviewed pass. */
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
        info: {
          text: 'var(--info-text)',
          soft: 'var(--info-soft)',
        },
        focus: 'var(--focus)',
        track: 'var(--track)',
        scrim: 'var(--scrim)',

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
      /* The 'enter' motion as a CSS animation, for places framer-motion
         doesn't reach (Modal). See src/components/motion/variants.ts. */
      animation: {
        'fade-in': 'enter 420ms var(--ease-spring) both',
        enter: 'enter 420ms var(--ease-spring) both',
      },
      keyframes: {
        enter: {
          from: { opacity: '0', transform: 'translateY(12px) scale(.98)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
