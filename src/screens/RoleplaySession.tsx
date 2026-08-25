import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { getScenario, isAuthored } from '../data/scenarios/registry';
import { useApp } from '../context/AppContext';
import { useRecording } from '../features/recording/useRecording';
import { useRoleplaySession, pickPrompt, countWords } from '../features/roleplay/useRoleplaySession';
import { toScoringInput } from '../features/roleplay/toScoringInput';
import { getAIFeedback } from '../services/api/apiClient';
import { buildTier0Result } from '../services/coaching/responseTier';
import { orchestrateAttempt } from '../services/coach/sessionOrchestrator';
import { getSkillProfile } from '../services/coaching/diagnosticEngine';
import { isUnscored } from '../domain/scoring';
import { computeXPGain, computeParticipationXPGain } from '../domain/xp';
import { VisualNovelView } from '../components/ui/VisualNovelView';
import type { Expression } from '../components/ui/CharacterAvatar';
import type { Objective } from '../components/ui/MissionObjectivesList';
import type { FeedbackV2, Question, Session } from '../types';
import type { LanguageResult, ScenarioDeck, ScenarioGraph, ScenarioMeta, TurnOutcome } from '../features/roleplay/types';

interface ScenarioEntry {
  meta: ScenarioMeta;
  graph: ScenarioGraph;
  deck: ScenarioDeck;
}

export function RoleplaySession() {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();

  const entry = scenarioId ? getScenario(scenarioId) : undefined;
  const authored = scenarioId ? isAuthored(scenarioId) : false;

  // Deep links and stale bookmarks bypass the Explore tree's gate, so this
  // guard is permanent rather than belt-and-braces.
  useEffect(() => {
    if (!entry || !authored) {
      navigate('/explore');
    }
  }, [entry, authored, navigate]);

  if (!entry || !authored || !scenarioId) return null;

  return <RoleplaySessionView scenarioId={scenarioId} entry={entry} />;
}

/**
 * Split from the guard above so the session hook is only ever mounted with a
 * real scenario — no placeholder meta, and no conditional hook call.
 */
function RoleplaySessionView({ scenarioId, entry }: { scenarioId: string; entry: ScenarioEntry }) {
  const navigate = useNavigate();
  const { meta } = entry;
  const session = useRoleplaySession(scenarioId, entry.graph, meta);
  const { phase } = session.state;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-24 md:pb-8">
      <button
        onClick={() => navigate('/explore')}
        className="flex items-center gap-2 text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest mb-4"
      >
        <ArrowLeft size={14} /> Back to Explore
      </button>

      <Card variant="subtle" className="p-4 border-white/5 flex items-center gap-4 mb-6">
        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-white/5 text-lg">
          {meta.emoji}
        </div>
        <div>
          <h1 className="text-sm font-black text-white italic tracking-tight">{meta.title}</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{meta.npc.nameFr} · {meta.npc.roleEn}</p>
        </div>
      </Card>

      {phase === 'briefing' && (
        <Card className="p-6">
          <p className="text-sm text-slate-300">{meta.briefingEn}</p>
          <button
            onClick={() => session.setPhase('prep')}
            className="mt-6 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest transition-colors"
          >
            Continue
          </button>
        </Card>
      )}

      {phase === 'prep' && (
        <Card className="p-6">
          <button
            onClick={session.start}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest transition-colors"
          >
            Start Roleplay
          </button>
        </Card>
      )}

      {phase === 'play' && <PlayPhase scenarioId={scenarioId} entry={entry} session={session} onExit={() => navigate('/explore')} />}

      {phase === 'debrief' && (
        <Card className="p-6">
          <button
            onClick={() => navigate('/explore')}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest transition-colors"
          >
            Back to Explore
          </button>
        </Card>
      )}
    </div>
  );
}

