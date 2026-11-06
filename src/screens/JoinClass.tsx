import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageShell } from '../components/layout/PageShell';
import { TopContextBar } from '../components/TopContextBar';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/auth/TextField';
import { InlineAlert } from '../components/auth/InlineAlert';
import { joinClass, previewClass, teacherErrorMessage, type ClassPreview } from '../services/teacher/teacherApi';
import { track } from '../services/telemetry/telemetryService';

const CODE_RE = /^[A-Z0-9]{6}$/;

function teachersOf(p: ClassPreview): string {
  const names = p.teacherNames.length > 0 ? p.teacherNames : [p.teacherName];
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * `/join` and `/join/:code` — a learner joins their teacher's class (teacher dashboard Stage 1).
 * The confirm step says exactly what the teacher will see, and from when (ADR 0015): joining is
 * the only thing that gives a teacher access, and leaving ends it.
 */
export function JoinClass() {
  const { code: linkCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [code, setCode] = useState((linkCode ?? '').toUpperCase());
  const [preview, setPreview] = useState<ClassPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState(false);

  const look = async (value: string) => {
    setBusy(true);
    setError(null);
    try {
      setPreview(await previewClass(value));
    } catch (err) {
      setPreview(null);
      setError(teacherErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const fromLink = (linkCode ?? '').toUpperCase();
    if (user && CODE_RE.test(fromLink)) void look(fromLink);
  }, [linkCode, user]);

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col">
        <TopContextBar title="Join a class" showBack />
        <PageShell maxWidth="sm">
          <InlineAlert>Sign in first — a class needs an account, so your teacher sees the right person.</InlineAlert>
          <Button onClick={() => navigate('/login')}>Sign in or create an account</Button>
        </PageShell>
      </div>
    );
  }

  const join = async () => {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      await joinClass(code);
      track({ name: 'class_joined', props: { via: linkCode ? 'link' : 'code', other_classes: preview.otherClassCount } });
      setJoined(true);
    } catch (err) {
      setError(teacherErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <TopContextBar title="Join a class" showBack />
      <PageShell maxWidth="sm" gap={16}>
        {joined && preview ? (
          <div className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5" role="status">
            <Users size={20} className="text-progress-text" aria-hidden="true" />
            <p className="text-section text-ink">You're in {preview.className}</p>
            <p className="text-body-s text-ink-muted">Homework from {teachersOf(preview)} will show on your Home screen.</p>
            <Button onClick={() => navigate('/')}>Go to Home</Button>
          </div>
        ) : preview ? (
          <div className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5">
            <div>
              <p className="text-eyebrow uppercase text-ink-subtle">{preview.examYear ? `Exam ${preview.examYear}` : 'Class'}</p>
              <p className="text-section text-ink mt-1">{preview.className}</p>
              <p className="text-body-s text-ink-muted">{preview.teacherNames.length > 1 ? 'Teachers' : 'Teacher'}: {teachersOf(preview)}</p>
            </div>
            {preview.isOwnClass ? (
              <InlineAlert>This is your own class — students join it with this code.</InlineAlert>
            ) : preview.alreadyMember ? (
              <InlineAlert tone="success">You're already in this class.</InlineAlert>
            ) : preview.classLimitReached ? (
              <InlineAlert>You're already in 5 classes, the most you can join. Leave one in Profile first.</InlineAlert>
            ) : (
              <>
                <div className="rounded-control bg-surface-recessed px-4 py-3 text-body-s text-ink-muted">
                  <p className="text-label text-ink">What {teachersOf(preview)} will see</p>
                  <ul className="mt-1 list-disc pl-5">
                    <li>When you practise, and how much</li>
                    <li>Your answers (what you said, as text) and their feedback</li>
                    <li>Your mock exam marks and transcripts</li>
                  </ul>
                  <p className="mt-2">Only from today — never your practice before joining. Your notebook and sound practice stay private. You can leave the class any time in Profile.</p>
                  {preview.otherClassCount > 0 && (
                    <p className="mt-2">You'll stay in your {preview.otherClassCount === 1 ? 'other class' : `${preview.otherClassCount} other classes`} too — each class's teachers see your practice from the day you joined theirs.</p>
                  )}
                </div>
                {error && <InlineAlert>{error}</InlineAlert>}
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => void join()} loading={busy}>Join {preview.className}</Button>
                  <Button variant="quiet" onClick={() => { setPreview(null); setCode(''); }}>Use another code</Button>
                </div>
              </>
            )}
          </div>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void look(code);
            }}
          >
            <p className="text-body-s text-ink-muted">Type the 6-character code your teacher gave you.</p>
            <TextField
              label="Class code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              autoComplete="off"
              autoCapitalize="characters"
              inputMode="text"
              error={error}
            />
            <Button type="submit" loading={busy} disabled={!CODE_RE.test(code)}>Find class</Button>
          </form>
        )}
      </PageShell>
    </div>
  );
}
