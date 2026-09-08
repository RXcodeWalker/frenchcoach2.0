import { Section } from '../../components/marketing/Section';
import { Reveal } from '../../components/marketing/Reveal';

const LAYERS = [
  { n: '1', title: 'Deterministic evidence extraction', body: 'Facts are pulled from your transcript by code, not inferred by a model.' },
  { n: '2', title: 'Constrained LLM judgement', body: 'A model applies the rubric to that evidence, within fixed constraints.' },
  { n: '3', title: 'Deterministic guardrails', body: 'Every mark is checked again by code before it reaches you.' },
];

export function HowScoringWorks() {
  return (
    <Section>
      <Reveal>
        <h2 className="font-display text-3xl md:text-5xl leading-tight mb-6 max-w-2xl">
          Credibility from substance — and from limits.
        </h2>
        <p className="text-sm leading-relaxed max-w-2xl mb-14" style={{ color: 'var(--mk-ink-muted)' }}>
          The scoring pipeline is the most carefully built part of this product, and the part
          most likely to be dismissed as marketing. So here's what it actually does.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {LAYERS.map((layer, i) => (
          <Reveal key={layer.n} delayMs={i * 90}>
            <div className="border-t mk-hairline-strong pt-4">
              <p className="font-display text-xl mb-2" style={{ color: 'var(--mk-accent)' }}>
                {layer.n}
              </p>
              <h3 className="text-sm font-semibold mb-2">{layer.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--mk-ink-muted)' }}>
                {layer.body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <div className="max-w-2xl space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-1.5">Quote verification</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--mk-ink-muted)' }}>
              Feedback claims that can't be grounded in your own transcript are discarded before
              they reach you. A fabricated quote trips a guardrail rather than being shown.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-1.5">Every band is sourced</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--mk-ink-muted)' }}>
              Mark ranges and band descriptors trace to official Cambridge documentation. Anything
              uncertain is marked unvalidated, not guessed.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-1.5">What it deliberately doesn't do</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--mk-ink-muted)' }}>
              It doesn't predict your grade — every score is marked as an unvalidated estimate,
              never a calibrated prediction. And practice feedback written in examiner voice never
              emits a mark or a band at all — only commentary on what would move you up.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-1.5">What isn't finished yet</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--mk-ink-muted)' }}>
              This is an early preview, actively being built. Some parts of the product are more
              polished than others.
            </p>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
