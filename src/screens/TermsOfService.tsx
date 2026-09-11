import { MarketingLayout } from '../components/layout/MarketingLayout';

// DRAFT — legal review required before general availability. Referenced
// from the signup data-processing consent checkbox (Phase 1.6 Part C) and
// the MarketingLayout footer. Same shell/mount pattern as PrivacyPolicy.tsx.

const BREADCRUMB = [
  { label: 'Home', href: '/' },
  { label: 'Terms of Service' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-display text-xl md:text-2xl mb-3">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed" style={{ color: 'var(--mk-ink-muted)' }}>
        {children}
      </div>
    </section>
  );
}

export function TermsOfService() {
  return (
    <MarketingLayout route="/terms" breadcrumb={BREADCRUMB}>
      <div className="max-w-[720px] mx-auto px-4 md:px-6 py-14 md:py-16">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3"
          style={{ color: 'var(--mk-accent)' }}
        >
          Legal
        </p>
        <h1 className="font-display text-3xl md:text-4xl mb-4">Terms of Service</h1>
        <p className="text-sm mb-10" style={{ color: 'var(--mk-ink-faint)' }}>
          <strong>Draft — under legal review.</strong> This describes the current terms of using
          Français AI. It is not yet finalized and has not been reviewed by a lawyer.
        </p>

        <Section title="Using Français AI">
          <p>
            Français AI is a speaking-practice tool for learning French. Use it to practice, not
            to submit as your own graded coursework where that would count as academic dishonesty
            under your school's rules — that's between you and your school, but we built this for
            practice, not for doing your homework for you.
          </p>
        </Section>

        <Section title="Acceptable use">
          <p>
            Don't use the app to harass other users, attempt to access another learner's account
            or data, upload content that isn't your own spoken French practice, or try to disrupt
            or reverse-engineer the service. We may suspend accounts that do.
          </p>
        </Section>

        <Section title="Your data">
          <p>
            By creating an account you agree to our processing of your voice recordings,
            transcripts, and progress data as described in our{' '}
            <a href="/privacy" className="mk-link">
              Privacy Policy
            </a>
            . That processing is what makes spoken feedback possible.
          </p>
        </Section>

        <Section title="Accounts for under-13 learners">
          <p>
            If you're under 13, a parent or guardian needs to confirm by email before speaking
            practice turns on for your account, as described in the Privacy Policy's
            "Children's data" section.
          </p>
        </Section>

        <Section title="No warranty, limitation of liability">
          <p>
            Français AI is provided during an early-access period "as is," without guarantees of
            accuracy in AI-generated feedback or scoring. Don't rely on it as your sole source of
            exam-readiness assessment.
          </p>
        </Section>

        <Section title="Changes to these terms">
          <p>
            We may update these terms as the product develops. Continued use after a change means
            you accept the updated terms.
          </p>
        </Section>
      </div>
    </MarketingLayout>
  );
}
