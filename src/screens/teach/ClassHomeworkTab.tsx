import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Segmented } from '../../components/ui/Segmented';
import { TextField } from '../../components/auth/TextField';
import { InlineAlert } from '../../components/auth/InlineAlert';
import { TOPICS } from '../../data/gameData';
import { STORY_CARDS } from '../../data/storyCards';
import { isTopicVisible } from '../../features/learn/sessionSetup';
import { HOMEWORK_MAX_LEARN_ANSWERS, dueLabel } from '../../features/homework/homework';
import { assignmentStatus, type AssignmentStatus, type HomeworkState } from '../../domain/teacher/classInsights';
import {
  archiveAssignment,
  createAssignment,
  teacherErrorMessage,
  type AssignmentKind,
  type AssignmentRow,
} from '../../services/teacher/teacherApi';
import { track } from '../../services/telemetry/telemetryService';
import { EmptyState } from './teachShared';
import { EYEBROW, cardTitle, relativeDay, topicName } from './teachUtils';
import { type ClassData } from './useClassData';

const KIND_LABEL: Record<AssignmentKind, string> = {
  learn_topic: 'Learn topic',
  role_play: 'Role-play card',
  mock_exam: 'Mock exam',
};

const STATE_LABEL: Record<HomeworkState, string> = {
  done: 'Done',
  late: 'Done late',
  in_progress: 'Started',
  not_started: 'Not started',
};

const STATE_CLASS: Record<HomeworkState, string> = {
  done: 'text-progress-text',
  late: 'text-reward-text',
  in_progress: 'text-info-text',
  not_started: 'text-correction-text',
};

function defaultDue(): string {
  const d = new Date(Date.now() + 7 * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Q3 — did they do what I set? Set homework, and see who has done it (derived, never stored). */
export function ClassHomeworkTab({ data, onChanged }: { data: ClassData; onChanged: () => void }) {
  const [creating, setCreating] = useState(data.assignments.length === 0);
  const statuses = useMemo(
    () =>
      new Map(
        data.assignments.map((a) => [
          a.id,
          assignmentStatus(a, data.roster, data.progress, STORY_CARDS.find((c) => c.id === a.rolePlayCardId)?.tasks.length ?? 5),
        ]),
      ),
    [data],
  );
  const active = data.roster.filter((r) => r.status === 'active');

  return (
    <div className="flex flex-col gap-5">
      {creating ? (
        <NewHomework data={data} onCancel={data.assignments.length > 0 ? () => setCreating(false) : undefined} onCreated={() => { setCreating(false); onChanged(); }} />
      ) : (
        <div>
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} aria-hidden="true" /> Set homework
          </Button>
        </div>
      )}

      {data.assignments.length === 0 ? (
        !creating && <EmptyState title="No homework set yet" />
      ) : (
        <div className="flex flex-col gap-3">
          {data.assignments.map((a) => (
            <AssignmentCard
              key={a.id}
              assignment={a}
              status={statuses.get(a.id)!}
              names={new Map(active.map((r) => [r.studentId, r.displayName?.trim() || 'Unnamed student']))}
              onArchived={onChanged}
            />
          ))}
        </div>
      )}
      <p className="text-caption text-ink-subtle">
        Homework never uses up a student's own daily answers or weekly exam: a Learn set allows its own answers (up to the
        number you set, plus two retries), and a mock exam allows one marked attempt. Students see it on their Home screen.
      </p>
    </div>
  );
}

