/**
 * One Junior mission, turn by turn (junior-track §1–§10). Everything that decides
 * what happens next is pure and lives in `domain/junior/` (turn flow, matcher,
 * scaffold, postcard, rewards); this hook only wires it to the screen, the mic
 * and the reducer.
 *
 * What it writes, and what it does not:
 *  - `RECORD_JUNIOR_TURN` once per QUESTION turn, honestly (a "none" stays
 *    "none"). The warm-up and « Et toi ? » turns are NOT recorded: the playtest
 *    thresholds (none > 25 % of turns, …) are defined over question turns, and
 *    both of those turns always complete anyway.
 *  - `FINISH_JUNIOR_MISSION` once, with a sticker chosen from the theme alone.
 *  - `MARK_JUNIOR_DEMO_SEEN` when the first-run demo ends.
 *  - Never a Session, XP, mastery, Learn evidence or analytics write (ADR 0012).
 *
 * The scaffold ladder's got/miss counters are held in memory for the mission; the
 * reducer persists only each pattern's step, so a counter starts again at zero
 * on the next mission (documented in junior-track §5's code notes).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { JUNIOR_BANK } from '../../data/junior';
import { renderSentence, sentenceAudioId } from '../../data/junior/sentence';
import type { JuniorBank, JuniorEtToi, JuniorPattern, JuniorQuestion, JuniorSlotOption, JuniorTheme } from '../../data/junior/types';
import { buildMission, type Mission } from '../../domain/junior/buildMission';
import { earnedStickers } from '../../domain/junior/earned';
import {
  frameTarget, freeFrameTarget, matchAnswer, themeVocabulary, type FrameTarget, type MatchResult,
} from '../../domain/junior/matchAnswer';
import { buildPostcard, type Postcard, type PostcardItem } from '../../domain/junior/postcard';
import { nextReward, type MissionReward } from '../../domain/junior/rewards';
import { resumeMission } from '../../domain/junior/resumeMission';
import {
  INITIAL_PATTERN_PROGRESS, SCAFFOLD_STEPS, recordTurn as recordScaffoldTurn, stepFor, type PatternProgress,
} from '../../domain/junior/scaffold';
import { isMissionResumable, type JuniorStep } from '../../domain/junior/state';
import {
  answerEtToi, answerQuestion, answerWarmup, modelsBeforeListening, silentEtToi, silentQuestion, startEtToiTurn,
  startQuestionTurn, startWarmupTurn, turnLineText, withLevelUp,
  type EtToiTurnState, type QuestionTurnState, type TurnLineText, type TurnResponse, type WarmupTurnState,
} from '../../domain/junior/turnFlow';
import type { JuniorTurnResult as PostcardTurn, LeoState, Recogniser, ScaffoldStep } from '../../domain/junior/types';
import { chooseTranscript, needsWhisper } from '../../domain/junior/recogniser';
import { decideWarmup, isSilent } from '../../domain/junior/warmup';
import { transcribeJuniorTurn } from './juniorTranscription';
import { useLeoVoice, type LeoVoice, type SpeakableLine } from './leoVoice';
import { WARMUP_PROMPT } from '../../data/junior';
import { leoLook, type LeoLook } from './look';
import type { PractiseTry } from './PostcardView';
import { useJuniorCapture, type JuniorCapture, type CaptureResult } from './useJuniorCapture';

/** How long Léo's reaction stays before the mission moves on by itself (the learner can tap to skip). */
export const REACTION_MS = 2200;

export type QuestionStage = 'pick' | 'modelling' | 'ready';

export type TurnView =
  | { kind: 'demo'; sample: JuniorQuestion }
  | { kind: 'warmup' }
  | { kind: 'question'; question: JuniorQuestion; steps: ScaffoldStep[]; picks: (string | null)[]; stage: QuestionStage; helpShown: boolean }
  | { kind: 'etToi'; etToi: JuniorEtToi };

type TurnState = QuestionTurnState | WarmupTurnState | EtToiTurnState | null;

interface Run {
  index: number;
  turn: TurnView;
  turnState: TurnState;
  leo: LeoState;
  line: TurnLineText | null;
  /** Léo has reacted and the turn is over; waiting to move on. */
  reacting: boolean;
}

