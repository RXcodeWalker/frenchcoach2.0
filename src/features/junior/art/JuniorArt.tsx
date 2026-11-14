/**
 * Draws a Junior picture (see `pictures.ts`). Never prints an emoji: the bank's emoji is
 * only the key. An illustration saved as `src/assets/junior/<picture id>.png|webp|svg`
 * replaces the drawn fallback with no code change.
 *
 *  tile   a rounded plate washed in the picture's hue, with a tilted twin behind it
 *  badge  a single round plate, for stickers and small labels
 */
import type { CSSProperties } from 'react';
import { assetUrlFor } from './assets';
import { THEME_SCENE, pictureFor, type Picture } from './pictures';

interface Props {
  /** The bank's emoji for the picture (its key). */
  picture: string;
  /** Outer size in px. */
  size?: number;
  variant?: 'tile' | 'badge';
  /** The picture sits on a hue wash: use a plain surface plate so it stands out. */
  onWash?: boolean;
  className?: string;
}

/** A drop of paint; white keeps a hairline so it does not vanish on a light plate. */
function Drop({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.5C12 2.5 5 10 5 15a7 7 0 0 0 14 0C19 10 12 2.5 12 2.5z"
        fill={color}
        stroke={color.toUpperCase() === '#FFFFFF' ? '#B9BCC4' : 'none'}
        strokeWidth="1.2"
      />
      <ellipse cx="9.4" cy="14" rx="1.5" ry="2.6" fill="#fff" opacity={color.toUpperCase() === '#FFFFFF' ? 0 : 0.35} transform="rotate(16 9.4 14)" />
    </svg>
  );
}

function Face({ pic, size }: { pic: Picture; size: number }) {
  if (pic.kind === 'icon') return <pic.Icon size={Math.round(size * 0.5)} strokeWidth={1.75} aria-hidden="true" />;
  if (pic.kind === 'drop') return <Drop color={pic.color} size={Math.round(size * 0.58)} />;
  if (pic.kind === 'pair') {
    const [A, B] = pic.Icons;
    const s = Math.round(size * 0.36);
    return (
      <span className="flex items-center" aria-hidden="true">
        <A size={s} strokeWidth={1.75} />
        <B size={s} strokeWidth={1.75} />
      </span>
    );
  }
  const long = pic.text.length > 1;
  return (
    <span aria-hidden="true" className="font-numeral font-semibold leading-none" style={{ fontSize: Math.max(12, Math.round(size * (long ? 0.36 : 0.46))) }}>
      {pic.text}
    </span>
  );
}

export function JuniorArt({ picture, size = 56, variant = 'tile', onWash = false, className = '' }: Props) {
  const pic = pictureFor(picture);
  const url = assetUrlFor(pic.id);
  const box: CSSProperties = { width: size, height: size };

  if (url) {
    return <img src={url} alt="" aria-hidden="true" draggable={false} style={box} className={`shrink-0 object-contain ${className}`} />;
  }

  const vars = { ...box, '--h': pic.hue } as CSSProperties;
  if (variant === 'badge') {
    return (
      <span aria-hidden="true" data-picture={pic.id} style={vars} className={`junior-plate flex shrink-0 items-center justify-center rounded-full ${className}`}>
        <Face pic={pic} size={size} />
      </span>
    );
  }
  return (
    <span aria-hidden="true" data-picture={pic.id} style={vars} className={`relative inline-block shrink-0 ${className}`}>
      <span className={`absolute inset-0 -rotate-[7deg] rounded-[28%] ${onWash ? 'bg-surface-recessed' : 'junior-plate-back'}`} />
      <span className={`absolute inset-0 flex items-center justify-center rounded-[28%] ${onWash ? 'junior-ink border border-hairline bg-surface' : 'junior-plate'}`}>
        <Face pic={pic} size={size} />
      </span>
    </span>
  );
}

/** Three of a theme's pictures, fanned like dropped stickers on its banner. */
export function ThemeScene({ themeId, fallback, size = 52 }: { themeId: string; fallback: string; size?: number }) {
  const scene = THEME_SCENE[themeId] ?? [fallback, fallback, fallback];
  const tilt = ['-rotate-[9deg] translate-y-1', 'z-10 -translate-y-1', 'rotate-[9deg] translate-y-1'];
  return (
    <span aria-hidden="true" className="relative flex items-center">
      {scene.map((p, i) => (
        <JuniorArt key={i} picture={p} size={size} onWash className={`${i > 0 ? '-ml-3' : ''} ${tilt[i]}`} />
      ))}
    </span>
  );
}
