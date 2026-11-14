/**
 * Léo, the Junior character (junior-track §7): a fox with a violet scarf and five
 * states — listening, happy, celebrating, curious ("hmm?"), thinking. The state IS
 * the per-turn feedback: a learner who cannot read the one optional line still knows
 * how it went. The scarf and the features take the app's role tokens; the fur is
 * character art, so its colours are fixed and live in `FUR` below. Motion is the
 * design system's `enter` only: Léo settles in when his state changes — nothing
 * loops, bounces or glows, and reduced motion drops the rise.
 */
import { motion } from 'framer-motion';
import { enter } from '../../components/motion/variants';
import type { LeoState } from '../../domain/junior/types';
import { assetUrlFor } from './art/assets';
import { pictureFor } from './art/pictures';

const LABEL: Record<LeoState, string> = {
  listening: 'Léo is listening',
  happy: 'Léo is happy',
  celebrating: 'Léo is celebrating',
  curious: 'Léo is curious',
  thinking: 'Léo is thinking',
};

const SIZE = { sm: 'h-20 w-20', md: 'h-28 w-28', lg: 'h-40 w-40' } as const;

/** Fixed character colours (a fox is orange in light and dark). */
const FUR = {
  base: '#F28C38',
  shade: '#D96E22',
  cream: '#FFF3E2',
  inner: '#FFC9A3',
  blush: '#FF8A78',
  tongue: '#FF6F7D',
} as const;

interface Props {
  state: LeoState;
  size?: keyof typeof SIZE;
  /** An unlocked outfit (a sticker-set reward), by its bank key. Only the shades are drawn; any other is ignored. */
  accessory?: string | null;
}

function Sparkle({ cx, cy }: { cx: number; cy: number }) {
  return <path d={`M${cx} ${cy - 10} L${cx + 3} ${cy - 3} L${cx + 10} ${cy} L${cx + 3} ${cy + 3} L${cx} ${cy + 10} L${cx - 3} ${cy + 3} L${cx - 10} ${cy} L${cx - 3} ${cy - 3} Z`} className="fill-reward" />;
}

function Eyes({ state, shades }: { state: LeoState; shades: string | null }) {
  if (shades !== null) {
    return (
      <g data-testid="leo-accessory" data-accessory={shades}>
        <rect x="31" y="49" width="26" height="17" rx="7" className="fill-ink" />
        <rect x="63" y="49" width="26" height="17" rx="7" className="fill-ink" />
        <path d="M57 55h6" className="stroke-ink" strokeWidth="3" strokeLinecap="round" />
        <path d="M36 53h7M68 53h7" stroke="#fff" strokeOpacity=".45" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    );
  }
  if (state === 'celebrating') {
    return (
      <g className="fill-none stroke-ink" strokeWidth="3.5" strokeLinecap="round">
        <path d="M35 60q7-10 14 0" />
        <path d="M71 60q7-10 14 0" />
      </g>
    );
  }
  // Where the pupils look: up and aside when curious or thinking, ahead otherwise.
  const dx = state === 'curious' ? 1.5 : state === 'thinking' ? -1.5 : 0;
  const dy = state === 'thinking' ? -2 : state === 'curious' ? -1 : 0;
  return (
    <g>
      {[44, 76].map((cx) => (
        <g key={cx}>
          <ellipse cx={cx} cy="58" rx="6.5" ry="7.5" className="fill-ink" />
          <circle cx={cx + 2 + dx} cy={55.5 + dy} r="2.3" fill="#fff" />
        </g>
      ))}
    </g>
  );
}

function Mouth({ state }: { state: LeoState }) {
  switch (state) {
    case 'celebrating':
      return (
        <g>
          <path d="M49 82q11 17 22 0z" className="fill-ink" strokeLinejoin="round" />
          <ellipse cx="60" cy="90.5" rx="6" ry="3.4" fill={FUR.tongue} />
        </g>
      );
    case 'curious':
      return <ellipse cx="60" cy="87" rx="4.2" ry="5.2" className="fill-ink" />;
    case 'thinking':
      return <path d="M52 86q4-3 8 0t8 0" className="fill-none stroke-ink" strokeWidth="3" strokeLinecap="round" />;
    case 'listening':
      return <ellipse cx="60" cy="86" rx="6" ry="3.2" className="fill-ink" />;
    case 'happy':
      return <path d="M51 82q9 10 18 0" className="fill-none stroke-ink" strokeWidth="3.4" strokeLinecap="round" />;
  }
}

