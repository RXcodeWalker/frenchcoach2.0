/**
 * Line icons for the Junior pictures that lucide has no drawing for, in lucide's own
 * grammar (24px grid, 2px round stroke, `currentColor`) so they sit beside it without
 * looking like a different set. Decorative: callers hide them from assistive tech.
 */
import type { SVGProps } from 'react';

export interface ArtIconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  size?: number | string;
  strokeWidth?: number | string;
}
export type ArtIcon = (props: ArtIconProps) => JSX.Element;

function icon(children: JSX.Element): ArtIcon {
  return function Icon({ size = 24, strokeWidth = 2, ...rest }: ArtIconProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...rest}
      >
        {children}
      </svg>
    );
  };
}

export const CheeseIcon = icon(
  <>
    <path d="M3 10 20 5v12H3z" />
    <path d="M8 14h.01M14 12.5h.01M16.5 15h.01" strokeWidth="3" />
  </>,
);

export const ChocolateIcon = icon(
  <>
    <rect x="6" y="3" width="12" height="18" rx="2" />
    <path d="M6 9h12M6 15h12M12 3v18" />
  </>,
);

export const FootballIcon = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="m12 8.5 3 2.2-1.1 3.5h-3.8L9 10.7z" />
    <path d="M12 8.5V3.2M15 10.7l5.2-1.7M13.9 14.2l3.3 4.4M10.1 14.2l-3.3 4.4M9 10.7 3.8 9" />
  </>,
);

export const SkylineIcon = icon(
  <>
    <path d="M3 21V9h5v12M8 21V4h6v17M14 21V11h7v10M2 21h20" />
    <path d="M10.5 8h1M10.5 12h1M10.5 16h1" />
  </>,
);

export const VillageIcon = icon(
  <>
    <path d="M2 21v-7l5-4 5 4v7zM12 21v-5l4.5-3.5L21 16v5z" />
    <path d="M6 21v-4h2v4M2 21h20" />
  </>,
);

export const StrawberryIcon = icon(
  <>
    <path d="M12 21c-4.5-2-7-6-6.5-10 .2-1.8 2-3 4-3 .8 0 1.6.2 2.5.2s1.7-.2 2.5-.2c2 0 3.8 1.2 4 3 .5 4-2 8-6.5 10z" />
    <path d="M8.5 7.5 12 5l3.5 2.5M12 5V2.5" />
    <path d="M9.5 12h.01M14.5 12h.01M12 15h.01M10 17.5h.01M14 17.5h.01" strokeWidth="2.5" />
  </>,
);

export const ButterflyIcon = icon(
  <>
    <path d="M12 7v13" />
    <path d="M12 8C9 2 3 3 4 9c.4 2.5 3.5 4 8 4M12 8c3-6 9-5 8 1-.4 2.5-3.5 4-8 4" />
    <path d="M12 13c-5 0-7 3-6 6 .8 2 4 1 6-2M12 13c5 0 7 3 6 6-.8 2-4 1-6-2" />
    <path d="M12 7c-1-2-2-3-3-3.5M12 7c1-2 2-3 3-3.5" />
  </>,
);

export const BalloonIcon = icon(
  <>
    <path d="M12 2C8 2 5.5 5 5.5 9c0 4 3 7 6.5 8 3.5-1 6.5-4 6.5-8 0-4-2.5-7-6.5-7z" />
    <path d="M10.8 18.2h2.4M12 18.5c-1.8 1.2 1.8 2.3 0 3.5M8.5 8c.2-1.5 1-2.5 2.2-3" />
  </>,
);
