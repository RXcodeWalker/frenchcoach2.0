import { useEffect, useState, type FormEvent } from 'react';
import { Mail, Users } from 'lucide-react';
import { SettingGroup, SettingRow, SettingToggle } from '../../components/ui/SettingToggle';
import { Button } from '../../components/ui/Button';
import {
  DEFAULT_EMAIL_REPORT_SETTINGS,
  loadEmailReportSettings,
  normaliseParentEmail,
  saveEmailReportSettings,
  type EmailReportSettings,
} from '../../services/notifications/emailReportSettings';

const INPUT = 'h-11 w-full rounded-control border border-hairline-strong bg-surface px-3 text-[16px] text-ink placeholder:text-ink-subtle transition-colors duration-state ease-smooth hover:border-ink-subtle focus:border-action';

/**
 * Profile → Weekly progress email (docs/systems/retention-notifications.md §4):
 * the learner's own Sunday summary, and an optional copy for a parent or
 * guardian. Every change is saved straight to the server, and the row only
 * shows a change once the save landed.
 */
export function WeeklyEmailSettings({ userId, accountEmail }: { userId: string; accountEmail: string | null }) {
  const [settings, setSettings] = useState<EmailReportSettings | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void loadEmailReportSettings(userId).then(s => {
      if (!live) return;
      if (s) setSettings(s);
      else setLoadFailed(true);
    });
    return () => { live = false; };
  }, [userId]);

  async function save(next: EmailReportSettings): Promise<boolean> {
    setBusy(true);
    setError(null);
    const ok = await saveEmailReportSettings(userId, next);
    setBusy(false);
    if (ok) setSettings(next);
    else setError("Couldn't save that. Check your connection and try again.");
    return ok;
  }

  async function submitParent(e: FormEvent) {
    e.preventDefault();
    const email = normaliseParentEmail(draft);
    if (!email) {
      setError('Enter a full email address, like parent@example.com.');
      return;
    }
    if (accountEmail && email === accountEmail.toLowerCase()) {
      setError("That's your own address. You already get your copy.");
      return;
    }
    if (await save({ ...(settings ?? DEFAULT_EMAIL_REPORT_SETTINGS), parentEmail: email })) {
      setEditing(false);
      setDraft('');
    }
  }

  if (loadFailed) return null;
  const s = settings ?? DEFAULT_EMAIL_REPORT_SETTINGS;

  return (
    <SettingGroup title="Weekly progress email" testId="weekly-email-settings">
      <SettingToggle
        icon={<Mail size={16} />}
        label="Your week in French"
        description="Sunday evening: days practised, scores, and your one fix for next week"
        enabled={s.weeklyReport}
        disabled={!settings || busy}
        onToggle={() => void save({ ...s, weeklyReport: !s.weeklyReport })}
        testId="weekly-email-toggle"
      />
      {s.parentEmail && !editing ? (
        <SettingRow
          divided
          icon={<Users size={16} />}
          label="Parent or guardian copy"
          description={<>Sent to <span className="font-semibold text-ink">{s.parentEmail}</span></>}
          trailing={
            <span className="flex shrink-0 gap-1">
              <Button variant="quiet" size="sm" disabled={busy} onClick={() => { setDraft(s.parentEmail ?? ''); setEditing(true); setError(null); }}>Change</Button>
              <Button variant="quiet" size="sm" disabled={busy} onClick={() => void save({ ...s, parentEmail: null })}>Remove</Button>
            </span>
          }
        />
      ) : editing ? (
        <form onSubmit={e => void submitParent(e)} className="flex flex-col gap-2 border-t border-hairline px-4 py-3">
          <label htmlFor="parent-report-email" className="text-[13px] text-ink-muted">
            They get a short summary each Sunday: days practised, answers and what you're working on. Never your recordings or answers. They can stop it with one click.
          </label>
          <input
            id="parent-report-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="parent@example.com"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className={INPUT}
          />
          {error && <p role="alert" className="text-[13px] text-correction-text">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
            <Button variant="quiet" size="sm" onClick={() => { setEditing(false); setError(null); }}>Cancel</Button>
          </div>
        </form>
      ) : (
        <SettingRow
          divided
          icon={<Users size={16} />}
          label="Send a copy to a parent"
          description="Optional. Every Sunday, with a private link to your progress page. People who see your progress help you keep going"
          onClick={settings ? () => { setEditing(true); setError(null); } : undefined}
          testId="weekly-email-add-parent"
        />
      )}
      {error && !editing && <p role="alert" className="border-t border-hairline px-4 py-2 text-[13px] text-correction-text">{error}</p>}
    </SettingGroup>
  );
}
