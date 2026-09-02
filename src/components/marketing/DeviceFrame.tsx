import type { ReactNode } from 'react';

// Static, prop-less chrome wrapping product vignettes — a hairline-bordered
// card, not a literal device mockup, matching the editorial direction rather
// than a glossy phone-frame cliché.
export function DeviceFrame({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <div className="rounded-2xl border mk-hairline mk-surface p-5 md:p-6">
      {children}
      {caption && (
        <p className="mt-4 text-[11px] uppercase tracking-wide" style={{ color: 'var(--mk-ink-faint)' }}>
          {caption}
        </p>
      )}
    </div>
  );
}
