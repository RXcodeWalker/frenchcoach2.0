import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, LogOut, Plus, Users } from 'lucide-react';
import { SettingGroup, SettingRow } from '../../components/ui/SettingToggle';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { resolveFeatureStatus } from '../../config/featureFlags';
import {
  getMyClasses,
  getMySharedTeacherMarks,
  getMyTeacherProfile,
  leaveClass,
  type MyClass,
  type SharedTeacherMark,
} from '../../services/teacher/teacherApi';
import { track } from '../../services/telemetry/telemetryService';

/** A learner may be in this many classes at once (the server's join_class cap). */
export const MAX_CLASSES_PER_STUDENT = 5;

type Load = { status: 'loading' } | { status: 'unavailable' } | { status: 'ready'; classes: MyClass[]; marks: SharedTeacherMark[]; isTeacher: boolean };

function teachersLine(c: MyClass): string {
  const names = c.teacherNames.length > 0 ? c.teacherNames : [c.teacherName];
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * Profile's "Your classes" group (teacher dashboard). Join (up to five) or leave classes, see
 * marks a teacher chose to share, and — for a teacher account — the way into the teacher area.
 * Hidden for guests and whenever the class service can't be read.
 */
export function ClassCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const live = resolveFeatureStatus('teacherDashboard') === 'live';
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [leaving, setLeaving] = useState<MyClass | null>(null);
  const [busy, setBusy] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!user || !live) return;
    let cancelled = false;
    Promise.all([getMyClasses(), getMySharedTeacherMarks(), getMyTeacherProfile(user.id)])
      .then(([classes, marks, teacher]) => {
        if (!cancelled) setLoad({ status: 'ready', classes, marks, isTeacher: teacher !== null });
      })
      .catch(() => {
        if (!cancelled) setLoad({ status: 'unavailable' });
      });
    return () => {
      cancelled = true;
    };
  }, [user, live, nonce]);

  if (!user || !live || load.status !== 'ready') return null;
  const { classes, marks, isTeacher } = load;
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

  return (
    <SettingGroup title={classes.length > 1 ? 'Your classes' : 'Your class'} testId="profile-class">
      {classes.map((c, i) => (
        <SettingRow
          key={c.classId}
          divided={i > 0}
          icon={<Users size={16} />}
          label={c.className}
          description={`${teachersLine(c)} ${c.teacherNames.length > 1 ? 'see' : 'sees'} your practice, answers and exam marks from ${fmt(c.joinedAt)}.`}
          trailing={
            <Button variant="quiet" size="sm" onClick={() => setLeaving(c)} aria-label={`Leave ${c.className}`}>
              <LogOut size={14} aria-hidden="true" /> Leave
            </Button>
          }
        />
      ))}
      {marks.slice(0, 3).map((m) => (
        <SettingRow
          key={m.attemptId}
          divided
          icon={<GraduationCap size={16} />}
          label={`${m.teacherName} marked a mock exam: ${m.total}/40`}
          description={fmt(m.updatedAt) + markComments(m)}
        />
      ))}
      {classes.length < MAX_CLASSES_PER_STUDENT && (
        <SettingRow
          divided={classes.length > 0 || marks.length > 0}
          icon={classes.length === 0 ? <Users size={16} /> : <Plus size={16} />}
          label={classes.length === 0 ? 'Join a class' : 'Join another class'}
          description={
            classes.length === 0
              ? "Got a code from your teacher? They'll see your practice and set you homework."
              : `You can be in up to ${MAX_CLASSES_PER_STUDENT} classes — one for each teacher or subject.`
          }
          onClick={() => navigate('/join')}
          testId="profile-join-class"
        />
      )}
      <SettingRow
        divided
        icon={<GraduationCap size={16} />}
        label={isTeacher ? 'Teacher dashboard' : 'I’m a teacher'}
        description={isTeacher ? 'Your classes, homework and marking' : 'Set up a teacher account with an invite code'}
        onClick={() => navigate('/teach')}
      />
      <Modal
        open={leaving !== null}
        onClose={() => setLeaving(null)}
        title={`Leave ${leaving?.className ?? 'this class'}?`}
        footer={
          <>
            <Button variant="quiet" onClick={() => setLeaving(null)}>Stay</Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={async () => {
                if (!leaving) return;
                setBusy(true);
                try {
                  await leaveClass(leaving.classId);
                  track({ name: 'class_left', props: {} });
                  setLeaving(null);
                  setNonce((n) => n + 1);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Leave class
            </Button>
          </>
        }
      >
        <p className="text-body-s text-ink-muted">
          {leaving ? teachersLine(leaving) : 'Your teacher'} will stop seeing your practice straight away. Your other classes
          aren't affected, and you can rejoin with the class code later.
        </p>
      </Modal>
    </SettingGroup>
  );
}

function markComments(m: SharedTeacherMark): string {
  const marks = (m.markSet as { marks?: { comment?: unknown }[] } | null)?.marks ?? [];
  const comments = marks.map((x) => (typeof x.comment === 'string' ? x.comment.trim() : '')).filter(Boolean);
  return comments.length > 0 ? ` · “${comments[0].slice(0, 120)}${comments[0].length > 120 ? '…' : ''}”` : '';
}
