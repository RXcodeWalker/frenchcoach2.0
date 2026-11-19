import { useState } from 'react';

/**
 * One listen-back speed for every Pronunciation Lab surface (How it sounded,
 * Say it again, Word drill, Monthly check). A per-device convenience kept in
 * localStorage; the native voice clamps to 0.5–1×, so the slider does too.
 */

export const MIN_LISTEN_SPEED = 0.5;
const PRESETS = [0.5, 0.75, 1];
const SPEED_KEY = 'frenchCoach_listenSpeed';

export const clampListenSpeed = (n: number) =>
  Number.isFinite(n) ? Math.min(1, Math.max(MIN_LISTEN_SPEED, Math.round(n * 20) / 20)) : 1;
const formatSpeed = (n: number) => String(Number(n.toFixed(2)));

function loadSpeed(): number {
  try {
    const raw = window.localStorage.getItem(SPEED_KEY);
    return raw === null ? 1 : clampListenSpeed(Number(raw));
  } catch {
    return 1;
  }
}

export function useListenSpeed(): [number, (n: number) => void] {
  const [speed, setSpeed] = useState(loadSpeed);
  const change = (n: number) => {
    const next = clampListenSpeed(n);
    setSpeed(next);
    try {
      window.localStorage.setItem(SPEED_KEY, String(next));
    } catch {
      /* fine without it */
    }
  };
  return [speed, change];
}

export function ListenSpeedControl({ speed, onChange, id = 'listen-speed' }: { speed: number; onChange: (n: number) => void; id?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor={id} className="text-caption text-ink-muted">
        Speed
      </label>
      <input
        id={id}
        type="range"
        min={MIN_LISTEN_SPEED}
        max={1}
        step={0.05}
        value={speed}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={`${formatSpeed(speed)}×`}
        className="h-2 w-40 accent-[var(--action)]"
      />
      <span className="w-12 text-caption tabular-nums text-ink" aria-hidden="true">
        {formatSpeed(speed)}×
      </span>
      {PRESETS.map((p) => {
        const on = Math.abs(speed - p) < 0.001;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-pressed={on}
            className={`rounded-pill border px-3 py-1 text-caption transition-colors duration-state ease-smooth ${
              on ? 'border-action bg-action-soft text-action-text' : 'border-hairline text-ink-muted hover:bg-track'
            }`}
          >
            {formatSpeed(p)}×
          </button>
        );
      })}
    </div>
  );
}
