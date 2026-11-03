/**
 * The app icon, drawn as geometry (not font text) so every render is identical
 * whatever fonts the machine has. It matches `public/favicon.svg`: the brand
 * violet → indigo square with a heavy white "F".
 */
import { readAppConfig } from './appConfig';

const { brandStart, brandEnd } = readAppConfig().colors;

/** The "F" in a 36-unit box, same placement as the favicon's text glyph. */
const F_RECTS_36 = [
  { x: 12.4, y: 10.6, w: 4.7, h: 14.6 }, // stem
  { x: 12.4, y: 10.6, w: 11.4, h: 4.0 }, // top bar
  { x: 12.4, y: 16.6, w: 9.4, h: 3.7 }, // middle bar
];

function fRects(scale: number, dx: number, dy: number, fill: string): string {
  return F_RECTS_36.map(
    (r) =>
      `<rect x="${(r.x * scale + dx).toFixed(2)}" y="${(r.y * scale + dy).toFixed(2)}" width="${(r.w * scale).toFixed(2)}" height="${(r.h * scale).toFixed(2)}" rx="${(0.5 * scale).toFixed(2)}" fill="${fill}"/>`,
  ).join('');
}

const gradient = `<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${brandStart}"/><stop offset="100%" stop-color="${brandEnd}"/></linearGradient></defs>`;

/** Rounded-square icon on a transparent background ("any" purpose, legacy launchers). */
export function roundedIconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">${gradient}<rect width="36" height="36" rx="8" fill="url(#g)"/>${fRects(1, 0, 0, '#FFFFFF')}</svg>`;
}

/**
 * Full-bleed square ("maskable" web icon, Play Store listing icon). The F is shrunk
 * into the central safe zone, because launchers crop to a circle or squircle.
 */
export function maskableIconSvg(): string {
  // F bounds in the 36 box: x 12.4–23.8, y 10.6–25.2 → centre (18.1, 17.9).
  const scale = 0.72;
  const dx = 18 - 18.1 * scale;
  const dy = 18 - 17.9 * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">${gradient}<rect width="36" height="36" fill="url(#g)"/>${fRects(scale, dx, dy, '#FFFFFF')}</svg>`;
}

/**
 * Android vector-drawable path data for the F alone, in a 108×108 adaptive-icon
 * canvas (safe zone = central 66), used for the adaptive foreground, the themed
 * (monochrome) icon, the notification icon and the splash.
 */
export function fPathData108(): string {
  const scale = 1.75; // F becomes ~20 × 25.5 units, well inside the 66-unit safe circle
  const dx = 54 - 18.1 * scale;
  const dy = 54 - 17.9 * scale;
  return F_RECTS_36.map((r) => {
    const x = r.x * scale + dx;
    const y = r.y * scale + dy;
    const w = r.w * scale;
    const h = r.h * scale;
    return `M${x.toFixed(2)},${y.toFixed(2)}h${w.toFixed(2)}v${h.toFixed(2)}h${(-w).toFixed(2)}z`;
  }).join('');
}
