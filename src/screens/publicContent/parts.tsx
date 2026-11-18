import type { CSSProperties, ElementType, ReactNode } from 'react';
import { CtaButton } from '../../components/marketing/CtaButton';
import { startPractisingFree } from '../../components/marketing/startPractisingFree';
import type { LandingCta } from '../../services/telemetry/telemetryService';
import { MUTED } from './styles';

/** French text, marked up so screen readers pronounce it and search engines read it as French. */
export function Fr({
  children,
  as: Tag = 'span',
  className,
  style,
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <Tag lang="fr" className={className} style={style}>
      {children}
    </Tag>
  );
}

/** The free-tier call to action every public content page ends on: into the app as a guest. */
export function PracticePanel({
  heading,
  body,
  button,
  cta,
  to,
}: {
  heading: string;
  body: string;
  button: string;
  cta: LandingCta;
  /** Where the guest lands (an internal path); defaults to Home. */
  to?: string;
}) {
  return (
    <section
      className="rounded-2xl border p-7 flex flex-wrap items-center gap-6"
      style={{ borderColor: 'var(--mk-accent)', background: 'var(--mk-accent-soft)' }}
    >
      <div className="flex-1 min-w-[240px]">
        <h2 className="font-display text-2xl mb-1.5">{heading}</h2>
        <p className="text-base leading-relaxed" style={MUTED}>
          {body}
        </p>
      </div>
      <CtaButton onClick={() => startPractisingFree(cta, to)}>{button}</CtaButton>
    </section>
  );
}

export function LinkCard({ href, title, sub }: { href: string; title: string; sub?: string }) {
  return (
    <a
      href={href}
      className="mk-focus block rounded-xl border mk-hairline p-4 transition-colors"
      style={{ background: 'var(--mk-surface)' }}
    >
      <span className="block text-base font-semibold mk-link">{title}</span>
      {sub && (
        <span className="block text-sm mt-1" style={MUTED}>
          {sub}
        </span>
      )}
    </a>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--mk-accent)' }}>
      {children}
    </p>
  );
}
