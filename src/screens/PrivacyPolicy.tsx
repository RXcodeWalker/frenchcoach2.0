import { MarketingLayout } from '../components/layout/MarketingLayout';

// DRAFT — legal review required before general availability. This page
// describes current data-handling behavior in plain English; it is not
// legal advice and has not been reviewed by counsel. See Phase 1.6 (ADR
// 0006) for the guardian-consent model referenced in the "Children's data"
// section below.
//
// Rendered on MarketingLayout from both PublicRoutes.tsx (logged-out) and
// App.tsx (signed-in/guest, as a bare route next to /story) — same "one
// page, two mount contexts" precedent as About/AboutPublic, except this
// page has no context-dependent content so a single component covers both.

const BREADCRUMB = [
  { label: 'Home', href: '/' },
  { label: 'Privacy Policy' },
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

export function PrivacyPolicy() {
  return (
    <MarketingLayout route="/privacy" breadcrumb={BREADCRUMB}>
      <div className="max-w-[720px] mx-auto px-4 md:px-6 py-14 md:py-16">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3"
          style={{ color: 'var(--mk-accent)' }}
        >
          Legal
        </p>
        <h1 className="font-display text-3xl md:text-4xl mb-4">Privacy Policy</h1>
        <p className="text-sm mb-10" style={{ color: 'var(--mk-ink-faint)' }}>
          <strong>Draft — under legal review.</strong> This describes how Français AI currently
          handles your data. It is not yet finalized and has not been reviewed by a lawyer.
        </p>

        <Section title="What we record, and why">
          <p>
            Français AI is a spoken-French practice app. When you use a speaking exercise, we
            record your voice, send it to a transcription and AI-feedback service, and store the
            resulting transcript and score so we can show you your progress and mistakes over
            time. Without this, the app cannot function — spoken feedback is the whole point.
          </p>
        </Section>

        <Section title="Where your data is stored">
          <p>
            Transcripts, scores, and progress are stored in our database (hosted on Supabase).
            Preferences and a working copy of your recent activity are also kept on your device
            (browser local storage) so the app works offline and loads quickly.
          </p>
        </Section>

        <Section title="Who else sees it (subprocessors)">
          <p>
            To turn speech into feedback, audio and text pass through a small number of outside
            providers acting on our behalf. As of this writing that includes Groq (transcription
            and fast feedback), Google Gemini (feedback generation), and Microsoft Azure Speech
            (pronunciation scoring). We don't sell your data or use it for advertising, and these
            providers only receive what a given exercise needs to run.
          </p>
        </Section>

        <Section title="How long we keep it">
          <p>
            We keep your sessions, transcripts, and progress for as long as your account is
            active, so your history and streak stay intact. You can delete everything at any time
            — see "Your data, your choice" below.
          </p>
        </Section>

        <Section title="Your data, your choice">
          <p>
            From your Profile page you can export a copy of everything we hold about you, or
            delete your account and all associated data. Deletion removes your sessions,
            transcripts, scores, XP, and progress; it cannot be undone.
          </p>
        </Section>

        <Section title="Children's data">
          <p>
            Français AI is used by school-age learners. At sign-up, everyone chooses an age band.
            If you tell us you're under 13, your account is created but speaking practice is
            switched off — no audio is recorded and nothing is sent to any provider — until a
            parent or guardian confirms by email that they're okay with it. We call this "guardian
            confirmation," not a formal legal consent process; it's the mechanism we use during
            early access while we work with counsel on what's required in each region we operate
            in. A guardian can withdraw that confirmation at any time, which erases the child's
            account data.
          </p>
        </Section>

        <Section title="Questions or requests">
          <p>
            For anything about this policy or your data, reach out via the contact details on our{' '}
            <a href="/about" className="mk-link">
              About page
            </a>
            .
          </p>
        </Section>
      </div>
    </MarketingLayout>
  );
}
