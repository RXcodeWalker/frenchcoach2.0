// ── Paint a ShareCardModel onto a canvas and return a PNG ────────────────────
//
// 1080 × 1350 (4:5) reads well in every feed and chat. The palette is fixed,
// not read from the live theme: a card must look the same whether the learner
// is in light or dark mode and wherever it is posted, so these are the light
// Design System v2 role colours (src/index.css) copied by value. Flat fills
// only — no gradients, glow or shadows (design rules).

import {
  shareDisplayHost,
  wrapText,
  type ShareAccent,
  type ShareCardModel,
} from './shareCards';

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

const PAPER = '#F6F5F1';
const SURFACE = '#FFFFFF';
const INK = '#1C1A17';
const INK_MUTED = '#56524B';
const INK_SUBTLE = '#6E6A62';
const HAIRLINE = '#E4E1DA';
const BRAND = '#7C3AED';
const BRAND_INK = '#FFFFFF';

const ACCENTS: Record<ShareAccent, { solid: string; text: string; soft: string }> = {
  streak: { solid: '#D4561C', text: '#B2430F', soft: 'rgba(212,86,28,0.10)' },
  progress: { solid: '#12805A', text: '#0C6646', soft: 'rgba(18,128,90,0.09)' },
  action: { solid: '#7C3AED', text: '#6D28D9', soft: 'rgba(124,58,237,0.08)' },
  reward: { solid: '#C27C0E', text: '#8A5508', soft: 'rgba(194,124,14,0.10)' },
};

const SANS = '"Bricolage Grotesque", system-ui, -apple-system, "Segoe UI", sans-serif';
const SERIF = '"Libre Baskerville", Georgia, "Times New Roman", serif';

const PAD = 88;
const INNER_W = CARD_WIDTH - PAD * 2;

/** Waits (briefly) for the two web fonts so the first card is not drawn in a fallback face. */
async function ensureFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts?.load) return;
  const loads = [
    document.fonts.load(`700 80px "Bricolage Grotesque"`),
    document.fonts.load(`500 40px "Bricolage Grotesque"`),
    document.fonts.load(`italic 400 40px "Libre Baskerville"`),
  ];
  await Promise.race([
    Promise.allSettled(loads),
    new Promise<void>(resolve => setTimeout(resolve, 1500)),
  ]);
}

type Ctx = CanvasRenderingContext2D;

function roundedRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function setFont(ctx: Ctx, weight: number | string, size: number, family = SANS, style = ''): void {
  ctx.font = `${style ? `${style} ` : ''}${weight} ${size}px ${family}`;
}

function trackLetters(ctx: Ctx, px: number): void {
  // letterSpacing is missing in older Safari; the card is fine without it.
  (ctx as Ctx & { letterSpacing?: string }).letterSpacing = `${px}px`;
}

/** Largest font size (≤ start) at which `text` fits in `maxWidth`. */
function fitSize(ctx: Ctx, text: string, weight: number, start: number, maxWidth: number, min = 120): number {
  let size = start;
  while (size > min) {
    setFont(ctx, weight, size);
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 8;
  }
  return size;
}

/** Draws wrapped text top-down from `y` (baseline of the first line = y + size). Returns the next free y. */
function paragraph(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  maxLines: number,
  size: number,
  lineHeight: number,
  color: string,
): number {
  const lines = wrapText(text, maxWidth, maxLines, s => ctx.measureText(s).width);
  ctx.fillStyle = color;
  ctx.textBaseline = 'alphabetic';
  lines.forEach((line, i) => ctx.fillText(line, x, y + size + i * lineHeight));
  return y + lines.length * lineHeight;
}