function AssignmentCard({ assignment: a, status, names, onArchived }: {
  assignment: AssignmentRow;
  status: AssignmentStatus;
  names: Map<string, string>;
  onArchived: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const what =
    a.kind === 'learn_topic' ? `${topicName(a.topicKey)} · ${a.questionCount} ${a.questionCount === 1 ? 'answer' : 'answers'}`
      : a.kind === 'role_play' ? cardTitle(a.rolePlayCardId)
        : 'Exam Sim, marked /40';
  const finished = status.done + status.late;
  return (
    <div className="rounded-card border border-hairline bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <p className={EYEBROW}>{KIND_LABEL[a.kind]} · {dueLabel(a.dueAt)}</p>
          <p className="text-label text-ink mt-1">{a.title}</p>
          <p className="text-caption text-ink-muted mt-0.5">{what}{a.studentIds ? ` · ${status.assigned} selected students` : ''}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="font-numeral tabular-nums text-ink">{finished}/{status.assigned}</span>
          {open ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-hairline px-4 py-3">
          <p className="text-caption text-ink-muted">
            {status.done} done · {status.late} late · {status.inProgress} started · {status.notStarted} not started
          </p>
          <ul className="mt-2 flex flex-col">
            {[...status.cells]
              .sort((x, y) => ['not_started', 'in_progress', 'late', 'done'].indexOf(x.state) - ['not_started', 'in_progress', 'late', 'done'].indexOf(y.state))
              .map((c) => (
                <li key={c.studentId} className="flex items-center justify-between gap-3 border-t border-hairline py-2 first:border-t-0">
                  <span className="text-body-s text-ink">{names.get(c.studentId) ?? 'Unnamed student'}</span>
                  <span className="text-caption tabular-nums">
                    <span className={STATE_CLASS[c.state]}>{STATE_LABEL[c.state]}</span>
                    <span className="text-ink-subtle"> · {c.detail}{c.lastAt ? ` · ${relativeDay(c.lastAt)}` : ''}</span>
                  </span>
                </li>
              ))}
          </ul>
          <div className="mt-3">
            <Button
              variant="destructive"
              size="sm"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await archiveAssignment(a.id);
                  onArchived();
                } finally {
                  setBusy(false);
                }
              }}
            >
              Remove homework
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function NewHomework({ data, onCreated, onCancel }: { data: ClassData; onCreated: () => void; onCancel?: () => void }) {
  const topics = useMemo(() => TOPICS.filter(isTopicVisible), []);
  const [kind, setKind] = useState<AssignmentKind>('learn_topic');
  const [topicKey, setTopicKey] = useState(topics[0]?.key ?? '');
  const [count, setCount] = useState(3);
  const [cardId, setCardId] = useState(STORY_CARDS[0]?.id ?? '');
  const [due, setDue] = useState(defaultDue());
  const [title, setTitle] = useState('');
  const [everyone, setEveryone] = useState(true);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = data.roster.filter((r) => r.status === 'active');

  const autoTitle =
    kind === 'learn_topic' ? `${topicName(topicKey)} — ${count} ${count === 1 ? 'answer' : 'answers'}`
      : kind === 'role_play' ? `Role play: ${cardTitle(cardId)}`
        : 'Mock speaking exam';

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      // Due at the end of the chosen day, in the teacher's own time.
      const dueAt = new Date(`${due}T23:59:00`);
      const studentIds = everyone ? undefined : [...picked];
      await createAssignment({
        classId: data.klass.id,
        kind,
        title: (title.trim() || autoTitle).slice(0, 80),
        topicKey: kind === 'learn_topic' ? topicKey : null,
        rolePlayCardId: kind === 'role_play' ? cardId : null,
        questionCount: kind === 'learn_topic' ? count : null,
        dueAt,
        studentIds,
      });
      track({ name: 'assignment_created', props: { kind, targeted: !everyone } });
      onCreated();
    } catch (err) {
      setError(teacherErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const selectClass = 'h-11 w-full rounded-control border border-hairline-strong bg-surface px-3 text-body-s text-ink';

  return (
    <form
      className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <p className="text-section text-ink">Set homework</p>
      <Segmented<AssignmentKind>
        label="Kind of homework"
        height={60}
        value={kind}
        onChange={setKind}
        options={[
          { id: 'learn_topic', label: 'Learn topic', note: 'AI feedback per answer' },
          { id: 'role_play', label: 'Role-play card', note: 'Part 1 practice' },
          { id: 'mock_exam', label: 'Mock exam', note: 'Exam Sim, /40' },
        ]}
      />
      {kind === 'learn_topic' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-label text-ink">Topic</span>
            <select className={selectClass} value={topicKey} onChange={(e) => setTopicKey(e.target.value)}>
              {topics.map((t) => (
                <option key={t.key} value={t.key}>{t.labelEn || t.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-label text-ink">Answers</span>
            <select className={selectClass} value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {Array.from({ length: HOMEWORK_MAX_LEARN_ANSWERS }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      {kind === 'role_play' && (
        <label className="flex flex-col gap-1.5">
          <span className="text-label text-ink">Card</span>
          <select className={selectClass} value={cardId} onChange={(e) => setCardId(e.target.value)}>
            {STORY_CARDS.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </label>
      )}
      {kind === 'mock_exam' && (
        <p className="text-caption text-ink-muted">
          A full Exam Sim with a set picked for each student. It counts toward their progress and you can check the AI's
          marks afterwards. One marked attempt per student.
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextField label="Title (optional)" hint={`Default: ${autoTitle}`} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
        <TextField label="Due" type="date" value={due} onChange={(e) => setDue(e.target.value)} required />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-label text-ink mb-1">For</legend>
        <label className="flex items-center gap-2 text-body-s text-ink">
          <input type="radio" checked={everyone} onChange={() => setEveryone(true)} /> The whole class ({active.length})
        </label>
        <label className="flex items-center gap-2 text-body-s text-ink">
          <input type="radio" checked={!everyone} onChange={() => setEveryone(false)} /> Selected students
        </label>
        {!everyone && (
          <div className="grid grid-cols-1 gap-1 pl-6 sm:grid-cols-2">
            {active.map((r) => (
              <label key={r.studentId} className="flex items-center gap-2 text-body-s text-ink-muted">
                <input
                  type="checkbox"
                  checked={picked.has(r.studentId)}
                  onChange={(e) => {
                    const next = new Set(picked);
                    if (e.target.checked) next.add(r.studentId);
                    else next.delete(r.studentId);
                    setPicked(next);
                  }}
                />
                {r.displayName?.trim() || 'Unnamed student'}
              </label>
            ))}
          </div>
        )}
      </fieldset>
      {error && <InlineAlert>{error}</InlineAlert>}
      <div className="flex items-center gap-3">
        <Button type="submit" loading={busy} disabled={!due || (!everyone && picked.size === 0) || active.length === 0}>
          Set homework
        </Button>
        {onCancel && <Button variant="quiet" onClick={onCancel}>Cancel</Button>}
      </div>
      {active.length === 0 && <p className="text-caption text-ink-subtle">Students need to join before you can set homework.</p>}
    </form>
  );
}
