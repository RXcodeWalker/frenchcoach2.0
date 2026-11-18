import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, Download, RefreshCw, Share2 } from 'lucide-react';
import { fadeUp } from '../../components/motion/variants';
import { Button } from '../../components/ui/Button';
import { Segmented } from '../../components/ui/Segmented';
import { track } from '../../services/telemetry/telemetryService';
import type { StoredSession } from '../../services/analytics/analyticsService';
import {
  buildBestAnswerCard,
  buildExamCountdownCard,
  buildStreakCard,
  pickBestAnswers,
  practisedDaySet,
  shareCaption,
  shareFileName,
  type ShareCardKind,
  type ShareCardModel,
} from './shareCards';
import { renderShareCard } from './renderShareCard';
import {
  canShareImage,
  copyCaption,
  downloadImage,
  shareImageNatively,
  type ShareResult,
} from './shareCardActions';

interface Props {
  /** The streak Profile shows (`profile.streak_days`). */
  streakDays: number;
  /** Stored session history (newest first or any order). */
  sessions: ReadonlyArray<StoredSession>;
  /** Exam date (ISO) and whole days left, as Profile shows them. */
  examDate?: string;
  daysLeft: number | null;
  examLabel?: string;
}

const KIND_LABEL: Record<ShareCardKind, string> = {
  streak: 'Streak',
  best_answer: 'Best answer',
  exam_countdown: 'Exam countdown',
};

const LOCKED_HINT: Record<ShareCardKind, string> = {
  streak: 'Practise today to start a streak, then share it here.',
  best_answer: 'Score 7 or more on a Learn answer of at least a few sentences and it will appear here.',
  exam_countdown: 'Add your exam date in Learning goals to share a countdown.',
};

const STATUS_COPY: Record<string, string> = {
  'native:done': 'Shared.',
  'download:done': 'Saved to your device. Attach it to your post and paste the text.',
  'copy_link:done': 'Copied. Paste it next to your picture.',
  'native:failed': 'Sharing didn’t work. Try Save image instead.',
  'download:failed': 'Couldn’t save the image. Try again.',
  'copy_link:failed': 'Couldn’t copy. Select the text yourself instead.',
};

/**
 * Profile → Share your progress. Three picture cards (streak, best answer,
 * exam countdown) drawn on a canvas in the browser: the learner sees exactly the
 * image that will be posted, then sends it through the phone's share sheet (or
 * saves it and copies the caption on a computer). Nothing is uploaded and the
 * card is built only from what the app already holds on this device.
 */
