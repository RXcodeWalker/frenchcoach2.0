import { MarketingLayout } from '../components/layout/MarketingLayout';

// Privacy Policy for French Coach. Not reviewed by a lawyer; keep it accurate to
// what the app actually does (providers, retention, deletion) when that changes.
//
// Rendered on MarketingLayout from both PublicRoutes.tsx (logged-out) and
// App.tsx (signed-in/guest, as a bare route next to /story) — same "one
// page, two mount contexts" precedent as About/AboutPublic, except this
// page has no context-dependent content so a single component covers both.

const LAST_UPDATED = '5 November 2026';

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
        <h1 className="font-display text-3xl md:text-4xl mb-4">French Coach Privacy Policy</h1>
        <p className="text-sm mb-10" style={{ color: 'var(--mk-ink-faint)' }}>
          Last updated: {LAST_UPDATED}
        </p>

        <Section title="1. Who we are">
          <p>
            This Privacy Policy explains how French Coach (&ldquo;French Coach&rdquo;,
            &ldquo;we&rdquo;, &ldquo;us&rdquo; or &ldquo;our&rdquo;), a spoken-French practice
            application for IGCSE and A-Level learners available at french.beyondthebasics.me,
            collects, uses, discloses and protects personal information about the people who use
            it (&ldquo;you&rdquo;). For the purposes of applicable data-protection law, French Coach
            is the controller of the personal information described in this policy.
          </p>
          <p>
            By creating an account or using French Coach, you acknowledge that you have read and
            understood this Privacy Policy. If you do not agree with it, please do not use the
            service.
          </p>
        </Section>

        <Section title="2. Information we collect">
          <p><strong>Account information.</strong> Your email address, a password (stored only as a
            secure hash by our authentication provider) or, if you sign in with Google or
            Microsoft, the basic profile information that provider shares with us (your name, email
            address and profile picture). We also record the age band you choose at sign-up.</p>
          <p><strong>Voice recordings and transcripts.</strong> When you use a speaking exercise,
            your microphone audio is recorded and sent for transcription, pronunciation analysis
            and feedback. We store the resulting transcript, scores, feedback and exam marking
            records. Audio recordings are processed to produce these results and are not kept on
            our servers as a library of your voice; exam recordings you can replay stay in your
            browser&rsquo;s memory for that session only.</p>
          <p><strong>Learning and progress data.</strong> Practice sessions, scores, XP, streaks,
            topic mastery, spaced-review schedules, learning preferences and speaking-fluency
            measurements (such as pause length and speaking rate &mdash; never audio or text).</p>
          <p><strong>Content you choose to save.</strong> Notebook entries and similar study notes,
            which are kept on your device only.</p>
          <p><strong>Usage and device information.</strong> Pages visited, features used,
            error reports, browser type, device type, approximate region derived from IP address,
            and similar technical information.</p>
          <p><strong>Communications.</strong> Feedback you send us, and, if you turn them on,
            the push-notification subscription used to send study reminders.</p>
        </Section>

        <Section title="3. How we use your information">
          <p>We use personal information to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>provide, operate and maintain French Coach, including transcribing your spoken
              French and generating feedback, marks and practice recommendations;</li>
            <li>create and secure your account and authenticate you when you sign in;</li>
            <li>save and sync your progress across your devices;</li>
            <li>enforce fair-use limits on AI-marked answers and sample exams;</li>
            <li>send reminders and service messages you have asked for;</li>
            <li>diagnose errors, monitor performance and improve the accuracy and quality of the
              service;</li>
            <li>protect the security and integrity of the service and prevent misuse; and</li>
            <li>comply with our legal obligations.</li>
          </ul>
          <p>
            Our legal bases for this processing, where the law requires one, are the performance of
            our contract with you (providing the service you signed up for), our legitimate
            interests in operating, securing and improving French Coach, your consent (for example,
            for notifications or a guardian&rsquo;s confirmation for a younger learner), and
            compliance with legal obligations.
          </p>
          <p>
            We do not sell your personal information, we do not share it for targeted advertising,
            and we do not use your recordings or transcripts to build advertising profiles.
          </p>
        </Section>

        <Section title="4. Google user data">
          <p>
            If you sign in with Google, French Coach receives only your name, email address and
            profile picture, which we use solely to create and identify your account. We do not
            request access to your Gmail, Drive, contacts or any other Google data. French
            Coach&rsquo;s use and transfer of information received from Google APIs adheres to the{' '}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" className="mk-link" target="_blank" rel="noreferrer">
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements. We do not sell Google user data, use it for
            advertising, or allow humans to read it except with your permission, for security
            purposes, or to comply with the law.
          </p>
        </Section>

        <Section title="5. Service providers (subprocessors)">
          <p>
            We share personal information only with service providers that process it on our behalf
            and under our instructions, for the purposes described above:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Supabase</strong> &mdash; authentication, database and file storage;</li>
            <li><strong>Groq</strong> &mdash; speech transcription and AI feedback;</li>
            <li><strong>Google (Gemini)</strong> &mdash; AI feedback and exam marking;</li>
            <li><strong>Microsoft Azure Speech</strong> &mdash; pronunciation analysis and French
              voice audio;</li>
            <li><strong>Vercel</strong> and <strong>Render</strong> &mdash; hosting of the app and
              its servers;</li>
            <li><strong>Sentry</strong> &mdash; error monitoring;</li>
            <li><strong>PostHog</strong> &mdash; product analytics (counts and settings only,
              never recordings, transcripts or answers);</li>
            <li><strong>Resend</strong> &mdash; transactional and reminder emails.</li>
          </ul>
          <p>
            We may also disclose information if required by law, to protect the rights, safety or
            property of French Coach, our users or others, or in connection with a merger,
            acquisition or sale of assets, in which case this policy will continue to apply to your
            information.
          </p>
        </Section>

        <Section title="6. International transfers">
          <p>
            Our providers may process information in countries other than the one you live in,
            including the United States and the European Union. Where we transfer personal
            information internationally, we rely on our providers&rsquo; contractual safeguards
            (such as standard contractual clauses) to protect it.
          </p>
        </Section>

        <Section title="7. Data retention">
          <p>
            We keep your account, sessions, transcripts and progress for as long as your account is
            active, so that your history and streak remain intact. When you delete your account, we
            delete your associated data from our active systems promptly; residual copies may
            remain in encrypted backups for a limited period before they are overwritten. Error and
            analytics records are kept for the limited periods set by those providers.
          </p>
        </Section>

        <Section title="8. Your rights and choices">
          <p>
            Depending on where you live, you may have the right to access, correct, delete or
            receive a portable copy of your personal information, to object to or restrict certain
            processing, and to withdraw consent at any time (without affecting processing that
            already took place). You can exercise the most important of these yourself:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Export</strong> &mdash; Profile &rarr; Export my data downloads a copy of
              what we hold about you;</li>
            <li><strong>Delete</strong> &mdash; Profile &rarr; Delete my account permanently removes
              your account, sessions, transcripts, scores, XP and progress;</li>
            <li><strong>Notifications</strong> &mdash; turn reminders on or off in your Profile or
              browser settings.</li>
          </ul>
          <p>
            For any other request, contact us as described below. You also have the right to lodge
            a complaint with your local data-protection authority.
          </p>
        </Section>

        <Section title="9. Children&rsquo;s privacy">
          <p>
            French Coach is designed for school-age learners. Everyone chooses an age band at
            sign-up. If a learner tells us they are under 13, their account is created but speaking
            practice stays switched off &mdash; no audio is recorded or sent to any provider &mdash;
            until a parent or guardian confirms by email that they agree. A parent or guardian can
            withdraw that confirmation at any time, which erases the child&rsquo;s account data. If
            you believe a child has provided personal information to us without appropriate
            consent, please contact us and we will delete it.
          </p>
        </Section>

        <Section title="10. Cookies and local storage">
          <p>
            French Coach uses your browser&rsquo;s local storage and essential cookies to keep you
            signed in, remember your preferences and let the app work offline. Analytics and error
            monitoring use similar technologies to understand how the app is used and to fix
            problems. You can clear this data in your browser settings at any time, although some
            features may then stop working until you sign in again.
          </p>
        </Section>

        <Section title="11. Security">
          <p>
            We use industry-standard measures to protect your information, including encryption in
            transit (HTTPS), access controls, and authentication tokens that are never shared with
            analytics or error-monitoring providers. No method of transmission or storage is
            completely secure, however, and we cannot guarantee absolute security.
          </p>
        </Section>

        <Section title="12. Changes to this policy">
          <p>
            We may update this Privacy Policy from time to time. When we do, we will change the
            &ldquo;Last updated&rdquo; date above and, where the changes are significant, let you
            know in the app. Your continued use of French Coach after an update means you accept
            the revised policy.
          </p>
        </Section>

        <Section title="13. Contact us">
          <p>
            For questions about this policy or your personal information, use{' '}
            <strong>Send feedback</strong> in the app (Profile &rarr; Help &amp; feedback) and leave
            an email address for the reply.
          </p>
        </Section>
      </div>
    </MarketingLayout>
  );
}
