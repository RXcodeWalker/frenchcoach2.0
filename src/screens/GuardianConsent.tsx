import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { MarketingLayout } from '../components/layout/MarketingLayout';
import { grantGuardianConsent, GuardianActionError } from '../services/account/consentService';

const BREADCRUMB = [{ label: 'Home', href: '/' }, { label: 'Guardian Confirmation' }];

const RELATIONSHIPS = ['Parent', 'Legal guardian', 'Other'];

/**
 * Phase 1.6 Part C — the guardian's landing page (PublicRoutes-only, no
 * App.tsx route — see routes.ts's comment). Reached from the link a child's
 * account emails (or copies) to their guardian; the guardian is never
 * expected to have or need an account of their own (grant_guardian_consent
 * is anon-callable). Calling this "guardian confirmation," never
 * "verifiable parental consent" — see the plan's Part C / ADR 0006.
 */
export function GuardianConsent() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [relationship, setRelationship] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [granted, setGranted] = useState(false);

  async function handleConfirm() {
    if (!relationship || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await grantGuardianConsent(token, relationship);
      setGranted(true);
    } catch (err) {
      setError(
        err instanceof GuardianActionError && err.code === 'invalid_or_used_token'
          ? 'This link has already been used or has expired. Ask your child to send a new one from their account.'
          : 'Something went wrong. Try again, or ask your child to send a new link.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <MarketingLayout route="/guardian-consent" breadcrumb={BREADCRUMB}>
        <div className="max-w-[560px] mx-auto px-4 md:px-6 py-16 text-center">
          <AlertCircle className="mx-auto mb-3" size={28} style={{ color: 'var(--mk-ink-faint)' }} />
          <h1 className="font-display text-2xl mb-2">Missing confirmation link</h1>
          <p className="text-sm" style={{ color: 'var(--mk-ink-muted)' }}>
            This page needs the link from your child's Français AI account — open the one they
            sent you, or ask them to send it again.
          </p>
        </div>
      </MarketingLayout>
    );
  }

  if (granted) {
    return (
      <MarketingLayout route="/guardian-consent" breadcrumb={BREADCRUMB}>
        <div className="max-w-[560px] mx-auto px-4 md:px-6 py-16 text-center">
          <ShieldCheck className="mx-auto mb-3" size={28} style={{ color: 'var(--mk-accent)' }} />
          <h1 className="font-display text-2xl mb-2">Speaking practice is on</h1>
          <p className="text-sm" style={{ color: 'var(--mk-ink-muted)' }}>
            Thanks for confirming. Your child can now use speaking practice on Français AI. You
            can withdraw this at any time by contacting us — see our{' '}
            <a href="/privacy" className="mk-link">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout route="/guardian-consent" breadcrumb={BREADCRUMB}>
      <div className="max-w-[560px] mx-auto px-4 md:px-6 py-16">
        <h1 className="font-display text-2xl md:text-3xl mb-3">A learner has asked for your OK</h1>
        <p className="text-[15px] leading-relaxed mb-8" style={{ color: 'var(--mk-ink-muted)' }}>
          Your child (or someone in your care) started an account on Français AI, a French
          speaking-practice app, and told us they're under 13. Before speaking practice turns on
          for their account, we need you to confirm you're okay with what that involves.
        </p>

        <div className="rounded-2xl border mk-hairline mk-surface p-5 mb-8 space-y-3 text-sm" style={{ color: 'var(--mk-ink-muted)' }}>
          <p>
            <strong style={{ color: 'var(--mk-ink)' }}>What happens:</strong> their spoken French
            is recorded, sent to a transcription and AI-feedback service, and the resulting
            transcript and score are stored so they can track progress.
          </p>
          <p>
            <strong style={{ color: 'var(--mk-ink)' }}>Who else sees it:</strong> Groq, Google
            Gemini, and Microsoft Azure Speech process audio/text on our behalf to generate that
            feedback. Full detail in our{' '}
            <a href="/privacy" className="mk-link">
              Privacy Policy
            </a>
            .
          </p>
          <p>
            <strong style={{ color: 'var(--mk-ink)' }}>Your control:</strong> you can withdraw
            this at any time, which immediately erases their account and all its data.
          </p>
          <p className="text-xs" style={{ color: 'var(--mk-ink-faint)' }}>
            We call this "guardian confirmation" rather than a formal legal consent process — it's
            our early-access mechanism while we work with counsel on region-specific
            requirements.
          </p>
        </div>

        <div className="mb-6">
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--mk-ink)' }}>
            Your relationship to this learner
          </p>
          <div className="flex flex-wrap gap-2">
            {RELATIONSHIPS.map((r) => (
              <button
                key={r}
                onClick={() => setRelationship(r)}
                className="px-4 py-2 rounded-full text-xs font-semibold border transition-colors"
                style={
                  relationship === r
                    ? { background: 'var(--mk-accent)', color: 'var(--mk-bg)', borderColor: 'var(--mk-accent)' }
                    : { borderColor: 'var(--mk-hairline)', color: 'var(--mk-ink-muted)' }
                }
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm mb-4" style={{ color: '#f87171' }}>
            {error}
          </p>
        )}

        <button
          onClick={() => void handleConfirm()}
          disabled={!relationship || submitting}
          className="mk-cta px-6 py-3 rounded-full text-sm font-semibold disabled:opacity-50"
        >
          {submitting ? 'Confirming…' : "I confirm — turn on speaking practice"}
        </button>
      </div>
    </MarketingLayout>
  );
}
