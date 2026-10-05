import { useEffect, useState } from 'react';
import { Link, useInRouterContext } from 'react-router-dom';
import { Mic, RefreshCw, Volume2 } from 'lucide-react';
import { normalizeWord } from '../../../domain/examPronunciation/fairness';
import { PRONUNCIATION_PARTS } from '../../../domain/examPronunciation/segment';
import type { ReportedWord, TranscriptTurn } from '../../../domain/examPronunciation/types';
import { TTS } from '../../../services/tts/ttsService';
import { GuardianConsentNotice } from '../../../components/GuardianConsentNotice';
import {
  ANALYSE_BUTTON_LABEL,
  PART_NAME,
  PART_NOTHING_ANALYSED,
  PART_NOTHING_STOOD_OUT,
  PRONUNCIATION_PRIVACY_NOTE,
  PRONUNCIATION_STATE_MESSAGE,
  RETRY_BUTTON_LABEL,
} from './messages';
import { canPlayClips, playClip, stopClip } from './playClip';
import type { UseExamPronunciation } from './useExamPronunciation';

/**
 * The report's Pronunciation section (exam-pronunciation plan §2): shown after
 * the marks and the examiner report, never inside either. Feedback only — it
 * shows words and sound patterns, never a number, a level or an overall
 * pronunciation result, and nothing here can reach a mark.
 *
 * Nothing is analysed until the candidate taps "Analyse my pronunciation".
 * Every outcome is a plain sentence and none of them blocks the rest of the
 * page.
 */

const ACCENT_ANALYZER_PATH = '/accent-analyzer';

function PracticeLink() {
  const inRouter = useInRouterContext();
  const className = 'text-[11px] font-bold text-amber-400 hover:text-amber-300 underline underline-offset-2';
  const label = 'Practise these sounds in the Accent Analyzer';
  return inRouter ? (
    <Link to={ACCENT_ANALYZER_PATH} className={className}>
      {label}
    </Link>
  ) : (
    <a href={ACCENT_ANALYZER_PATH} className={className}>
      {label}
    </a>
  );
}

interface Selection {
  turnKey: number;
  word: ReportedWord;
}