export interface MissionResult {
  postcard: Postcard;
  reward: MissionReward;
  practiseTry: PractiseTry | null;
}

export interface UseMission {
  status: 'error' | 'running' | 'postcard';
  run: Run | null;
  result: MissionResult | null;
  capture: JuniorCapture;
  blocked: boolean;
  voice: LeoVoice;
  look: LeoLook;
  theme: JuniorTheme | null;
  bank: JuniorBank;
  pick: (frameIndex: number, optionId: string) => void;
  showHelp: () => void;
  next: () => void;
  finishDemo: () => void;
  recordingUrl: (recordingId: string | null) => string | null;
  linesFor: (sentence: string) => readonly SpeakableLine[];
}

const STEP_INDEX: Record<ScaffoldStep, number> = { echo: 0, frame: 1, free: 2 };
const lowestStep = (steps: readonly ScaffoldStep[]): ScaffoldStep =>
  SCAFFOLD_STEPS[Math.min(...steps.map((s) => STEP_INDEX[s]))];

function initialProgress(patternSteps: Record<string, JuniorStep>): Record<string, PatternProgress> {
  const out: Record<string, PatternProgress> = {};
  for (const [id, step] of Object.entries(patternSteps)) out[id] = { ...INITIAL_PATTERN_PROGRESS, step };
  return out;
}

const asLine = (l: { fr: string; audioId: string }): SpeakableLine => ({ fr: l.fr, audioId: l.audioId });

