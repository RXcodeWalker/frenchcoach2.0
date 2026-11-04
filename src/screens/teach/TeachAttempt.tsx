import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { InlineAlert } from '../../components/auth/InlineAlert';
import { SettingToggle } from '../../components/ui/SettingToggle';
import { COMMUNICATION, QUALITY_OF_LANGUAGE, ROLE_PLAY, TOTAL_MARKS } from '../../domain/igcse/rubric';
import { parseScoringEnvelope } from '../../domain/igcse/envelope/schema';
import { parseTeacherMarkSet, type TeacherMark, type TeacherMarkSet } from '../../domain/igcse/comparison/teacherMark';
import type { ScoringEnvelope } from '../../domain/igcse/envelope/types';
import { ERROR_CATEGORY_LABELS, isErrorCategory } from '../../domain/examFeedback/shared/errorCategories';
import { useAuth } from '../../context/AuthContext';
import { getExamAttempt, saveTeacherMark, teacherErrorMessage, type ExamAttemptDetail } from '../../services/teacher/teacherApi';
import { track } from '../../services/telemetry/telemetryService';
import { EYEBROW, shortDate } from './teachUtils';

type AreaKey = 'communication' | 'qualityOfLanguage';

interface Draft {
  rolePlay: Record<string, number>;
  communication: number;
  qualityOfLanguage: number;
  comments: Record<string, string>;
  shared: boolean;
}

function draftFrom(envelope: ScoringEnvelope, existing: TeacherMarkSet | null, shared: boolean): Draft {
  const find = (criterion: TeacherMark['criterion'], taskId?: string) =>
    existing?.marks.find((m) => m.criterion === criterion && (taskId === undefined || m.taskId === taskId));
  const comments: Record<string, string> = {};
  for (const m of existing?.marks ?? []) if (m.comment) comments[m.taskId ?? m.criterion] = m.comment;
  return {
    rolePlay: Object.fromEntries(envelope.rolePlayTasks.map((t) => [t.taskId, find('rolePlayTask', t.taskId)?.mark ?? t.mark])),
    communication: find('communication')?.mark ?? envelope.communication.mark,
    qualityOfLanguage: find('qualityOfLanguage')?.mark ?? envelope.qualityOfLanguage.mark,
    comments,
    shared,
  };
}

function clamp(n: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(Number.isFinite(n) ? n : 0)));
}

function MarkPicker({ value, max, aiMark, onChange, label }: { value: number; max: number; aiMark: number; onChange: (n: number) => void; label: string }) {
  if (max <= 3) {
    return (
      <div role="radiogroup" aria-label={label} className="flex gap-1">
        {Array.from({ length: max + 1 }, (_, n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(n)}
            className={`h-10 w-10 rounded-control border text-label tabular-nums ${value === n ? 'border-action bg-action-soft text-action-text' : 'border-hairline-strong text-ink-muted hover:bg-track'}`}
          >
            {n}
          </button>
        ))}
        {value !== aiMark && <span className="ml-2 self-center text-caption text-info-text">AI: {aiMark}</span>}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(clamp(Number(e.target.value), max))}
        className="h-10 w-20 rounded-control border border-hairline-strong bg-surface px-3 text-body-s tabular-nums text-ink"
      />
      <span className="text-caption text-ink-subtle">/{max}</span>
      {value !== aiMark && <span className="text-caption text-info-text">AI: {aiMark}</span>}
    </div>
  );
}

/**
 * `/teach/class/:classId/attempt/:attemptId` — Q4: can I trust this mark? The transcript the
 * marker read, the AI's marks with its reasons, and the teacher's own marks beside them. The
 * teacher's marks are stored in teacher_marks (a TeacherMarkSet), never in or over the envelope.
 */
