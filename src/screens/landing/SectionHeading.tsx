import { Eyebrow } from '../../components/marketing/Eyebrow';

/** The landing page's one section-heading pattern: eyebrow, serif h2, intro. */
export function SectionHeading({ eyebrow, title, intro, center = false }: { eyebrow: string; title: string; intro?: string; center?: boolean }) {
  return (
    <div className={`mb-12 md:mb-16 max-w-2xl ${center ? 'mx-auto text-center' : ''}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="font-display text-3xl md:text-5xl leading-[1.1]">{title}</h2>
      {intro && (
        <p className="mt-5 text-base md:text-lg leading-relaxed" style={{ color: 'var(--mk-ink-muted)' }}>
          {intro}
        </p>
      )}
    </div>
  );
}