export function useMission(themeId: string, bank: JuniorBank = JUNIOR_BANK): UseMission {
  const { state, dispatch } = useApp();
  const { consentStatus } = useAuth();
  const blocked = consentStatus === 'pending';
  const voice = useLeoVoice();
  const theme = bank.themes.find((t) => t.id === themeId) ?? null;

  const juniorRef = useRef(state.junior);
  juniorRef.current = state.junior;
  const progressRef = useRef<Record<string, PatternProgress>>(initialProgress(state.junior.patternSteps));
  const recogniserRef = useRef<Recogniser>('webSpeech');
  const completedRef = useRef<PostcardTurn[]>([]);
  const triesRef = useRef(new Map<string, PractiseTry>());
  const linesRef = useRef(new Map<string, SpeakableLine[]>());
  const blobsRef = useRef(new Map<string, Blob>());
  const urlsRef = useRef(new Map<string, string>());
  const finishedRef = useRef(false);

  const [mission] = useState<Mission | null>(() => {
    if (!theme) return null;
    const active = state.junior.activeMission;
    const resumable = isMissionResumable(active, Date.now()) && active.themeId === themeId;
    try {
      return resumable && active.results.length > 0
        ? resumeMission(bank, themeId, active.results.map((r) => r.turnId))
        : buildMission(bank, themeId, { demoSeen: state.junior.demoSeen });
    } catch {
      return null;
    }
  });

  const enterTurn = useCallback(
    (index: number): Run => {
      const turn = mission!.turns[index];
      const base = { index, reacting: false, line: null as TurnLineText | null };
      switch (turn.kind) {
        case 'demo': {
          const sample = bank.questions.find((q) => q.themeId === themeId)!;
          return { ...base, turn: { kind: 'demo', sample }, turnState: null, leo: 'happy' };
        }
        case 'warmup':
          return { ...base, turn: { kind: 'warmup' }, turnState: startWarmupTurn(), leo: 'thinking' };
        case 'etToi': {
          const etToi = theme!.etToi.find((e) => e.id === turn.etToiId)!;
          return { ...base, turn: { kind: 'etToi', etToi }, turnState: startEtToiTurn(), leo: 'happy' };
        }
        case 'question': {
          const question = bank.questions.find((q) => q.id === turn.questionId)!;
          const steps = question.frames.map((f) => stepFor(progressRef.current, f.patternId));
          const needsPick = steps.some((s) => s !== 'free');
          return {
            ...base,
            turn: {
              kind: 'question', question, steps, picks: question.frames.map(() => null),
              stage: needsPick ? 'pick' : 'ready', helpShown: false,
            },
            turnState: startQuestionTurn(),
            leo: 'happy',
          };
        }
      }
    },
    [mission, bank, theme, themeId],
  );

  const [run, setRunState] = useState<Run | null>(() => (mission ? enterTurn(0) : null));
  const runRef = useRef(run);
  runRef.current = run;
  // Handlers and the async model-sentence callback read the run through the ref, so every change updates it at once.
  const setRun = useCallback((r: Run | null) => {
    runRef.current = r;
    setRunState(r);
  }, []);
  const [result, setResult] = useState<MissionResult | null>(null);

  // Starting the mission; a resumable one on this theme is kept by the reducer (the resume).
  useEffect(() => {
    if (mission) dispatch({ type: 'START_JUNIOR_MISSION', themeId, now: Date.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      voice.stop();
      for (const url of urls.values()) URL.revokeObjectURL(url);
      urls.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patternOf = (id: string): JuniorPattern => bank.patterns.find((p) => p.id === id)!;
  const optionOf = (q: JuniorQuestion, frameIndex: number, optionId: string | null): JuniorSlotOption | null =>
    optionId ? q.frames[frameIndex].slotOptions.find((o) => o.id === optionId) ?? null : null;

  /** The 1–2 frame targets of a question turn: the chosen sentence, or "any theme word" in the Free step. */
  const targetsFor = (view: Extract<TurnView, { kind: 'question' }>): FrameTarget[] => {
    const vocabulary = themeVocabulary(bank.questions, themeId);
    return view.question.frames.map((f, i) => {
      const pattern = patternOf(f.patternId);
      const option = optionOf(view.question, i, view.picks[i]);
      return view.steps[i] === 'free' || !option ? freeFrameTarget(pattern, vocabulary) : frameTarget(pattern, option);
    });
  };

  const speakResponse = (response: TurnResponse, line: TurnLineText | null, model: SpeakableLine[]) => {
    const parts: SpeakableLine[] = [];
    if (line?.kind === 'leo') parts.push(asLine(line.line));
    if (response.playModel) parts.push(...model);
    if (parts.length > 0) void voice.speakAll(parts);
  };

  const modelLines = (view: Extract<TurnView, { kind: 'question' }>, matched?: MatchResult | null): SpeakableLine[] =>
    view.question.frames.flatMap((f, i) => {
      const option = optionOf(view.question, i, view.picks[i]) ?? optionOf(view.question, i, matched?.frames[i]?.slotOptionId ?? null);
      return option ? [{ fr: renderSentence(f.template, option), audioId: sentenceAudioId(view.question.id, i, option.id) }] : [];
    });

  const handleResult = useCallback(
    (r: CaptureResult) => {
      const current = runRef.current;
      if (!current || current.reacting || !current.turnState) return;
      const view = current.turn;
      const silent = isSilent({ peakMicLevel: r.peak, transcript: r.transcript });

      if (view.kind === 'warmup') {
        const ts = current.turnState as WarmupTurnState;
        const decision = decideWarmup({ peakMicLevel: r.peak, transcript: r.transcript, attempt: ts.phase === 'retry' ? 2 : 1 });
        const step = answerWarmup(ts, decision);
        // 'whisper': the rest of this mission's question turns are read by Whisper (readTranscript below).
        if (step.state.recogniser) recogniserRef.current = step.state.recogniser;
        const line = step.response.line ? turnLineText(step.response.line, { turnIndex: current.index }) : null;
        speakResponse(step.response, line, []);
        setRun({ ...current, turnState: step.state, leo: step.response.leo, line, reacting: step.response.next === 'moveOn' });
        return;
      }

      if (view.kind === 'etToi') {
        const ts = current.turnState as EtToiTurnState;
        const step = silent ? silentEtToi(ts) : answerEtToi(ts);
        const line = step.response.line ? turnLineText(step.response.line, { turnIndex: current.index, etToi: view.etToi }) : null;
        speakResponse(step.response, line, []);
        setRun({ ...current, turnState: step.state, leo: step.response.leo, line, reacting: step.response.next === 'moveOn' });
        return;
      }

      if (view.kind !== 'question') return;
      const ts = current.turnState as QuestionTurnState;
      let match: MatchResult | null = null;
      let step;
      if (silent) {
        step = silentQuestion(ts);
      } else {
        match = matchAnswer(r.transcript, targetsFor(view));
        step = answerQuestion(ts, match);
      }
      const q = view.question;
      if (match && step.state.decisive === match && r.blob) blobsRef.current.set(q.id, r.blob);

      let response = step.response;
      let patternForLine: JuniorPattern | undefined;

      if (step.state.phase === 'done' && step.state.outcome) {
        const outcome = step.state.outcome;
        const decisive = step.state.decisive;
        const frameOutcomes = q.frames.map((_, i) => decisive?.frames[i]?.outcome ?? outcome);
        const scaffold = recordScaffoldTurn(
          progressRef.current,
          q.frames.map((f, i) => ({ patternId: f.patternId, outcome: frameOutcomes[i] })),
        );
        progressRef.current = scaffold.progress;
        if (scaffold.events.length > 0) patternForLine = patternOf(scaffold.events[0].patternId);
        response = withLevelUp(response, scaffold.events.length > 0);

        const vocabulary = themeVocabulary(bank.questions, themeId);
        const frames = q.frames.map((f, i) => {
          const option =
            optionOf(q, i, view.picks[i]) ??
            vocabulary.find((o) => o.id === decisive?.frames[i]?.slotOptionId) ??
            null;
          return { patternId: f.patternId, step: view.steps[i], sentence: option ? renderSentence(f.template, option) : q.modelAnswer[i], option };
        });
        const sentence = frames.map((f) => f.sentence).join(' ');
        const lines: SpeakableLine[] = frames.map((f, i) => ({
          fr: f.sentence,
          audioId: f.option && q.frames[i].slotOptions.some((o) => o.id === f.option!.id) ? sentenceAudioId(q.id, i, f.option.id) : '',
        }));
        linesRef.current.set(sentence, lines);
        triesRef.current.set(sentence, {
          targets: targetsFor(view),
          keyWords: frames.flatMap((f, i) => [...patternOf(f.patternId).coreWords, ...(f.option ? [f.option.word] : decisive?.frames[i]?.heard ?? [])]),
        });
        completedRef.current = [
          ...completedRef.current,
          {
            questionId: q.id,
            outcome,
            frames: frames.map(({ patternId, step: s, sentence: t }) => ({ patternId, step: s, sentence: t })),
            heard: decisive?.heard ?? [],
            recordingId: blobsRef.current.has(q.id) ? q.id : null,
          },
        ];
        // One record per question turn, honestly: a "none" stays "none".
        const changed = [...new Set(q.frames.map((f) => f.patternId))].map((patternId) => ({ patternId, step: scaffold.progress[patternId].step }));
        dispatch({ type: 'RECORD_JUNIOR_TURN', turn: { turnId: q.id, outcome }, patternStep: changed });
      }

      const line = response.line ? turnLineText(response.line, { turnIndex: current.index, pattern: patternForLine }) : null;
      speakResponse(response, line, modelLines(view, match));
      setRun({ ...current, turnState: step.state, leo: response.leo, line, reacting: response.next === 'moveOn' });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bank, themeId, dispatch],
  );

  // The Whisper path (junior-track §2): runs while the capture is still busy, before handleResult reads the turn.
  const readTranscript = useCallback(async (r: CaptureResult): Promise<string> => {
    const turn = runRef.current?.turn.kind;
    if (!turn || !needsWhisper({
      turn, recogniser: recogniserRef.current, webSpeechSupported: r.webSpeechSupported, transcript: r.transcript, peakMicLevel: r.peak,
    })) return r.transcript;
    return chooseTranscript(r.transcript, await transcribeJuniorTurn(r.blob));
  }, []);

  const capture = useJuniorCapture(blocked, handleResult, readTranscript);

  const complete = useCallback(() => {
    if (finishedRef.current || !theme) return;
    finishedRef.current = true;
    const reward = nextReward(theme, earnedStickers(theme, juniorRef.current));
    dispatch({
      type: 'FINISH_JUNIOR_MISSION',
      themeId,
      stickerId: reward.sticker.id,
      ...(reward.unlock ? { unlockId: reward.unlock.id } : {}),
    });
    const sticker: PostcardItem = { kind: 'sticker', icon: '🏅', label: 'New sticker', sticker: reward.sticker, gold: reward.gold };
    const turns = completedRef.current;
    let postcard: Postcard;
    if (turns.length > 0) {
      postcard = buildPostcard(turns, { sticker: reward.sticker, gold: reward.gold });
    } else {
      // Resumed after every question turn was already finished: nothing played this sitting. Never empty, never apologetic.
      const first = bank.questions.find((q) => q.themeId === themeId)!;
      postcard = {
        items: [
          { kind: 'finished', icon: '🎉', label: 'You finished!' },
          { kind: 'listen', icon: '🔊', label: 'Listen to Léo', sentence: first.modelAnswer.join(' ') },
          sticker,
        ],
      };
    }
    const practised = postcard.items.find((i) => i.kind === 'practise');
    setResult({ postcard, reward, practiseTry: practised && practised.kind === 'practise' ? triesRef.current.get(practised.sentence) ?? null : null });
  }, [theme, themeId, dispatch, bank]);

  const next = useCallback(() => {
    const current = runRef.current;
    if (!current || !mission) return;
    voice.stop();
    capture.cancel();
    const index = current.index + 1;
    if (index >= mission.turns.length) {
      setRun(null);
      complete();
    } else {
      setRun(enterTurn(index));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission, complete, enterTurn, capture.cancel]);

  const nextRef = useRef(next);
  nextRef.current = next;

  // Léo asks each turn aloud when it starts (§3). With no recorded file and no French voice this is silent.
  const turnIndex = run?.index ?? -1;
  useEffect(() => {
    const view = runRef.current?.turn;
    if (!view) return;
    const prompt =
      view.kind === 'question' ? view.question.prompt : view.kind === 'warmup' ? WARMUP_PROMPT : view.kind === 'etToi' ? view.etToi.ask : null;
    if (prompt) void voice.speak(prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnIndex]);

  useEffect(() => {
    if (!run?.reacting) return;
    const id = setTimeout(() => nextRef.current(), REACTION_MS);
    return () => clearTimeout(id);
  }, [run?.reacting, run?.index]);

  const finishDemo = useCallback(() => {
    dispatch({ type: 'MARK_JUNIOR_DEMO_SEEN' });
    nextRef.current();
  }, [dispatch]);

  const pick = useCallback(
    (frameIndex: number, optionId: string) => {
      const current = runRef.current;
      if (!current || current.turn.kind !== 'question' || !current.turnState) return;
      const view = current.turn;
      const ts = current.turnState as QuestionTurnState;
      if (view.stage === 'modelling' || ts.attempts.length > 0 || ts.silentTries > 0 || capture.listening || capture.busy) return;
      const picks = view.picks.map((p, i) => (i === frameIndex ? optionId : p));
      const allPicked = view.steps.every((s, i) => s === 'free' || picks[i] !== null);
      const stage: QuestionStage = !allPicked ? 'pick' : modelsBeforeListening(lowestStep(view.steps)) ? 'modelling' : 'ready';
      const nextView = { ...view, picks, stage };
      setRun({ ...current, turn: nextView, leo: 'happy', line: null });
      if (stage === 'modelling') {
        void voice.speakAll(modelLines(nextView)).then(() => {
          const latest = runRef.current;
          if (latest && latest.turn.kind === 'question' && latest.turn.question.id === view.question.id && latest.turn.stage === 'modelling') {
            setRun({ ...latest, turn: { ...latest.turn, stage: 'ready' } });
          }
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [capture.listening, capture.busy],
  );

  const showHelp = useCallback(() => {
    const current = runRef.current;
    if (!current || current.turn.kind !== 'question') return;
    setRun({ ...current, turn: { ...current.turn, helpShown: true } });
  }, [setRun]);

  const recordingUrl = useCallback((recordingId: string | null): string | null => {
    if (!recordingId) return null;
    const have = urlsRef.current.get(recordingId);
    if (have) return have;
    const blob = blobsRef.current.get(recordingId);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    urlsRef.current.set(recordingId, url);
    return url;
  }, []);

  const linesFor = useCallback((sentence: string): readonly SpeakableLine[] => linesRef.current.get(sentence) ?? [], []);

  return {
    status: !mission ? 'error' : run ? 'running' : 'postcard',
    run, result, capture, blocked, voice,
    look: leoLook(bank, state.junior),
    theme, bank, pick, showHelp, next, finishDemo, recordingUrl, linesFor,
  };
}

