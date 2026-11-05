import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { TextField } from '../../components/auth/TextField';
import { InlineAlert } from '../../components/auth/InlineAlert';
import {
  createClass,
  getMyTeacherProfile,
  joinClassAsTeacher,
  listMyClasses,
  redeemTeacherInvite,
  teacherErrorMessage,
  type ClassRow,
  type TeacherProfile,
} from '../../services/teacher/teacherApi';
import { track } from '../../services/telemetry/telemetryService';

const EYEBROW = 'text-eyebrow uppercase text-ink-subtle';

function defaultTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London';
  } catch {
    return 'Europe/London';
  }
}

/** `/teach` — become a teacher (invite code), then your classes. */
export function TeachHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<TeacherProfile | null | undefined>(undefined);
  const [classes, setClasses] = useState<ClassRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const p = await getMyTeacherProfile(user.id);
      setProfile(p);
      if (p) setClasses(await listMyClasses());
    } catch (err) {
      setProfile(null);
      setError(teacherErrorMessage(err));
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (profile === undefined) {
    return <p className="text-body-s text-ink-muted">Loading…</p>;
  }

  if (profile === null) {
    return <BecomeTeacher error={error} onDone={() => void load()} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className={EYEBROW}>{profile.schoolName ?? 'Your classes'}</p>
        <h1 className="text-title text-ink mt-1">Bonjour, {profile.displayName}</h1>
        <p className="text-body-s text-ink-muted mt-1">
          See who is practising, what your class keeps getting wrong, set speaking homework and check the AI's marks.
        </p>
      </div>
      {error && <InlineAlert>{error}</InlineAlert>}

      {classes && classes.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {classes.map((c) => (
            <Card
              key={c.id}
              interactive
              onClick={() => navigate(`/teach/class/${c.id}`)}
              eyebrow={[c.examYear ? `Exam ${c.examYear}` : 'Class', c.myRole === 'co_teacher' ? `Co-teacher with ${c.ownerName ?? 'the owner'}` : null].filter(Boolean).join(' · ')}
              title={c.name}
              meta={<span className="font-numeral tracking-[0.12em]">{c.codeActive ? c.joinCode : 'Code off'}</span>}
            />
          ))}
        </div>
      )}

      <CreateClassCard
        firstClass={!classes || classes.length === 0}
        onCreated={(id) => navigate(`/teach/class/${id}?tab=students`)}
      />
      <JoinAsCoTeacherCard onJoined={(id) => navigate(`/teach/class/${id}`)} />
    </div>
  );
}

/** A teacher joins a colleague's class with the class's co-teacher code ("T-" + 6 characters). */
function JoinAsCoTeacherCard({ onJoined }: { onJoined: (classId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('T-');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!open) {
    return (
      <div>
        <Button variant="quiet" onClick={() => setOpen(true)}>
          <Users size={16} aria-hidden="true" /> Join a colleague's class as co-teacher
        </Button>
      </div>
    );
  }
  const valid = /^T-[A-Z0-9]{6}$/.test(code);
  return (
    <Card eyebrow="Co-teaching" title="Join a colleague's class">
      <form
        className="mt-3 flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            const classId = await joinClassAsTeacher(code);
            track({ name: 'co_teacher_joined', props: {} });
            onJoined(classId);
          } catch (err) {
            setError(teacherErrorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <TextField
          label="Co-teacher code"
          hint="Your colleague finds it in their class under Students & code → Teachers. It starts with T-."
          value={code}
          onChange={(e) => {
            const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
            setCode(raw.startsWith('T-') ? raw.slice(0, 8) : `T-${raw.replace(/^T-?/, '').replace(/-/g, '')}`.slice(0, 8));
          }}
          autoComplete="off"
        />
        {error && <InlineAlert>{error}</InlineAlert>}
        <div className="flex items-center gap-3">
          <Button type="submit" loading={busy} disabled={!valid}>Join as co-teacher</Button>
          <Button variant="quiet" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
        <p className="text-caption text-ink-subtle">
          You'll see the class's students and practice, set homework and mark attempts, just like its owner. Only the owner
          can archive the class or add and remove teachers.
        </p>
      </form>
    </Card>
  );
}

function BecomeTeacher({ error, onDone }: { error: string | null; onDone: () => void }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setFormError(null);
    try {
      await redeemTeacherInvite(code, name, school);
      onDone();
    } catch (err) {
      setFormError(teacherErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-[520px] flex-col gap-5">
      <div>
        <p className={EYEBROW}>Teacher dashboard</p>
        <h1 className="text-title text-ink mt-1">Set up your teacher account</h1>
        <p className="text-body-s text-ink-muted mt-1">
          Teacher accounts are invite-only while we pilot. Enter the teacher code you were given and the name your
          students will see.
        </p>
      </div>
      {error && <InlineAlert>{error}</InlineAlert>}
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <TextField label="Teacher code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoComplete="off" required />
        <TextField label="Your name, as students will see it" hint="For example: Ms Dupont" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
        <TextField label="School (optional)" value={school} onChange={(e) => setSchool(e.target.value)} maxLength={100} />
        {formError && <InlineAlert>{formError}</InlineAlert>}
        <Button type="submit" loading={busy} disabled={!code.trim() || !name.trim()}>
          Become a teacher
        </Button>
      </form>
      <p className="text-caption text-ink-subtle">
        No code? Ask the app owner for a pilot invite. Students never need a teacher code — they join your class with
        a class code.
      </p>
    </div>
  );
}

function CreateClassCard({ firstClass, onCreated }: { firstClass: boolean; onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(firstClass);
  const [name, setName] = useState('');
  const [examYear, setExamYear] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (firstClass) setOpen(true);
  }, [firstClass]);

  if (!open) {
    return (
      <div>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          <Plus size={16} aria-hidden="true" /> New class
        </Button>
      </div>
    );
  }

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const { classId } = await createClass(name, examYear, defaultTimeZone());
      track({ name: 'teacher_class_created', props: {} });
      onCreated(classId);
    } catch (err) {
      setError(teacherErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card eyebrow={firstClass ? 'Start here' : 'New class'} title={firstClass ? 'Create your first class' : 'Create a class'}>
      <form
        className="mt-3 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <TextField label="Class name" hint="For example: Year 11 French — set 2" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
        <TextField label="Exam session (optional)" hint="For example: June 2027" value={examYear} onChange={(e) => setExamYear(e.target.value)} maxLength={20} />
        {error && <InlineAlert>{error}</InlineAlert>}
        <div className="flex items-center gap-3">
          <Button type="submit" loading={busy} disabled={!name.trim()}>
            <Users size={16} aria-hidden="true" /> Create class
          </Button>
          {!firstClass && (
            <Button variant="quiet" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          )}
        </div>
        <p className="text-caption text-ink-subtle">You get a 6-letter join code to put on the board. Students see their practice, you see it too.</p>
      </form>
    </Card>
  );
}
