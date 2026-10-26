import type { CSSProperties } from 'react';
import { topicVisual } from '../../features/topics/topicVisuals';

interface Props {
  topicKey: string | null | undefined;
  /** Box size in px: 40 tiles, 36 rows, 28 list rows, 20 inline. */
  size?: number;
  className?: string;
}

/**
 * A topic's icon chip — the only place a topic hue appears (Design System v2).
 * Light: oklch(.955 .03 h) ground, oklch(.50 .13 h) icon; dark: oklch(.30 .045 h)
 * ground, oklch(.80 .11 h) icon (`.topic-chip` in index.css).
 */
export function TopicChip({ topicKey, size = 40, className = '' }: Props) {
  const { Icon, hue } = topicVisual(topicKey);
  const icon = size >= 40 ? 20 : size >= 36 ? 16 : 14;
  return (
    <span
      aria-hidden="true"
      className={`topic-chip flex shrink-0 items-center justify-center ${className}`}
      style={{ '--h': hue, width: size, height: size, borderRadius: size >= 28 ? 8 : 6 } as CSSProperties}
    >
      <Icon size={icon} strokeWidth={1.75} />
    </span>
  );
}
