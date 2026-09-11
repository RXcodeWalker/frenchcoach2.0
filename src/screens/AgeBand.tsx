import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ShieldCheck, ArrowLeft, Copy, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-sm rounded-2xl surface-raised p-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <AnimatePresence mode="wait">
          {step === 'select' && (
            <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="text-center mb-2">
                <h1 className="text-lg font-black text-white mb-1">One quick thing</h1>
                <p className="text-xs text-ink-subtle">This just helps us set up your account correctly.</p>
              </div>

              {error && <p className="text-[11px] text-red-400 text-center">{error}</p>}

              <button
                onClick={() => void choose13Plus()}
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 text-white text-sm font-bold disabled:opacity-60"
              >
                I'm 13 or older
              </button>
              <button
                onClick={() => setStep('confirm-under-13')}
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-navy-300 text-ink-subtle text-sm font-bold disabled:opacity-60"
              >
                I'm under 13
              </button>
            </motion.div>
          )}

          {step === 'confirm-under-13' && (
            <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <button
                onClick={() => setStep('select')}
                className="flex items-center gap-1.5 text-[11px] text-ink-subtle"
              >
                <ArrowLeft size={12} /> Back
              </button>
              <div>
                <h1 className="text-base font-black text-white mb-2">Just checking</h1>
                <p className="text-xs text-ink-subtle leading-relaxed">
                  If you're under 13, a parent or guardian will need to say it's okay by email
                  before speaking practice turns on. If you're actually 13 or older, go back and
                  pick that instead — it's quicker.
                </p>
              </div>

              {error && <p className="text-[11px] text-red-400">{error}</p>}

              <div className="space-y-2">
                <button
                  onClick={() => setStep('select')}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 text-white text-sm font-bold"
                >
                  I'm 13 or older
                </button>
                <button
                  onClick={() => void confirmUnder13()}
                  disabled={submitting}
                  className="w-full py-3.5 rounded-xl bg-navy-300 text-ink-subtle text-sm font-bold disabled:opacity-60"
                >
                  {submitting ? 'One moment…' : "Continue — I'm under 13"}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'guardian-email' && (
            <motion.form
              key="guardian-email"
              onSubmit={(e) => void submitGuardianEmail(e)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-3">
                  <Mail size={18} className="text-violet-400" />
                </div>
                <h1 className="text-base font-black text-white mb-1">Your parent or guardian's email</h1>
                <p className="text-xs text-ink-subtle leading-relaxed">
                  We'll send them a link to review what's collected and confirm. The app stays
                  fully usable while you wait — just speaking practice is switched off until then.
                </p>
              </div>

              <input
                type="email"
                required
                placeholder="parent@example.com"
                value={guardianEmail}
                onChange={(e) => setGuardianEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-navy-300 text-white placeholder:text-ink-subtle text-xs focus:outline-none focus:ring-1 focus:ring-violet-500/50"
              />

              {error && <p className="text-[11px] text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 text-white text-sm font-bold disabled:opacity-60"
              >
                {submitting ? 'Sending…' : 'Send request'}
              </button>
            </motion.form>
          )}

          {step === 'guardian-sent' && (
            <motion.div key="sent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                <ShieldCheck size={18} className="text-emerald-400" />
              </div>
              {emailSent ? (
                <>
                  <h1 className="text-base font-black text-white">Request sent</h1>
                  <p className="text-xs text-ink-subtle leading-relaxed">
                    We emailed <strong className="text-white">{guardianEmail}</strong>. Speaking
                    practice turns on as soon as they confirm.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-base font-black text-white">Almost there</h1>
                  <p className="text-xs text-ink-subtle leading-relaxed">
                    We couldn't send the email automatically. Copy this link and send it to your
                    parent or guardian yourself:
                  </p>
                  {consentLink && (
                    <button
                      onClick={copyLink}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-navy-300 text-[11px] text-ink-subtle break-all"
                    >
                      {copied ? <Check size={13} className="text-emerald-400 shrink-0" /> : <Copy size={13} className="shrink-0" />}
                      <span className="truncate">{copied ? 'Copied!' : consentLink}</span>
                    </button>
                  )}
                </>
              )}
              <button
                onClick={() => navigate('/', { replace: true })}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 text-white text-sm font-bold"
              >
                Continue to the app
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