function WordPanel({
  selection,
  pronunciation,
}: {
  selection: Selection;
  pronunciation: UseExamPronunciation;
}) {
  const { word } = selection;
  const [playing, setPlaying] = useState<'you' | 'model' | null>(null);
  const [youUnavailable, setYouUnavailable] = useState(false);

  useEffect(() => () => stopClip(), []);

  const recording = word.clip ? pronunciation.getRecording(word.turnKey) : undefined;
  const youAvailable = word.clip !== null && recording !== undefined && canPlayClips() && !youUnavailable;
  const modelAvailable = TTS.isSupported() && TTS.hasFrenchVoice();

  const playYou = async () => {
    if (!word.clip || !recording) return;
    setPlaying('you');
    const ok = await playClip(recording, word.clip);
    if (!ok) setYouUnavailable(true);
    setPlaying(null);
  };
  const playModel = async () => {
    stopClip();
    setPlaying('model');
    try {
      await TTS.speak(word.word);
    } catch {
      // a voice that fails to speak is just silent
    }
    setPlaying(null);
  };

  return (
    <div data-testid="pronunciation-word-panel" className="mt-2 p-3 rounded-lg bg-white/[0.03] border border-white/5 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[12px] font-bold text-white">{word.word}</span>
        {word.lowerConfidence && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-white/5 text-ink-muted border border-white/10">
            Lower confidence
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {youAvailable && (
          <button
            type="button"
            onClick={() => void playYou()}
            disabled={playing !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-[11px] font-bold text-white hover:bg-white/10 disabled:opacity-50 transition-colors"
          >
            <Volume2 size={12} /> You
          </button>
        )}
        {modelAvailable && (
          <button
            type="button"
            onClick={() => void playModel()}
            disabled={playing !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-[11px] font-bold text-white hover:bg-white/10 disabled:opacity-50 transition-colors"
          >
            <Volume2 size={12} /> Model
          </button>
        )}
        {!youAvailable && <span className="text-[10px] text-ink-muted">Recording not kept</span>}
      </div>
    </div>
  );
}

function TranscriptLine({
  turn,
  reportedWords,
  selected,
  onSelect,
}: {
  turn: TranscriptTurn;
  reportedWords: readonly ReportedWord[];
  selected: Selection | null;
  onSelect: (selection: Selection | null) => void;
}) {
  return (
    <p className="text-[11px] text-ink-muted leading-relaxed">
      {turn.tokens.map((token, i) => {
        const word = token.reported
          ? reportedWords.find((w) => w.turnKey === turn.turnKey && normalizeWord(w.word) === normalizeWord(token.text))
          : undefined;
        const isSelected = selected?.turnKey === turn.turnKey && word !== undefined && selected.word === word;
        return (
          <span key={i}>
            {i > 0 && ' '}
            {word ? (
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelect(isSelected ? null : { turnKey: turn.turnKey, word })}
                className={`rounded px-0.5 font-bold text-amber-300 underline decoration-amber-400/70 underline-offset-2 ${
                  isSelected ? 'bg-amber-500/25' : 'bg-amber-500/10 hover:bg-amber-500/20'
                }`}
              >
                {token.text}
              </button>
            ) : (
              token.text
            )}
          </span>
        );
      })}
    </p>
  );
}

export function ExamPronunciationSection({ pronunciation }: { pronunciation: UseExamPronunciation }) {
  const { status, report, analysedTurns, partAudio, notEnabledByBackend, hydrate } = pronunciation;
  const [selected, setSelected] = useState<Selection | null>(null);

  // Stored rows (report reopen) are read once; this never analyses or charges.
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const statuses = PRONUNCIATION_PARTS.map((p) => status[p]);
  const running = statuses.includes('running');
  const blocking = statuses.find((s) => !['idle', 'running', 'done', 'no_audio'].includes(s));
  const withAudio = PRONUNCIATION_PARTS.reduce((n, p) => n + partAudio(p).withAudio, 0);
  const pending = PRONUNCIATION_PARTS.filter((p) => status[p] === 'idle' && partAudio(p).withAudio > 0);
  const analysedParts = PRONUNCIATION_PARTS.filter((p) => status[p] === 'done');
  const noRecordings = analysedParts.length === 0 && withAudio === 0 && !running && !blocking;

  let control: React.ReactNode = null;
  if (notEnabledByBackend) {
    control = <p className="text-[11px] text-ink-muted leading-relaxed">{PRONUNCIATION_STATE_MESSAGE.not_enabled}</p>;
  } else if (blocking === 'consent_required') {
    control = <GuardianConsentNotice />;
  } else if (blocking) {
    control = (
      <div className="space-y-2">
        <p className="text-[11px] text-ink-muted leading-relaxed">
          {PRONUNCIATION_STATE_MESSAGE[blocking as keyof typeof PRONUNCIATION_STATE_MESSAGE]}
        </p>
        {blocking === 'failed' && (
          <button
            type="button"
            onClick={() => void pronunciation.analyseAll()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 text-ink-muted hover:text-white text-[11px] font-bold transition-colors"
          >
            <RefreshCw size={13} /> {RETRY_BUTTON_LABEL}
          </button>
        )}
      </div>
    );
  } else if (running) {
    control = (
      <p role="status" aria-live="polite" className="text-[11px] text-ink-muted leading-relaxed">
        {PRONUNCIATION_STATE_MESSAGE.running}
      </p>
    );
  } else if (noRecordings) {
    control = (
      <div className="space-y-2">
        <p className="text-[11px] text-ink-muted leading-relaxed">{PRONUNCIATION_STATE_MESSAGE.no_audio}</p>
        <button
          type="button"
          disabled
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 text-ink-muted text-[11px] font-bold opacity-50"
        >
          <Mic size={13} /> {ANALYSE_BUTTON_LABEL}
        </button>
      </div>
    );
  } else if (pending.length > 0) {
    control = (
      <button
        type="button"
        onClick={() => void pronunciation.analyseAll()}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 text-white hover:bg-white/10 text-[11px] font-bold transition-colors"
      >
        <Mic size={13} /> {ANALYSE_BUTTON_LABEL}
      </button>
    );
  }

  return (
    <div data-testid="exam-pronunciation" className="rounded-xl surface p-5 space-y-3">
      <div>
        <h3 className="font-bold text-ink-muted text-[10px] uppercase tracking-wider mb-1">Pronunciation</h3>
        <p className="text-[10px] text-ink-muted leading-relaxed">
          Practice feedback on whether your words came across clearly. It never changes your marks. {PRONUNCIATION_PRIVACY_NOTE}
        </p>
      </div>

      {control}

      {analysedParts.map((part) => {
        const partReport = report?.parts.find((p) => p.part === part);
        const turns = report?.transcript.filter((t) => t.part === part) ?? [];
        const nothingAnalysed = analysedTurns[part] === 0;
        return (
          <div key={part} data-testid={`pronunciation-part-${part}`} className="p-3 rounded-lg bg-white/[0.03] border border-white/5 space-y-2">
            <p className="text-[9px] text-ink-subtle uppercase tracking-wider">
              {PART_NAME[part]}
              {partReport?.lowerConfidence && !nothingAnalysed && ' · lower confidence'}
            </p>
            {nothingAnalysed ? (
              <p className="text-[11px] text-ink-muted leading-relaxed">{PART_NOTHING_ANALYSED}</p>
            ) : (
              <>
                {turns.map((turn) => (
                  <TranscriptLine
                    key={turn.turnKey}
                    turn={turn}
                    reportedWords={partReport?.reportedWords ?? []}
                    selected={selected}
                    onSelect={setSelected}
                  />
                ))}
                {partReport && partReport.reportedWords.length === 0 && (
                  <p className="text-[11px] text-ink-muted leading-relaxed">{PART_NOTHING_STOOD_OUT}</p>
                )}
                {selected && selected.word.part === part && (
                  <WordPanel key={`${selected.turnKey}-${selected.word.word}`} selection={selected} pronunciation={pronunciation} />
                )}
              </>
            )}
          </div>
        );
      })}

      {report && report.patterns.length > 0 && (
        <div data-testid="pronunciation-patterns" className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Sounds to practise</p>
          {report.patterns.map((pattern) => (
            <div key={pattern.category} className="p-3 rounded-lg bg-white/[0.03] border border-white/5 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-white">{pattern.label}</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-white/5 text-ink-muted border border-white/10">
                  Inferred
                </span>
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">{pattern.explanation}</p>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                From your answers: <span className="text-white font-bold">{pattern.examples.join(', ')}</span>
              </p>
            </div>
          ))}
        </div>
      )}

      {report?.fluencyNote && (
        <div data-testid="pronunciation-fluency" className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Fluency</p>
          <p className="text-[11px] text-ink-muted leading-relaxed">{report.fluencyNote}</p>
        </div>
      )}

      {(report !== null || analysedParts.length > 0) && <PracticeLink />}
    </div>
  );
}