export function Leo({ state, size = 'md', accessory = null }: Props) {
  const listening = state === 'listening';
  const shades = accessory && pictureFor(accessory).id === 'shades' ? accessory : null;
  // A painted Léo saved as src/assets/junior/leo-<state>.png|webp|svg replaces the drawn one.
  const painted = assetUrlFor(`leo-${state}`);
  if (painted) {
    return (
      <div role="img" aria-label={LABEL[state]} data-testid="leo" data-state={state} className={`relative inline-block ${SIZE[size]}`}>
        <motion.img key={state} variants={enter} initial="hidden" animate="show" src={painted} alt="" draggable={false} className="h-full w-full object-contain" />
      </div>
    );
  }
  return (
    <div role="img" aria-label={LABEL[state]} data-testid="leo" data-state={state} className={`relative inline-block ${SIZE[size]}`}>
      <motion.svg key={state} variants={enter} initial="hidden" animate="show" viewBox="0 0 120 120" className="relative h-full w-full" aria-hidden="true">
        {/* ears — tall and turned out while he listens */}
        <g stroke={FUR.base} strokeWidth="6" strokeLinejoin="round" fill={FUR.base}>
          <path d={listening ? 'M13 44 L12 2 L52 33 Z' : 'M16 42 L19 9 L51 34 Z'} />
          <path d={listening ? 'M107 44 L108 2 L68 33 Z' : 'M104 42 L101 9 L69 34 Z'} />
        </g>
        <g fill={FUR.inner} stroke={FUR.inner} strokeWidth="2" strokeLinejoin="round">
          <path d={listening ? 'M21 36 L19 15 L40 31 Z' : 'M24 36 L25 20 L41 32 Z'} />
          <path d={listening ? 'M99 36 L101 15 L80 31 Z' : 'M96 36 L95 20 L79 32 Z'} />
        </g>
        {listening && (
          <g className="fill-none stroke-action" strokeWidth="3" strokeLinecap="round">
            <path d="M112 22q5 6 0 12" />
            <path d="M116 17q9 11 0 22" />
            <path d="M8 22q-5 6 0 12" />
            <path d="M4 17q-9 11 0 22" />
          </g>
        )}

        {/* head */}
        <path d="M60 104C33 104 11 86 11 63c0-21 21-33 49-33s49 12 49 33c0 23-22 41-49 41z" fill={FUR.base} />
        <path d="M60 102C41 102 24 91 21 74c12-8 28-4 39 6 11-10 27-14 39-6-3 17-20 28-39 28z" fill={FUR.cream} />

        {/* cheeks, eyes, nose, mouth */}
        <ellipse cx="32" cy="74" rx="7" ry="4.5" fill={FUR.blush} opacity=".5" />
        <ellipse cx="88" cy="74" rx="7" ry="4.5" fill={FUR.blush} opacity=".5" />
        <Eyes state={state} shades={shades} />
        {state === 'curious' && (
          <>
            <path d="M66 44q10-6 20-2" className="fill-none stroke-ink" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M34 47q10-2 18 2" className="fill-none stroke-ink" strokeWidth="3.2" strokeLinecap="round" />
          </>
        )}
        <path d="M54 75q6-3 12 0q-1 5-6 6.5q-5-1.5-6-6.5z" className="fill-ink" />
        <Mouth state={state} />

        {/* scarf — the app's action colour, so Léo wears the brand */}
        <path d="M30 100q30 14 60 0l5 9q-35 15-70 0z" className="fill-action" />
        <path d="M78 106l8 12q2 3 5 1l3-3-6-13z" className="fill-action-hover" />

        {state === 'celebrating' && (
          <>
            <Sparkle cx={12} cy={20} />
            <Sparkle cx={110} cy={16} />
            <Sparkle cx={104} cy={50} />
          </>
        )}
        {state === 'thinking' && (
          <g className="fill-ink-muted">
            <circle cx="94" cy="30" r="2.6" />
            <circle cx="102" cy="22" r="3.4" />
            <circle cx="112" cy="12" r="4.4" />
          </g>
        )}
      </motion.svg>
      {state === 'curious' && (
        <span aria-hidden="true" className="absolute -right-3 -top-1 rounded-pill bg-info-soft px-2 py-0.5 text-label text-info-text">
          hmm?
        </span>
      )}
    </div>
  );
}
