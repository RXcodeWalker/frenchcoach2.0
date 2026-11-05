/**
 * Back online: uploads each waiting saved answer for transcription, oldest
 * first. Transcription only — feedback (which spends one of the day's AI-marked
 * answers) waits until the learner opens the answer from `/learn/saved`.
 *
 * Uses Learn's own `transcribeLearnAnswer` (the question as context, Whisper's
 * suspect-reading guard, numbers spelled out), with no live captions: offline
 * there were none. A connection, quota or consent failure leaves the answer
 * waiting and stops the run (the next one is on the next `online` event or app
 * open); a recording Whisper could not read becomes `unclear`.
 */
import { transcribeLearnAnswer, type TranscribeLearnAnswerInput, type AnswerTranscription } from '../answerTranscription';
import {
  listSavedAnswers,
  savedAnswerBlob,
  updateSavedAnswer,
  type SavedAnswer,
} from '../../../services/offline/savedAnswers';

export interface ProcessResult {
  transcribed: number;
  unclear: number;
  stoppedBy: 'done' | 'offline' | 'failed';
}

type Transcribe = (input: TranscribeLearnAnswerInput) => Promise<AnswerTranscription>;

let running: Promise<ProcessResult> | null = null;

export function processSavedAnswers(
  scope: string,
  opts: { transcribe?: Transcribe; isOnline?: () => boolean } = {},
): Promise<ProcessResult> {
  // One run at a time: `online`, focus and the list's "Check now" can fire together.
  running ??= run(scope, opts).finally(() => { running = null; });
  return running;
}

async function run(
  scope: string,
  { transcribe = transcribeLearnAnswer, isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false }:
    { transcribe?: Transcribe; isOnline?: () => boolean },
): Promise<ProcessResult> {
  const result: ProcessResult = { transcribed: 0, unclear: 0, stoppedBy: 'done' };
  const waiting = (await listSavedAnswers(scope)).filter((a) => a.status === 'waiting');
  for (const item of waiting) {
    if (!isOnline()) return { ...result, stoppedBy: 'offline' };
    const outcome = await transcribeOne(item, transcribe);
    if (outcome === 'ready') result.transcribed++;
    else if (outcome === 'unclear') result.unclear++;
    else return { ...result, stoppedBy: 'failed' };
  }
  return result;
}

async function transcribeOne(item: SavedAnswer, transcribe: Transcribe): Promise<'ready' | 'unclear' | 'failed'> {
  let answer: AnswerTranscription;
  try {
    answer = await transcribe({
      liveText: '',
      audio: savedAnswerBlob(item),
      questionText: item.questionText,
      earlierAnswers: [],
    });
  } catch {
    answer = { primaryText: '', secondaryText: '', source: 'live-captions', fallbackReason: 'asr-failed' };
  }
  if (answer.source === 'whisper' && answer.primaryText.trim()) {
    await updateSavedAnswer(item.id, { status: 'ready', transcript: answer.primaryText, uploadAttempts: item.uploadAttempts + 1 });
    return 'ready';
  }
  if (answer.fallbackReason === 'asr-rejected' || answer.fallbackReason === 'no-audio') {
    await updateSavedAnswer(item.id, { status: 'unclear', transcript: null, uploadAttempts: item.uploadAttempts + 1 });
    return 'unclear';
  }
  await updateSavedAnswer(item.id, { uploadAttempts: item.uploadAttempts + 1 });
  return 'failed';
}
