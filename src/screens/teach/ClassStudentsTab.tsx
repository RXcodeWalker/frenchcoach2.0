import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Download, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { TextField } from '../../components/auth/TextField';
import { InlineAlert } from '../../components/auth/InlineAlert';
import { SettingToggle } from '../../components/ui/SettingToggle';
import { assignmentStatus, buildExportRows, buildWeekRows, toCsv } from '../../domain/teacher/classInsights';
import { weekRange } from '../../domain/teacher/week';
import {
  archiveClass,
  removeClassMember,
  rotateClassCode,
  setClassCodeActive,
  teacherErrorMessage,
  updateClass,
} from '../../services/teacher/teacherApi';
import { track } from '../../services/telemetry/telemetryService';
import { type ClassData } from './useClassData';
import { EYEBROW, joinLink, shortDate } from './teachUtils';

/** The class itself: its join code, who is in it, its settings and the export. */
export function ClassStudentsTab({ data, onChanged }: { data: ClassData; onChanged: () => void }) {
  const navigate = useNavigate();
  const { klass } = data;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [name, setName] = useState(klass.name);
  const [examYear, setExamYear] = useState(klass.examYear ?? '');
  const [timezone, setTimezone] = useState(klass.timezone);
  const [digest, setDigest] = useState(klass.digestEnabled);
  const active = data.roster.filter((r) => r.status === 'active');
  const former = data.roster.filter((r) => r.status !== 'active');

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(teacherErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const copy = async (what: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(what === 'code' ? klass.joinCode : joinLink(klass.joinCode));
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard blocked; the code is on screen */
    }
  };

  const csv = useMemo(() => {
    const rows = buildWeekRows(data.roster, data.activity, data.exams, weekRange(new Date(), klass.timezone));
    const statuses = data.assignments.map((a) => assignmentStatus(a, data.roster, data.progress));
    return toCsv(buildExportRows(rows, data.exams, statuses));
  }, [data, klass.timezone]);

  const download = () => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${klass.name.replace(/[^\w\- ]+/g, '').trim() || 'class'} - ${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    track({ name: 'class_exported', props: {} });
  };

  return (
    <div className="flex flex-col gap-6">
      {error && <InlineAlert>{error}</InlineAlert>}

      <section className="rounded-card border border-hairline bg-surface p-5" aria-labelledby="code-h">
        <p id="code-h" className={EYEBROW}>Join code</p>
        {klass.codeActive ? (
          <>
            <p className="font-numeral text-display-l tracking-[0.18em] text-ink mt-2" data-testid="class-join-code">{klass.joinCode}</p>
            <p className="text-body-s text-ink-muted mt-2">
              Students sign in, open <span className="font-semibold">Profile → Join a class</span> and type this code — or open the link.
              They'll see that you can view their practice from today.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => void copy('code')}><Copy size={14} aria-hidden="true" /> {copied === 'code' ? 'Copied' : 'Copy code'}</Button>
              <Button variant="secondary" size="sm" onClick={() => void copy('link')}><Copy size={14} aria-hidden="true" /> {copied === 'link' ? 'Copied' : 'Copy join link'}</Button>
              <Button variant="quiet" size="sm" loading={busy === 'rotate'} onClick={() => void run('rotate', async () => { await rotateClassCode(klass.id); })}>
                <RefreshCw size={14} aria-hidden="true" /> New code
              </Button>
              <Button variant="quiet" size="sm" loading={busy === 'off'} onClick={() => void run('off', () => setClassCodeActive(klass.id, false))}>
                Stop new joins
              </Button>
            </div>
          </>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="text-body-s text-ink-muted">The code is off — nobody new can join.</p>
            <Button variant="secondary" size="sm" loading={busy === 'on'} onClick={() => void run('on', () => setClassCodeActive(klass.id, true))}>
              Turn joining back on
            </Button>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="roster-h">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="roster-h" className="text-section text-ink">Students ({active.length})</h2>
          <Button variant="secondary" size="sm" onClick={download} disabled={active.length === 0}>
            <Download size={14} aria-hidden="true" /> Export CSV
          </Button>
        </div>
        {active.length === 0 ? (
          <p className="text-body-s text-ink-muted">Nobody has joined yet.</p>
        ) : (
          <div className="overflow-hidden rounded-card border border-hairline">
            {active.map((r) => (
              <div key={r.studentId} className="flex items-center justify-between gap-3 border-t border-hairline px-4 py-2 first:border-t-0">
                <button
                  type="button"
                  className="min-w-0 text-left text-body-s text-ink hover:underline"
                  onClick={() => navigate(`/teach/class/${klass.id}/student/${r.studentId}`)}
                >
                  {r.displayName?.trim() || 'Unnamed student'}
                  <span className="text-caption text-ink-subtle"> · joined {shortDate(r.joinedAt)}</span>
                </button>
                <Button variant="quiet" size="sm" onClick={() => setRemoving({ id: r.studentId, name: r.displayName?.trim() || 'this student' })}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
        {former.length > 0 && (
          <p className="text-caption text-ink-subtle">
            {former.length} former {former.length === 1 ? 'member' : 'members'} (left or removed) — their practice is no longer visible to you.
          </p>
        )}
        <p className="text-caption text-ink-subtle">
          Names are the usernames students chose. A student without one shows as "Unnamed student" — ask them to set it in Profile.
        </p>
      </section>

      <section className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5" aria-labelledby="settings-h">
        <h2 id="settings-h" className="text-section text-ink">Class settings</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <TextField label="Class name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          <TextField label="Exam session" value={examYear} onChange={(e) => setExamYear(e.target.value)} maxLength={20} />
          <TextField label="Time zone" hint="Weeks run Monday to Sunday here" value={timezone} onChange={(e) => setTimezone(e.target.value)} maxLength={64} />
        </div>
        <SettingToggle
          icon={null}
          label="Monday email"
          description="A five-line summary each Monday: who didn't practise, counted mocks, the most common slip."
          enabled={digest}
          onToggle={() => setDigest((d) => !d)}
        />
        <div>
          <Button
            loading={busy === 'save'}
            disabled={!name.trim()}
            onClick={() => void run('save', () => updateClass({ id: klass.id, name, examYear, timezone, digestEnabled: digest }))}
          >
            Save settings
          </Button>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-hairline bg-surface-recessed p-5">
        <div>
          <p className="text-label text-ink">Archive this class</p>
          <p className="text-caption text-ink-muted">Ends every membership and turns off the code. Your marks stay with you.</p>
        </div>
        <Button variant="destructive" onClick={() => setArchiving(true)}>Archive class</Button>
      </section>

      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title="Remove from class?"
        footer={
          <>
            <Button variant="quiet" onClick={() => setRemoving(null)}>Cancel</Button>
            <Button
              variant="danger"
              loading={busy === 'remove'}
              onClick={() => {
                const target = removing;
                setRemoving(null);
                if (target) void run('remove', () => removeClassMember(klass.id, target.id));
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="text-body-s text-ink-muted">
          You'll stop seeing {removing?.name}'s practice straight away. They can rejoin with the code if you give it to them.
        </p>
      </Modal>

      <Modal
        open={archiving}
        onClose={() => setArchiving(false)}
        title="Archive this class?"
        footer={
          <>
            <Button variant="quiet" onClick={() => setArchiving(false)}>Cancel</Button>
            <Button
              variant="danger"
              loading={busy === 'archive'}
              onClick={async () => {
                setBusy('archive');
                try {
                  await archiveClass(klass.id);
                  navigate('/teach');
                } catch (err) {
                  setError(teacherErrorMessage(err));
                  setArchiving(false);
                } finally {
                  setBusy(null);
                }
              }}
            >
              Archive
            </Button>
          </>
        }
      >
        <p className="text-body-s text-ink-muted">Every student leaves the class and you stop seeing their practice. This can't be undone.</p>
      </Modal>
    </div>
  );
}
