import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ShieldCheck, ArrowLeft, Copy, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthShell } from '../components/auth/AuthShell';
import { TextField } from '../components/auth/TextField';
import { InlineAlert } from '../components/auth/InlineAlert';
import { Button } from '../components/ui/Button';
import { track } from '../services/telemetry/telemetryService';
import {
  setAgeBand,
  requestGuardianConsent,
  sendGuardianConsentEmail,
  buildGuardianConsentLink,
  ConsentError,
} from '../services/account/consentService';

type Step = 'select' | 'confirm-under-13' | 'guardian-email' | 'guardian-sent';

/**
 * Phase 1.6 Part C — the one-time neutral age-band step. Gated in front of
 * everything else by AgeBandCheck (App.tsx). No date of birth, no age
 * block: everyone proceeds to the app either way. Selecting "under 13"
 * adds one interstitial ("are you sure?") and then a guardian-email step
 * before the account becomes fully usable for speaking — the account
 * itself is created already (signup already happened) and the app stays
 * fully browsable throughout, per the plan.
 */
export function AgeBand() {
  const navigate = useNavigate();
  const { refreshConsentStatus } = useAuth();
  const [step, setStep] = useState<Step>('select');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consentLink, setConsentLink] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [copied, setCopied] = useState(false);

  async function choose13Plus() {
    setSubmitting(true);
    setError(null);
    try {
      await setAgeBand('13_plus');
      track({ name: 'age_band_set', props: { age_band: '13_plus' } });
      await refreshConsentStatus();
      navigate('/', { replace: true });
    } catch {
      setError('Something went wrong. Try again.');
      setSubmitting(false);
    }
  }

  async function confirmUnder13() {
    setSubmitting(true);
    setError(null);
    try {
      await setAgeBand('under_13');
      track({ name: 'age_band_set', props: { age_band: 'under_13' } });
      await refreshConsentStatus();
      setStep('guardian-email');
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitGuardianEmail(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { token } = await requestGuardianConsent(guardianEmail);
      const link = buildGuardianConsentLink(token);
      setConsentLink(link);
      const sent = await sendGuardianConsentEmail(guardianEmail, token);
      setEmailSent(sent);
      setStep('guardian-sent');
    } catch (err) {
      setError(
        err instanceof ConsentError && err.code === 'invalid_email'
          ? 'Enter a valid email address.'
          : 'Something went wrong. Try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function copyLink() {
    if (!consentLink) return;
    void navigator.clipboard.writeText(consentLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const titles: Record<Step, { title: string; subtitle: string }> = {
    select: { title: 'One quick thing', subtitle: 'This just helps us set up your account correctly.' },
    'confirm-under-13': { title: 'Just checking', subtitle: 'Make sure we have the right option.' },
    'guardian-email': { title: "Your parent or guardian's email", subtitle: 'They can switch speaking practice on for you.' },
    'guardian-sent': { title: emailSent || !consentLink ? 'Request sent' : 'Almost there', subtitle: 'Nothing else is needed from you right now.' },
  };

  return (
    <AuthShell title={titles[step].title} subtitle={titles[step].subtitle}>
      {step === 'select' && (
        <div className="space-y-3">
          {error && <InlineAlert>{error}</InlineAlert>}
          <Button size="lg" className="w-full" onClick={() => void choose13Plus()} loading={submitting}>
            I'm 13 or older
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => setStep('confirm-under-13')}
            disabled={submitting}
          >
            I'm under 13
          </Button>
        </div>
      )}

      {step === 'confirm-under-13' && (
        <div className="space-y-4">
          <Button variant="quiet" size="sm" className="-ml-2" onClick={() => setStep('select')}>
            <ArrowLeft size={16} aria-hidden="true" /> Back
          </Button>
          <p className="text-body-s text-ink-muted">
            If you're under 13, a parent or guardian will need to say it's okay by email
            before speaking practice turns on. If you're actually 13 or older, go back and
            pick that instead — it's quicker.
          </p>
          {error && <InlineAlert>{error}</InlineAlert>}
          <div className="space-y-2">
            <Button size="lg" className="w-full" onClick={() => setStep('select')}>
              I'm 13 or older
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => void confirmUnder13()}
              loading={submitting}
            >
              Continue — I'm under 13
            </Button>
          </div>
        </div>
      )}

      {step === 'guardian-email' && (
        <form onSubmit={(e) => void submitGuardianEmail(e)} className="space-y-4">
          <p className="flex items-start gap-2.5 rounded-control bg-action-soft p-3 text-body-s text-ink-muted">
            <Mail size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-action-text" />
            We'll send them a link to review what's collected and confirm. The app stays
            fully usable while you wait — just speaking practice is switched off until then.
          </p>
          <TextField
            label="Parent or guardian email"
            type="email"
            required
            autoComplete="off"
            placeholder="parent@example.com"
            value={guardianEmail}
            onChange={(e) => setGuardianEmail(e.target.value)}
          />
          {error && <InlineAlert>{error}</InlineAlert>}
          <Button type="submit" size="lg" className="w-full" loading={submitting}>
            Send request
          </Button>
        </form>
      )}

      {step === 'guardian-sent' && (
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-control bg-progress-soft p-3 text-body-s text-progress-text">
            <ShieldCheck size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
            {emailSent ? (
              <p>
                We emailed <strong className="font-semibold">{guardianEmail}</strong>. Speaking
                practice turns on as soon as they confirm.
              </p>
            ) : (
              <p>
                We couldn't send the email automatically. Copy this link and send it to your
                parent or guardian yourself.
              </p>
            )}
          </div>
          {!emailSent && consentLink && (
            <Button variant="secondary" className="w-full" onClick={copyLink}>
              {copied ? (
                <Check size={16} aria-hidden="true" className="shrink-0 text-progress-text" />
              ) : (
                <Copy size={16} aria-hidden="true" className="shrink-0" />
              )}
              <span className="truncate">{copied ? 'Copied!' : consentLink}</span>
            </Button>
          )}
          <Button size="lg" className="w-full" onClick={() => navigate('/', { replace: true })}>
            Continue to the app
          </Button>
        </div>
      )}
    </AuthShell>
  );
}