/**
 * Minimal play-phase turn loop: the smallest thing that gives toScoringInput
 * and orchestrateAttempt a real caller on the graph runtime. Reuses
 * VisualNovelView as-is rather than a parallel shell.
 *
 * Deliberately NOT built here (Stage 7's worklist, per the plan's staging —
 * briefing tab / prep screen / deck rendering / debrief polish are out of
 * scope for this stage): NPC voice (no speakExaminerText/typing-dot
 * choreography — isTyping is always false here), a per-turn duration timer
 * (durationSec is passed as 0), and the "reveal next line only after
 * Continue" pacing StoryMode has — because submitTurn advances the reducer's
 * currentState synchronously, the next NPC line appears in the transcript
 * immediately on submit, before the learner dismisses the feedback panel for
 * the turn they just took.
 */
function PlayPhase({
  scenarioId,
  entry,
  session,
  onExit,
}: {
  scenarioId: string;
  entry: ScenarioEntry;
  session: ReturnType<typeof useRoleplaySession>;
  onExit: () => void;
}) {
  const { state: appState, dispatch } = useApp();
  const recording = useRecording();
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<FeedbackV2 | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expression, setExpression] = useState<Expression>('neutral');

  const { state: sessionState, npcLine, kind, missions, status } = session;

  // Passthrough nodes (hairdresser's memory setters) are entered, spoken, and
  // passed through — nothing is asked of the user, so nothing to record.
  useEffect(() => {
    if (kind === 'passthrough') session.advance();
  }, [kind, session]);

  // Reconstruct the transcript from the outcome log rather than mutating a
  // parallel local array — retry replaces outcomes wholesale, so a derived
  // view can't drift from what actually happened (unlike a manually-spliced
  // local list).
  const messages = useMemo(() => {
    const msgs: { text: string; sender: 'ai' | 'user' }[] = [];
    for (const outcome of sessionState.outcomes) {
      const line = pickPrompt(entry.graph[outcome.state]?.prompt ?? [], sessionState.rngSeed, outcome.state);
      if (line) msgs.push({ text: line, sender: 'ai' });
      if (outcome.transcript) msgs.push({ text: outcome.transcript, sender: 'user' });
    }
    if (npcLine) msgs.push({ text: npcLine, sender: 'ai' });
    return msgs;
  }, [sessionState.outcomes, sessionState.rngSeed, entry.graph, npcLine]);

  const objectives: Objective[] = missions.map((m) => ({
    id: m.id,
    text: m.en,
    isCompleted: status.completed.includes(m.id),
  }));
  const activeMission = missions.find((m) => !status.completed.includes(m.id));

  // Progression side effects (evidence/beliefs/XP/achievements) run once per
  // REAL outcome — never for a recovery skip (nothing was assessed) and never
  // for a passthrough auto_advance (PASSTHROUGH_LANGUAGE carries no
  // FeedbackV2 — there is no utterance to grade). Keyed on outcome identity,
  // not array length, so a retry (which replaces the last entry without
  // necessarily changing the array's length) still re-fires.
  const lastOrchestratedRef = useRef<TurnOutcome | undefined>(undefined);
  useEffect(() => {
    const outcomes = sessionState.outcomes;
    const last = outcomes[outcomes.length - 1];
    if (!last || last === lastOrchestratedRef.current) return;
    lastOrchestratedRef.current = last;
    if (last.intentResult.kind === 'skipped') return;
    const fb = last.language.feedback;
    if (!fb) return;

    // The exact Question handleStop scored against — not recomputed here,
    // because missions/status have already moved past this outcome (this
    // turn may itself have just completed the mission toScoringInput would
    // pick), which would silently swap in a different modelFr/hint than what
    // the learner actually saw when they answered.
    const question = pendingQuestionRef.current ?? toScoringInput({
      scenarioId,
      state: last.state,
      npcLine: pickPrompt(entry.graph[last.state]?.prompt ?? [], sessionState.rngSeed, last.state),
      meta: entry.meta,
      deck: entry.deck,
      missions,
      completedMissionIds: status.completed,
    });
    pendingQuestionRef.current = null;

    const unscored = isUnscored(fb);
    const finalScore = fb.scores.overall;
    const xp = unscored
      ? computeParticipationXPGain(appState.profile.streak_days)
      : computeXPGain(finalScore, appState.profile.streak_days);

    const roleplaySession: Session = {
      id: `roleplay-${scenarioId}-${last.turnIndex}-${Date.now()}`,
      mode: 'roleplay',
      // Deliberately no topicKey — keeps this synthetic per-turn id out of
      // reviewPool (see toScoringInput.ts / Language scoring & failure semantics).
      questionText: question.text,
      transcript: last.transcript,
      wordCount: fb.wordCount,
      score: unscored ? null : finalScore,
      xpEarned: xp.gain,
      durationSec: 0,
      feedback: fb,
      createdAt: new Date().toISOString(),
    };

    const orchestration = orchestrateAttempt({
      session: roleplaySession,
      question,
      feedback: fb,
      avoidanceSignals: [],
      transcript: last.transcript,
      durationSec: 0,
      mode: 'roleplay',
      finalScore,
      streakDays: appState.profile.streak_days,
      totalSessionsBefore: appState.profile.sessions_count,
    });

    dispatch({
      type: 'ADD_SESSION',
      session: roleplaySession,
      xpResult: orchestration.xpResult,
      newUnlockedAchievementIds: orchestration.newUnlockedAchievementIds,
      newLevelName: orchestration.newLevelName,
    });
    dispatch({ type: 'UPDATE_SKILL_PROFILE', skillProfile: getSkillProfile() });

    if (unscored) setExpression('thinking');
    else if (finalScore >= 8) setExpression('excited');
    else if (finalScore >= 6) setExpression('happy');
    else if (finalScore <= 3) setExpression('confused');
    else setExpression('thinking');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState.outcomes]);

  const retryingRef = useRef(false);
  const pendingQuestionRef = useRef<Question | null>(null);

  const handleStop = async () => {
    setIsProcessing(true);
    const transcript = await recording.stop();

    const question: Question = toScoringInput({
      scenarioId,
      state: sessionState.currentState,
      npcLine,
      meta: entry.meta,
      deck: entry.deck,
      missions,
      completedMissionIds: status.completed,
    });
    // Handed to the orchestration effect below so it scores/records against
    // the exact Question just used, not a recomputation after mission state
    // has moved on.
    pendingQuestionRef.current = question;

    let fb: FeedbackV2;
    try {
      fb = await getAIFeedback(transcript, question);
    } catch {
      fb = { ...buildTier0Result(), unscored: 'no_llm_offline', wordCount: countWords(transcript) };
    }
    const language: LanguageResult = isUnscored(fb) ? { kind: 'unscored', feedback: fb } : { kind: 'scored', feedback: fb };

    setIsProcessing(false);
    setLastFeedback(fb);
    setShowFeedback(true);

    if (retryingRef.current) {
      retryingRef.current = false;
      session.retry(transcript, language);
    } else {
      session.submitTurn(transcript, language);
    }
  };

  const handleRetry = () => {
    retryingRef.current = true;
    setShowFeedback(false);
    setLastFeedback(null);
  };

  const handleContinue = () => {
    setShowFeedback(false);
    setLastFeedback(null);
  };

  if (kind === 'passthrough') {
    return (
      <Card className="p-6">
        <p className="text-sm text-slate-400">{npcLine}</p>
      </Card>
    );
  }

  return (
    <VisualNovelView
      topic={entry.meta.title}
      role={entry.meta.npc.roleEn}
      expression={expression}
      messages={messages}
      objectives={objectives}
      currentInstruction={activeMission?.en}
      isTyping={false}
      isProcessing={isProcessing}
      recording={recording}
      showFeedback={showFeedback}
      lastFeedback={lastFeedback}
      onStopRecording={handleStop}
      onRetry={handleRetry}
      onNextStep={handleContinue}
      onExit={onExit}
    />
  );
}
