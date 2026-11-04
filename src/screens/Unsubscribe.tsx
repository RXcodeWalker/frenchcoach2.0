import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, MailX } from 'lucide-react';
import { MarketingLayout } from '../components/layout/MarketingLayout';
import { unsubscribeEmailReport, type UnsubscribeResult } from '../services/notifications/emailReportSettings';

const BREADCRUMB = [{ label: 'Home', href: '/' }, { label: 'Email preferences' }];

const COPY: Record<Exclude<UnsubscribeResult, 'error'>, { title: string; body: string }> = {
  student: {
    title: "You won't get the weekly email any more",
    body: 'Your weekly progress email is off. You can turn it back on any time in Profile → Weekly progress email.',
  },
  parent: {
    title: 'Done. No more weekly summaries',
    body: "We won't send weekly progress summaries to this address again, even if it is added again.",
  },
  unknown: {
    title: 'This link has expired',
    body: 'It may be from an older email, or the address it was sent to has changed. Nothing was changed.',
  },
};

/**
 * The weekly email's "Stop these emails" link (docs/systems/retention-notifications.md §4).
 * Reachable signed in or out (a parent never has an account), so it lives in
 * PublicRoutes as well as App.tsx and depends on no app state. One click is
 * enough: the token itself is the authorisation.
 */
export function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get('t') ?? '';
  const [result, setResult] = useState<UnsubscribeResult | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;
    void unsubscribeEmailReport(token).then(setResult);
  }, [token]);

  const state: UnsubscribeResult | 'missing' | 'working' = !token ? 'missing' : result ?? 'working';
  const copy =
    state === 'missing' ? { title: 'Missing unsubscribe link', body: 'Open the "Stop these emails" link from the email itself.' }
    : state === 'working' ? { title: 'Updating your email preferences…', body: '' }
    : state === 'error' ? { title: "Couldn't update that just now", body: 'Check your connection and open the link again. Nothing was changed.' }
    : COPY[state];
  const ok = state === 'student' || state === 'parent';
  const Icon = ok ? MailX : AlertCircle;

  return (
    <MarketingLayout route="/unsubscribe" breadcrumb={BREADCRUMB}>
      <div className="max-w-[560px] mx-auto px-4 md:px-6 py-16 text-center" aria-live="polite">
        {state !== 'working' && <Icon className="mx-auto mb-3" size={28} style={{ color: ok ? 'var(--mk-accent)' : 'var(--mk-ink-faint)' }} />}
        <h1 className="font-display text-2xl mb-2">{copy.title}</h1>
        {copy.body && <p className="text-sm" style={{ color: 'var(--mk-ink-muted)' }}>{copy.body}</p>}
      </div>
    </MarketingLayout>
  );
}