export function TeachAttempt() {
  const { classId, attemptId } = useParams();
  const { user } = useAuth();
  const [detail, setDetail] = useState<ExamAttemptDetail | null>(null);
  const [envelope, setEnvelope] = useState<ScoringEnvelope | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (!classId || !attemptId) return;
    let cancelled = false;
    getExamAttempt(classId, decodeURIComponent(attemptId))
      .then((d) => {
        if (cancelled) return;
        let env: ScoringEnvelope;
        try {
          env = parseScoringEnvelope(d.envelope);
        } catch {
          setError("This attempt's marking record couldn't be read.");
          return;
        }
        let existing: TeacherMarkSet | null = null;
        try {
          existing = d.teacherMarkSet ? parseTeacherMarkSet(d.teacherMarkSet) : null;
        } catch {
          existing = null;
        }
        setDetail(d);
        setEnvelope(env);
        setDraft(draftFrom(env, existing, d.teacherShared));
        track({ name: 'teacher_dashboard_viewed', props: { tab: 'attempt', students: 1 } });
      })
      .catch((err) => {
        if (!cancelled) setError(teacherErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [classId, attemptId]);

  const categoryOf = useMemo(() => {
    const map = new Map<string, string>();
    const report = detail?.report as { qualityOfLanguage?: { errors?: { quote?: unknown; category?: unknown }[] } } | null;
    for (const e of report?.qualityOfLanguage?.errors ?? []) {
      if (typeof e.quote === 'string' && isErrorCategory(e.category)) map.set(e.quote, ERROR_CATEGORY_LABELS[e.category]);
    }
    return map;
  }, [detail]);

  if (error) {
    return (
      <div className="flex flex-col gap-3">
        <InlineAlert>{error}</InlineAlert>
        <Link to={`/teach/class/${classId}`} className="text-label text-action-text">Back to the class</Link>
      </div>
    );
  }
  if (!detail || !envelope || !draft) return <p className="text-body-s text-ink-muted">Loading the attempt…</p>;

  const aiRolePlay = envelope.rolePlayTasks.reduce((s, t) => s + t.mark, 0);
  const teacherRolePlay = Object.values(draft.rolePlay).reduce((s, n) => s + n, 0);
  const teacherTotal = teacherRolePlay + draft.communication + draft.qualityOfLanguage;
  const counted = detail.countsTowardProgress === true && detail.conductMode !== 'coached';
  const transcript = envelope.transcriptSnapshot;

  const setComment = (key: string, value: string) => setDraft({ ...draft, comments: { ...draft.comments, [key]: value.slice(0, 500) } });

  const save = async () => {
    if (!classId) return;
    setSaving(true);
    setSaved(null);
    setError(null);
    const comment = (key: string) => (draft.comments[key]?.trim() ? { comment: draft.comments[key].trim() } : {});
    const markSet: TeacherMarkSet = {
      sessionId: detail.sessionId,
      markedBy: user?.id ?? 'teacher',
      markedAt: new Date().toISOString(),
      marks: [
        ...envelope.rolePlayTasks.map((t) => ({ criterion: 'rolePlayTask' as const, taskId: t.taskId, mark: draft.rolePlay[t.taskId] ?? t.mark, ...comment(t.taskId) })),
        { criterion: 'communication' as const, mark: draft.communication, ...comment('communication') },
        { criterion: 'qualityOfLanguage' as const, mark: draft.qualityOfLanguage, ...comment('qualityOfLanguage') },
      ],
    };
    try {
      parseTeacherMarkSet(markSet);
      await saveTeacherMark(classId, detail.attemptId, markSet, teacherTotal, draft.shared);
      track({ name: 'teacher_mark_saved', props: { agreed: teacherTotal === envelope.total, delta: teacherTotal - envelope.total, shared: draft.shared } });
      setSaved(draft.shared ? 'Saved and shared with the student.' : 'Saved. Only you can see it until you share it.');
    } catch (err) {
      setError(teacherErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const area = (key: AreaKey, label: string, max: number) => {
    const c = envelope[key];
    return (
      <section className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4" aria-labelledby={`${key}-h`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id={`${key}-h`} className="text-section text-ink">{label}</h2>
            <p className="text-caption text-ink-muted mt-0.5">AI: {c.mark}/{max}{c.band.label ? ` · ${c.band.label} (${c.band.min}–${c.band.max})` : ''} · confidence {c.confidence}</p>
          </div>
          <MarkPicker label={`Your ${label} mark`} value={draft[key]} max={max} aiMark={c.mark} onChange={(n) => setDraft({ ...draft, [key]: n })} />
        </div>
        <p className="text-body-s text-ink-muted">{c.justification}</p>
        {key === 'qualityOfLanguage' && (envelope.qualityOfLanguage.errors ?? []).length > 0 && (
          <div>
            <p className={EYEBROW}>Errors the marker counted</p>
            <ul className="mt-1 flex flex-col gap-1">
              {(envelope.qualityOfLanguage.errors ?? []).map((e, i) => (
                <li key={i} className="text-body-s text-ink-muted">
                  <span className="text-correction-text">{e.quote}</span> → <span className="text-progress-text font-semibold">{e.correction}</span>
                  {categoryOf.get(e.quote) && <span className="text-caption text-ink-subtle"> · {categoryOf.get(e.quote)}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {key === 'qualityOfLanguage' && (envelope.excusedErrors ?? []).length > 0 && (
          <p className="text-caption text-ink-subtle">
            {(envelope.excusedErrors ?? []).length} possible sound-alike {(envelope.excusedErrors ?? []).length === 1 ? 'error was' : 'errors were'} not counted (the recording couldn't confirm what was said).
          </p>
        )}
        <textarea
          aria-label={`Comment on ${label}`}
          placeholder="Comment (optional)"
          value={draft.comments[key] ?? ''}
          onChange={(e) => setComment(key, e.target.value)}
          className="min-h-[64px] rounded-control border border-hairline-strong bg-surface px-3 py-2 text-body-s text-ink"
        />
      </section>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to={`/teach/class/${classId}/student/${detail.studentId}`} className="inline-flex items-center gap-1 text-label text-ink-muted hover:text-ink">
          <ChevronLeft size={16} aria-hidden="true" /> {detail.studentName?.trim() || 'Student'}
        </Link>
        <p className={`${EYEBROW} mt-3`}>{shortDate(detail.createdAt)} · {counted ? 'Exam Sim — counts' : 'Practice — not counted'}{detail.assignmentId ? ' · homework' : ''}</p>
        <h1 className="text-title text-ink mt-1">Mock exam: AI {envelope.total}/{TOTAL_MARKS} · You {teacherTotal}/{TOTAL_MARKS}</h1>
        <p className="text-body-s text-ink-muted mt-1">
          Read what the marker read, then agree or adjust each mark. Your marks sit beside the AI's — they never change it.
          Recordings aren't kept, so this is the transcript only.
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4" aria-labelledby="rp-h">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="rp-h" className="text-section text-ink">{ROLE_PLAY.name}</h2>
          <p className="text-caption text-ink-muted">AI {aiRolePlay}/{ROLE_PLAY.maxMarks} · You {teacherRolePlay}/{ROLE_PLAY.maxMarks}</p>
        </div>
        <ol className="flex flex-col gap-4">
          {envelope.rolePlayTasks.map((t, i) => {
            const response = transcript.rolePlay.find((r) => r.taskId === t.taskId);
            return (
              <li key={t.taskId} className="border-t border-hairline pt-3 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 max-w-[640px]">
                    <p className="text-caption text-ink-subtle">Task {i + 1}{response?.taskPrompt ? ` — ${response.taskPrompt}` : ''}</p>
                    <p className="font-exam text-body-base text-ink mt-1">« {response?.candidateResponse || '…'} »</p>
                    <p className="text-caption text-ink-muted mt-1">{t.justification}</p>
                  </div>
                  <MarkPicker
                    label={`Your mark for task ${i + 1}`}
                    value={draft.rolePlay[t.taskId] ?? t.mark}
                    max={ROLE_PLAY.marksPerResponse}
                    aiMark={t.mark}
                    onChange={(n) => setDraft({ ...draft, rolePlay: { ...draft.rolePlay, [t.taskId]: n } })}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="conv-h">
        <h2 id="conv-h" className="text-section text-ink">Topic conversations</h2>
        {transcript.topicConversations.map((conv, ci) => (
          <div key={conv.conversationId} className="rounded-card border border-hairline bg-surface-recessed p-4">
            <p className={EYEBROW}>Topic {ci + 1}{conv.topicArea ? ` · area ${conv.topicArea}` : ''}</p>
            <ol className="mt-2 flex flex-col gap-3">
              {conv.turns.map((turn) => (
                <li key={turn.turnId}>
                  <p className="text-caption text-ink-subtle">{turn.questionPrompt}</p>
                  <p className="font-exam text-body-base text-ink mt-0.5">« {turn.candidateResponse || '…'} »</p>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </section>

      {area('communication', 'Communication', COMMUNICATION.maxMarks)}
      {area('qualityOfLanguage', 'Quality of language', QUALITY_OF_LANGUAGE.maxMarks)}

      <section className="sticky bottom-0 flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4 shadow-card">
        <SettingToggle
          icon={null}
          label="Share my marks with the student"
          description="They'll see your total and comments in their Profile. Off by default so you can check first."
          enabled={draft.shared}
          onToggle={() => setDraft({ ...draft, shared: !draft.shared })}
        />
        {error && <InlineAlert>{error}</InlineAlert>}
        {saved && <InlineAlert tone="success">{saved}</InlineAlert>}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void save()} loading={saving}>
            {teacherTotal === envelope.total ? 'Agree and save' : `Save my marks (${teacherTotal}/${TOTAL_MARKS})`}
          </Button>
          <Button variant="quiet" onClick={() => setDraft(draftFrom(envelope, null, draft.shared))}>Reset to AI marks</Button>
        </div>
      </section>
    </div>
  );
}