export function ShareCardsCard({ streakDays, sessions, examDate, daysLeft, examLabel }: Props) {
  const [kind, setKind] = useState<ShareCardKind>('streak');
  const [answerIndex, setAnswerIndex] = useState(0);
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(null);
  const [renderFailed, setRenderFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const candidates = useMemo(() => pickBestAnswers(sessions), [sessions]);
  const models = useMemo<Record<ShareCardKind, ShareCardModel | null>>(() => {
    const best = candidates.length ? candidates[answerIndex % candidates.length] : null;
    return {
      streak: buildStreakCard({ streakDays, practisedDays: practisedDaySet(sessions) }),
      best_answer: best ? buildBestAnswerCard(best) : null,
      exam_countdown: buildExamCountdownCard({
        daysLeft,
        examDate,
        examLabel,
        sessionsDone: sessions.filter(s => s.mode === 'practice' || s.mode === 'exam').length,
      }),
    };
  }, [streakDays, sessions, candidates, answerIndex, daysLeft, examDate, examLabel]);

  const available = (['streak', 'best_answer', 'exam_countdown'] as const).filter(k => models[k] !== null);
  const activeKind: ShareCardKind | null = models[kind] ? kind : (available[0] ?? null);
  const model = activeKind ? models[activeKind] : null;

  // Render the picture whenever the card's content changes.
  const modelKey = model ? JSON.stringify(model) : '';
  const urlRef = useRef<string | null>(null);
  useEffect(() => {
    if (!model) {
      setPreview(null);
      return;
    }
    let live = true;
    setRenderFailed(false);
    setStatus(null);
    renderShareCard(model)
      .then(blob => {
        if (!live) return;
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setPreview({ url, blob });
      })
      .catch(() => { if (live) { setPreview(null); setRenderFailed(true); } });
    return () => { live = false; };
    // modelKey is the model's content; `model` itself is rebuilt on every render of the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelKey]);
  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  // One count per card the learner actually looks at.
  useEffect(() => {
    if (activeKind) track({ name: 'share_card_viewed', props: { card: activeKind } });
  }, [activeKind]);

  if (available.length === 0) {
    return (
      <motion.section variants={fadeUp} aria-labelledby="profile-share" className="flex flex-col gap-2 rounded-card border border-hairline bg-surface p-[clamp(20px,3cqw,24px)]" data-testid="profile-share">
        <h2 id="profile-share" className="text-section text-ink">Share your progress</h2>
        <p className="text-body-s text-ink-muted [text-wrap:pretty]">
          Cards for your streak, your best answer and your exam countdown appear here as soon as you have something to show. Do a Learn session to get started.
        </p>
      </motion.section>
    );
  }

  const fileName = shareFileName(model!.kind);
  const caption = shareCaption(model!);
  const nativeOk = preview ? canShareImage(preview.blob, fileName) : false;

  function record(card: ShareCardKind, result: ShareResult) {
    track({ name: 'share_card_action', props: { card, method: result.method, outcome: result.outcome } });
    setStatus(result.outcome === 'cancelled' ? null : STATUS_COPY[`${result.method}:${result.outcome}`] ?? null);
  }

  async function run(action: () => Promise<ShareResult> | ShareResult) {
    if (busy || !activeKind) return;
    setBusy(true);
    setStatus(null);
    try {
      record(activeKind, await action());
    } finally {
      setBusy(false);
    }
  }

  const options = (Object.keys(KIND_LABEL) as ShareCardKind[]).map(k => ({
    id: k,
    label: KIND_LABEL[k],
    disabled: models[k] === null,
  }));
  const lockedHints = (Object.keys(KIND_LABEL) as ShareCardKind[]).filter(k => models[k] === null);

  return (
    <motion.section variants={fadeUp} aria-labelledby="profile-share" className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-[clamp(20px,3cqw,24px)]" data-testid="profile-share">
      <div className="flex flex-col gap-1">
        <h2 id="profile-share" className="text-section text-ink">Share your progress</h2>
        <p className="text-body-s text-ink-muted [text-wrap:pretty]">
          Make a picture to post: a friend, a group chat or your story. Nothing is uploaded. You see exactly what you send.
        </p>
      </div>

      <Segmented
        label="Card to share"
        options={options}
        value={activeKind ?? 'streak'}
        onChange={k => { setKind(k); setStatus(null); }}
        height={44}
        testIdPrefix="share-kind"
      />

      <div className="flex flex-wrap items-start gap-5">
        <div
          className="relative w-full max-w-[320px] flex-[0_1_320px] overflow-hidden rounded-card border border-hairline bg-surface-recessed"
          style={{ aspectRatio: '1080 / 1350' }}
          data-testid="share-preview"
        >
          {preview ? (
            <img
              src={preview.url}
              alt={`Preview of your ${KIND_LABEL[model!.kind].toLowerCase()} card`}
              className="block h-full w-full"
              draggable={false}
            />
          ) : (
            <span className="flex h-full items-center justify-center px-4 text-center text-[13px] text-ink-subtle">
              {renderFailed ? 'Couldn’t draw the card on this device.' : 'Drawing your card…'}
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-3">
          {nativeOk && (
            <Button size="md" onClick={() => void run(() => shareImageNatively(preview!.blob, fileName, caption))} loading={busy} disabled={!preview || busy} data-testid="share-native">
              <Share2 size={16} aria-hidden="true" /><span>Share</span>
            </Button>
          )}
          <Button
            size="md"
            variant={nativeOk ? 'secondary' : 'primary'}
            onClick={() => void run(() => downloadImage(preview!.blob, fileName))}
            disabled={!preview || busy}
            data-testid="share-download"
          >
            <Download size={16} aria-hidden="true" /><span>Save image</span>
          </Button>
          <Button size="md" variant="secondary" onClick={() => void run(() => copyCaption(caption))} disabled={!preview || busy} data-testid="share-copy">
            {status?.startsWith('Copied') ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            <span>Copy text with link</span>
          </Button>
          {activeKind === 'best_answer' && candidates.length > 1 && (
            <Button size="sm" variant="quiet" onClick={() => setAnswerIndex(i => (i + 1) % candidates.length)} disabled={busy} data-testid="share-another">
              <RefreshCw size={16} aria-hidden="true" /><span>Show another answer</span>
            </Button>
          )}
          <p className="min-h-[20px] text-[13px] text-ink-muted" role="status" aria-live="polite" data-testid="share-status">{status}</p>
        </div>
      </div>

      {lockedHints.length > 0 && (
        <ul className="flex flex-col gap-1 border-t border-hairline pt-3 text-[13px] text-ink-subtle" aria-label="Cards not ready yet">
          {lockedHints.map(k => (
            <li key={k}><span className="font-semibold text-ink-muted">{KIND_LABEL[k]}:</span> {LOCKED_HINT[k]}</li>
          ))}
        </ul>
      )}
    </motion.section>
  );
}
