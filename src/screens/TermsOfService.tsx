import { MarketingLayout } from '../components/layout/MarketingLayout';

// Terms of Service for French Coach. Not reviewed by a lawyer. Referenced from
// the signup data-processing consent checkbox (Phase 1.6 Part C) and the
// MarketingLayout footer. Same shell/mount pattern as PrivacyPolicy.tsx.

const LAST_UPDATED = '5 November 2026';

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
        <h1 className="font-display text-3xl md:text-4xl mb-4">French Coach Terms of Service</h1>
        <p className="text-sm mb-10" style={{ color: 'var(--mk-ink-faint)' }}>
          Last updated: {LAST_UPDATED}
        </p>

        <Section title="1. Agreement to these terms">
          <p>
            These Terms of Service (the &ldquo;Terms&rdquo;) form a binding agreement between you
            and French Coach (&ldquo;French Coach&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo; or
            &ldquo;our&rdquo;) governing your access to and use of the French Coach website and
            application at french.beyondthebasics.me and any related services (together, the
            &ldquo;Service&rdquo;). By creating an account, signing in, or otherwise using the
            Service, you confirm that you have read, understood and agree to be bound by these
            Terms and by our{' '}
            <a href="/privacy" className="mk-link">Privacy Policy</a>, which is incorporated into
            these Terms by reference. If you do not agree, you must not use the Service.
          </p>
        </Section>

        <Section title="2. Eligibility and younger learners">
          <p>
            If you are under the age of majority where you live, you may use the Service only with
            the involvement and permission of a parent or guardian, who agrees to these Terms on
            your behalf. If you are under 13, speaking practice remains switched off until a parent
            or guardian confirms by email, as described in the Privacy Policy.
          </p>
        </Section>

        <Section title="3. Your account">
          <p>
            You are responsible for the accuracy of the information you give us, for keeping your
            sign-in details confidential, and for all activity under your account. Tell us
            promptly if you believe your account has been used without your permission. You may
            close your account at any time from your Profile.
          </p>
        </Section>

        <Section title="4. The Service">
          <p>
            French Coach is a practice tool for spoken French that uses automated speech
            recognition and artificial intelligence to transcribe your answers and generate
            feedback, marks and recommendations. Features may be offered as previews, may change,
            and may be subject to fair-use limits (for example, a daily number of AI-marked answers
            and a weekly sample exam). We may modify, suspend or discontinue any part of the
            Service at any time.
          </p>
        </Section>

        <Section title="5. AI feedback and exam marks">
          <p>
            Feedback, scores and simulated exam marks are produced automatically and are provided
            for practice and information only. They may be inaccurate or incomplete, can be
            affected by recording quality and transcription errors, and are not a prediction or
            guarantee of any result in a real examination. You should not rely on French Coach as
            your sole means of preparing for, or assessing your readiness for, any examination.
          </p>
          <p>
            French Coach is an independent product. It is not affiliated with, endorsed by, or
            sponsored by Cambridge University Press &amp; Assessment, Cambridge International
            Education, or any examination board. &ldquo;Cambridge&rdquo;, &ldquo;IGCSE&rdquo; and
            related names are trademarks of their respective owners and are used only to describe
            the syllabus our practice material is designed around.
          </p>
        </Section>

        <Section title="6. Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>use the Service for any unlawful purpose or in breach of these Terms;</li>
            <li>harass, abuse or harm other users, or upload offensive or infringing content;</li>
            <li>access, or attempt to access, another person&rsquo;s account or data;</li>
            <li>circumvent usage limits, security or access controls, including by creating
              multiple accounts;</li>
            <li>copy, scrape, resell or redistribute the Service or its content, or use it to
              build a competing product;</li>
            <li>reverse-engineer, decompile, overload or otherwise interfere with the Service,
              except where the law expressly allows it; or</li>
            <li>submit work produced with the Service as your own where your school or exam
              board&rsquo;s rules prohibit it.</li>
          </ul>
          <p>We may suspend or terminate accounts that breach these rules.</p>
        </Section>

        <Section title="7. Your content">
          <p>
            You keep ownership of the recordings, answers and notes you submit (&ldquo;Your
            Content&rdquo;). You grant French Coach a worldwide, non-exclusive, royalty-free licence
            to host, store, process, transmit and display Your Content solely to operate, provide,
            secure and improve the Service for you, including by sending it to our service
            providers as described in the Privacy Policy. This licence ends when Your Content is
            deleted from the Service, except for residual backup copies retained for a limited
            period.
          </p>
        </Section>

        <Section title="8. Our intellectual property">
          <p>
            The Service, including its software, design, question bank, model answers, audio and
            other materials (excluding Your Content), is owned by French Coach or its licensors and
            is protected by intellectual-property laws. Subject to these Terms, we grant you a
            limited, personal, non-exclusive, non-transferable and revocable licence to use the
            Service for your own non-commercial learning.
          </p>
        </Section>

        <Section title="9. Third-party services">
          <p>
            The Service relies on third-party providers (for example, for sign-in, hosting,
            transcription and AI feedback) and may link to third-party websites. We are not
            responsible for third-party services, and your use of them may be governed by their own
            terms.
          </p>
        </Section>

        <Section title="10. Termination">
          <p>
            You may stop using the Service and delete your account at any time. We may suspend or
            terminate your access, with or without notice, if you breach these Terms, if required
            by law, or if we discontinue the Service. Sections that by their nature should survive
            termination (including sections 5, 7, 8, 11, 12 and 14) will survive.
          </p>
        </Section>

        <Section title="11. Disclaimer of warranties">
          <p>
            To the fullest extent permitted by law, the Service is provided &ldquo;as is&rdquo; and
            &ldquo;as available&rdquo;, without warranties of any kind, whether express or implied,
            including implied warranties of merchantability, fitness for a particular purpose,
            accuracy and non-infringement. We do not warrant that the Service will be
            uninterrupted, error-free or secure, or that any feedback or mark will be accurate.
          </p>
        </Section>

        <Section title="12. Limitation of liability">
          <p>
            To the fullest extent permitted by law, French Coach and its operators will not be
            liable for any indirect, incidental, special, consequential or punitive damages, or for
            any loss of data, opportunity, goodwill or examination results, arising out of or in
            connection with your use of, or inability to use, the Service. Our total liability for
            any claim relating to the Service is limited to the amount you paid us for the Service
            in the twelve months before the claim arose, or, if you paid nothing, zero. Nothing in
            these Terms limits liability that cannot be limited under applicable law.
          </p>
        </Section>

        <Section title="13. Indemnity">
          <p>
            To the extent permitted by law, you agree to indemnify and hold harmless French Coach
            and its operators from any claims, losses and expenses (including reasonable legal
            fees) arising from your breach of these Terms or your misuse of the Service.
          </p>
        </Section>

        <Section title="14. Governing law and disputes">
          <p>
            These Terms are governed by the laws of India, without regard to its conflict-of-laws
            rules, and the courts of India have exclusive jurisdiction over any dispute arising
            from them, except where the law of your country of residence gives you the right to
            bring proceedings locally. Before starting any formal proceedings, please contact us so
            we can try to resolve the issue informally.
          </p>
        </Section>

        <Section title="15. Changes to these terms">
          <p>
            We may update these Terms from time to time. When we do, we will change the &ldquo;Last
            updated&rdquo; date above and, where the changes are material, let you know in the app.
            Your continued use of the Service after an update means you accept the revised Terms.
          </p>
        </Section>

        <Section title="16. General">
          <p>
            If any provision of these Terms is found unenforceable, the remaining provisions remain
            in effect. Our failure to enforce a provision is not a waiver of it. You may not assign
            these Terms without our consent; we may assign them in connection with a merger,
            acquisition or sale of assets. These Terms and the Privacy Policy are the entire
            agreement between you and French Coach regarding the Service.
          </p>
        </Section>

        <Section title="17. Contact us">
          <p>
            Questions about these Terms? Use <strong>Send feedback</strong> in the app (Profile
            &rarr; Help &amp; feedback) and leave an email address for the reply.
          </p>
        </Section>
      </div>
    </MarketingLayout>
  );
}