function drawHeader(ctx: Ctx, accent: { text: string; soft: string }, eyebrow: string): void {
  // Brand mark: a purple dot and the wordmark.
  ctx.fillStyle = BRAND;
  ctx.beginPath();
  ctx.arc(PAD + 24, 150, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BRAND_INK;
  roundedRect(ctx, PAD + 17, 138, 14, 22, 7);
  ctx.fill();
  ctx.fillStyle = BRAND;
  ctx.fillRect(PAD + 23, 160, 2, 6);

  setFont(ctx, 700, 40);
  ctx.fillStyle = INK;
  ctx.textBaseline = 'middle';
  ctx.fillText('French Coach', PAD + 66, 152);

  // Eyebrow pill, right-aligned on the same row.
  setFont(ctx, 700, 26);
  trackLetters(ctx, 2);
  const label = eyebrow.toUpperCase();
  const w = ctx.measureText(label).width + 48;
  const x = CARD_WIDTH - PAD - w;
  ctx.fillStyle = accent.soft;
  roundedRect(ctx, x, 152 - 28, w, 56, 28);
  ctx.fill();
  ctx.fillStyle = accent.text;
  ctx.fillText(label, x + 24, 153);
  trackLetters(ctx, 0);
}

function drawFooter(ctx: Ctx, cta: string): void {
  const top = CARD_HEIGHT - 300;
  ctx.fillStyle = HAIRLINE;
  ctx.fillRect(PAD, top, INNER_W, 2);

  setFont(ctx, 500, 38);
  paragraph(ctx, cta, PAD, top + 36, INNER_W, 2, 38, 52, INK_MUTED);

  const host = shareDisplayHost();
  setFont(ctx, 700, 36);
  const w = Math.min(INNER_W, ctx.measureText(host).width + 96);
  const y = CARD_HEIGHT - 150;
  ctx.fillStyle = BRAND;
  roundedRect(ctx, PAD, y, w, 84, 42);
  ctx.fill();
  ctx.fillStyle = BRAND_INK;
  ctx.textBaseline = 'middle';
  ctx.fillText(host, PAD + 48, y + 43);
  ctx.textBaseline = 'alphabetic';
}

// ── Per-card bodies ──────────────────────────────────────────────────────────

const BODY_TOP = 270;

function drawFigureBody(ctx: Ctx, m: ShareCardModel, accent: { text: string; solid: string }): void {
  const widest = m.figure.length > 3 ? INNER_W : 640;
  const size = fitSize(ctx, m.figure, 700, m.figure.length > 3 ? 300 : 420, widest);
  setFont(ctx, 700, size);
  trackLetters(ctx, -4);
  ctx.fillStyle = accent.text;
  ctx.textBaseline = 'alphabetic';
  const baseline = BODY_TOP + size * 0.92;
  ctx.fillText(m.figure, PAD - 6, baseline);
  trackLetters(ctx, 0);

  setFont(ctx, 600, 50);
  let y = paragraph(ctx, m.figureLabel, PAD, baseline + 24, INNER_W, 2, 50, 64, INK);

  if (m.week) y = drawWeek(ctx, m.week, accent, y + 56);

  setFont(ctx, 500, 40);
  m.lines.forEach(line => {
    y = paragraph(ctx, line, PAD, y + 28, INNER_W, 3, 40, 54, INK_MUTED);
  });
}

function drawWeek(ctx: Ctx, week: NonNullable<ShareCardModel['week']>, accent: { solid: string }, top: number): number {
  const d = 92;
  const gap = (INNER_W - d * 7) / 6;
  week.forEach((day, i) => {
    const cx = PAD + i * (d + gap) + d / 2;
    const cy = top + d / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, d / 2 - 2, 0, Math.PI * 2);
    if (day.practised) {
      ctx.fillStyle = accent.solid;
      ctx.fill();
    } else {
      ctx.lineWidth = 3;
      ctx.strokeStyle = HAIRLINE;
      ctx.stroke();
    }
    if (day.isToday) {
      ctx.lineWidth = 5;
      ctx.strokeStyle = INK;
      ctx.beginPath();
      ctx.arc(cx, cy, d / 2 + 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    setFont(ctx, 700, 36);
    ctx.fillStyle = day.practised ? BRAND_INK : INK_SUBTLE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(day.label, cx, cy + 2);
  });
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  return top + d + 16;
}

function drawBestAnswerBody(ctx: Ctx, m: ShareCardModel, accent: { solid: string; text: string; soft: string }): void {
  let y = BODY_TOP;

  if (m.question) {
    setFont(ctx, 700, 26);
    trackLetters(ctx, 2);
    ctx.fillStyle = INK_SUBTLE;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('THE QUESTION', PAD, y + 26);
    trackLetters(ctx, 0);
    setFont(ctx, 600, 40);
    y = paragraph(ctx, m.question, PAD, y + 44, INNER_W, 3, 40, 54, INK);
  }

  // The learner's own words, set in the quoted-answer serif.
  y += 44;
  const barX = PAD;
  const textX = PAD + 40;
  const quoteW = INNER_W - 40;
  // 5 lines at 74px keeps the score chip clear of the footer rule (CARD_HEIGHT - 300).
  setFont(ctx, 400, 50, SERIF, 'italic');
  const lines = wrapText(m.quote ?? '', quoteW, 5, s => ctx.measureText(s).width);
  const lineH = 74;
  ctx.fillStyle = accent.solid;
  roundedRect(ctx, barX, y + 6, 8, lines.length * lineH - 6, 4);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.textBaseline = 'alphabetic';
  lines.forEach((line, i) => ctx.fillText(line, textX, y + 54 + i * lineH));
  y += lines.length * lineH + 40;

  // Score chip.
  const chip = m.lines[0];
  if (chip) {
    setFont(ctx, 700, 36);
    const w = ctx.measureText(chip).width + 72;
    ctx.fillStyle = accent.soft;
    roundedRect(ctx, PAD, y, w, 80, 40);
    ctx.fill();
    ctx.fillStyle = accent.text;
    ctx.textBaseline = 'middle';
    ctx.fillText(chip, PAD + 36, y + 41);
    ctx.textBaseline = 'alphabetic';
  }
}

// ── Public ───────────────────────────────────────────────────────────────────

/** Draws the card on an existing canvas (exported so a test or preview can supply its own). */
export function paintShareCard(canvas: HTMLCanvasElement, model: ShareCardModel): void {
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_unsupported');
  const accent = ACCENTS[model.accent];

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.fillStyle = SURFACE;
  roundedRect(ctx, 28, 28, CARD_WIDTH - 56, CARD_HEIGHT - 56, 44);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = HAIRLINE;
  ctx.stroke();

  drawHeader(ctx, accent, model.eyebrow);
  if (model.kind === 'best_answer') drawBestAnswerBody(ctx, model, accent);
  else drawFigureBody(ctx, model, accent);
  drawFooter(ctx, model.cta);
}

/** Renders the card to a PNG. Rejects with `canvas_unsupported` / `render_failed`. */
export async function renderShareCard(model: ShareCardModel): Promise<Blob> {
  await ensureFonts();
  const canvas = document.createElement('canvas');
  paintShareCard(canvas, model);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('render_failed'))), 'image/png');
  });
}
