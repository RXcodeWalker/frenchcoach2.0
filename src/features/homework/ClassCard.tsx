import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, LogOut, Users } from 'lucide-react';
import { SettingGroup, SettingRow } from '../../components/ui/SettingToggle';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { resolveFeatureStatus } from '../../config/featureFlags';
import {
  getMyClass,
  getMySharedTeacherMarks,
  getMyTeacherProfile,
  leaveClass,
  type MyClass,
  type SharedTeacherMark,
} from '../../services/teacher/teacherApi';
import { track } from '../../services/telemetry/telemetryService';

type Load = { status: 'loading' } | { status: 'unavailable' } | { status: 'ready'; klass: MyClass | null; marks: SharedTeacherMark[]; isTeacher: boolean };

/**
 * Profile's "Your class" group (teacher dashboard). Join or leave a class, see marks a
 * teacher chose to share, and — for a teacher account — the way into the teacher area.
 * Hidden for guests and whenever the class service can't be read.
 */
export function ClassCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const live = resolveFeatureStatus('teacherDashboard') === 'live';
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!user || !live) return;
    let cancelled = false;
    Promise.all([getMyClass(), getMySharedTeacherMarks(), getMyTeacherProfile(user.id)])
      .then(([klass, marks, teacher]) => {
        if (!cancelled) setLoad({ status: 'ready', klass, marks, isTeacher: teacher !== null });
      })
      .catch(() => {
        if (!cancelled) setLoad({ status: 'unavailable' });
      });
    return () => {
      cancelled = true;
    };
  }, [user, live, nonce]);

  if (!user || !live || load.status !== 'ready') return null;
  const { klass, marks, isTeacher } = load;

  return (
    <SettingGroup title="Your class" testId="profile-class">
      {klass ? (
        <>
          <SettingRow
            icon={<Users size={16} />}
            label={klass.className}
            description={`${klass.teacherName} sees your practice, answers and exam marks from ${new Date(klass.joinedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}.`}
          />
          {marks.slice(0, 3).map((m) => (
            <SettingRow
              key={m.attemptId}
              divided
              icon={<GraduationCap size={16} />}
              label={`${m.teacherName} marked a mock exam: ${m.total}/40`}
              description={new Date(m.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + markComments(m)}
            />
          ))}
          <SettingRow divided icon={<LogOut size={16} />} label="Leave class" description="Your teacher stops seeing your practice straight away" onClick={() => setConfirmLeave(true)} />
        </>
      ) : (
        <SettingRow
          icon={<Users size={16} />}
          label="Join a class"
          description="Got a code from your teacher? They'll see your practice and set you homework."
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
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        title="Leave this class?"
        footer={
          <>
            <Button variant="quiet" onClick={() => setConfirmLeave(false)}>Stay</Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await leaveClass();
                  track({ name: 'class_left', props: {} });
                  setConfirmLeave(false);
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
        <p className="text-body-s text-ink-muted">Your practice stays yours. You can rejoin with the class code later.</p>
      </Modal>
    </SettingGroup>
  );
}

function markComments(m: SharedTeacherMark): string {
  const marks = (m.markSet as { marks?: { comment?: unknown }[] } | null)?.marks ?? [];
  const comments = marks.map((x) => (typeof x.comment === 'string' ? x.comment.trim() : '')).filter(Boolean);
  return comments.length > 0 ? ` · “${comments[0].slice(0, 120)}${comments[0].length > 120 ? '…' : ''}”` : '';
}
