import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { PageShell } from '../components/layout/PageShell';
import { TopContextBar } from '../components/TopContextBar';
import { enter, enterReduced, fill } from '../components/motion/variants';
import { getScenario, isAuthored } from '../data/scenarios/registry';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { SpeakingConsentGate } from '../components/SpeakingConsentGate';
import { useRecording, type RecordingState } from '../features/recording/useRecording';
import { useRoleplaySession, pickPrompt, countWords } from '../features/roleplay/useRoleplaySession';
import { toScoringInput } from '../features/roleplay/toScoringInput';
import { getAIFeedback } from '../services/api/apiClient';
import { buildTier0Result } from '../services/coaching/responseTier';
import { orchestrateAttempt } from '../services/coach/sessionOrchestrator';
import { getSkillProfile } from '../services/coaching/diagnosticEngine';
import { isUnscored } from '../domain/scoring';
import { computeXPGain, computeParticipationXPGain } from '../domain/xp';
import { TurnAttemptTracker, MAX_REDOS } from '../domain/turnAttempts';
import { VisualNovelView } from '../components/ui/VisualNovelView';
import type { PanelEntry } from '../components/ui/LiveFeedbackPanel';
import { ScenarioPrepScreen } from '../components/ui/ScenarioPrepScreen';
import { hasFrenchVoice } from '../services/exam/examinerVoice';
import type { Expression } from '../components/ui/CharacterAvatar';
import type { Objective } from '../components/ui/MissionObjectivesList';
import type { FeedbackV2, Question, Session } from '../types';
import type { LanguageResult, Mission, ScenarioDeck, ScenarioGraph, ScenarioMeta } from '../features/roleplay/types';

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
  const { meta, deck } = entry;
  const session = useRoleplaySession(scenarioId, entry.graph, meta);
  const { phase } = session.state;
  const { consentStatus } = useAuth();
  // Lifted here (not inside PlayPhase) so the prep screen's capability check
  // reads the same sttSupported the play phase actually records with.
  const recording = useRecording(consentStatus === 'pending');

  const allMissions: Mission[] = useMemo(
    () => Object.values(meta.branches).flatMap((b) => b.missions),
    [meta.branches],
  );

  const leave = () => navigate('/explore');
  const preparing = phase === 'briefing' || phase === 'prep';

  if (phase === 'play') {
    return <PlayPhase scenarioId={scenarioId} entry={entry} session={session} recording={recording} onExit={leave} />;
  }

  return (
    <>
      <TopContextBar
        title={meta.title}
        subtitle={`${meta.npc.nameFr} · ${meta.npc.roleEn}`}
        showBack
        onBack={leave}
        backLabel="Back to Explore"
      />
      <PageShell maxWidth="md" gap={24}>
        {preparing &&
          (consentStatus === 'pending' ? (
            <SpeakingConsentGate>
              {/* Never rendered while pending — SpeakingConsentGate shows the
                  waiting message instead. Present only so children is non-empty. */}
              <span />
            </SpeakingConsentGate>
          ) : (
            <ScenarioPrepScreen
              meta={meta}
              deck={deck.entries}
              missions={allMissions}
              sttSupported={recording.sttSupported}
              hasFrenchVoice={hasFrenchVoice()}
              onReady={session.start}
              onCancel={leave}
            />
          ))}

        {phase === 'debrief' && <DebriefPhase session={session} onExit={leave} />}
      </PageShell>
    </>
  );
}

/**
 * Minimal play-phase turn loop: the smallest thing that gives toScoringInput
 * and orchestrateAttempt a real caller on the graph runtime. Reuses
 * VisualNovelView as-is rather than a parallel shell.
 *
 * Deliberately NOT built here: NPC voice (no speakExaminerText/typing-dot
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
  recording,
  onExit,
}: {
  scenarioId: string;
  entry: ScenarioEntry;
  session: ReturnType<typeof useRoleplaySession>;
  recording: RecordingState;
  onExit: () => void;
}) {
  const { state: appState, dispatch } = useApp();
  const [expression, setExpression] = useState<Expression>('neutral');
  const [panelEntries, setPanelEntries] = useState<PanelEntry[]>([]);

  const { state: sessionState, npcLine, kind, missions, status } = session;

  const trackerRef = useRef(new TurnAttemptTracker<Question, LanguageResult>());
  const tracker = trackerRef.current;
  const lastLockedTurnKeyRef = useRef<number | null>(null);
  /** Non-null while re-recording a prior turn — set by tapping "Redo" in the
   *  panel, consumed by handleStop, which then knows this stop is a redo of
   *  that turnKey rather than an answer to the current graph state. */
  const redoTargetRef = useRef<number | null>(null);

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

  const upsertPanelEntry = (entryPatch: PanelEntry) => {
    setPanelEntries((prev) => {
      const idx = prev.findIndex((e) => e.turnKey === entryPatch.turnKey);
      if (idx === -1) return [...prev, entryPatch];
      const next = [...prev];
      next[idx] = entryPatch;
      return next;
    });
  };

  const runOrchestration = (
    turnKey: number,
    transcript: string,
    question: Question,
    language: LanguageResult,
  ) => {
    if (language.kind === 'pending') return;
    const fb = language.feedback;
    if (!fb) return; // passthrough turn — nothing to grade, nothing to orchestrate

    const unscored = isUnscored(fb);
    const finalScore = fb.scores.overall;
    const xp = unscored
      ? computeParticipationXPGain(appState.profile.streak_days)
      : computeXPGain(finalScore, appState.profile.streak_days);

    const roleplaySession: Session = {
      id: `roleplay-${scenarioId}-${turnKey}-${Date.now()}`,
      mode: 'roleplay',
      // Deliberately no topicKey — keeps this synthetic per-turn id out of
      // reviewPool (see toScoringInput.ts / Language scoring & failure semantics).
      questionText: question.text,
      transcript,
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
      transcript,
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
  };

  const submitAnswer = (turnKey: number, transcript: string, question: Question, isRedo: boolean) => {
    const attemptSeq = tracker.begin(turnKey, transcript, question, isRedo);
    upsertPanelEntry({ turnKey, transcript, status: 'pending', feedback: null });

    // Advance the graph/NPC reply immediately with a pending placeholder —
    // never wait on feedback to keep the dialogue moving.
    if (isRedo) {
      session.retry(transcript, { kind: 'pending' });
    } else {
      session.submitTurn(transcript, { kind: 'pending' });
    }

    void (async () => {
      let fb: FeedbackV2;
      try {
        fb = await getAIFeedback(transcript, question);
      } catch {
        fb = { ...buildTier0Result(), unscored: 'no_llm_offline', wordCount: countWords(transcript) };
      }
      const language: LanguageResult = isUnscored(fb) ? { kind: 'unscored', feedback: fb } : { kind: 'scored', feedback: fb };

      const record = tracker.resolve(turnKey, attemptSeq, language);
      if (record === null) return; // stale — a redo has since superseded this attempt

      upsertPanelEntry({ turnKey, transcript: record.transcript, status: 'resolved', feedback: fb });
      runOrchestration(turnKey, record.transcript, record.question, record.language as LanguageResult);
    })();
  };

  const lockTurn = (turnKey: number) => {
    const record = tracker.lock(turnKey);
    if (record === null || record.language === null || record.language.kind === 'pending') return;
    runOrchestration(turnKey, record.transcript, record.question, record.language);
  };

  const handleStop = async () => {
    const redoTarget = redoTargetRef.current;

    if (redoTarget !== null) {
      redoTargetRef.current = null;
      const checkpoint = sessionState.checkpoint;
      const preTurnState = checkpoint?.currentState ?? sessionState.currentState;
      const transcript = await recording.stop();

      // Rebuilt from the pre-turn state (checkpoint), not the live state —
      // a redo re-scores the same question the learner originally answered.
      const question: Question = toScoringInput({
        scenarioId,
        state: preTurnState,
        npcLine: pickPrompt(entry.graph[preTurnState]?.prompt ?? [], sessionState.rngSeed, preTurnState),
        meta: entry.meta,
        deck: entry.deck,
        missions,
        completedMissionIds: status.completed,
      });

      submitAnswer(redoTarget, transcript, question, true);
      return;
    }

    // Locking is a synchronous flag flip on the *previous* turn's key, done
    // the instant a fresh (non-redo) recording is taken — it never waits on
    // that turn's feedback to arrive.
    if (lastLockedTurnKeyRef.current !== null) {
      lockTurn(lastLockedTurnKeyRef.current);
      lastLockedTurnKeyRef.current = null;
    }

    const turnKey = sessionState.turnIndex;
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

    submitAnswer(turnKey, transcript, question, false);
    lastLockedTurnKeyRef.current = turnKey;
  };

  const handleRedo = (turnKey: number) => {
    if (!tracker.canRedo(turnKey)) return;
    redoTargetRef.current = turnKey;
    recording.start();
  };

  // Reaching debrief locks the last turn's key — locking never waits on
  // feedback, so this fires even if that turn's AI call is still in flight.
  useEffect(() => {
    if (sessionState.phase === 'debrief' && lastLockedTurnKeyRef.current !== null) {
      lockTurn(lastLockedTurnKeyRef.current);
      lastLockedTurnKeyRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState.phase]);

  if (kind === 'passthrough') {
    return (
      <>
        <TopContextBar title={entry.meta.title} subtitle={entry.meta.npc.nameFr} showBack onBack={onExit} backLabel="Leave role play" />
        <PageShell maxWidth="md">
          <p className="rounded-card surface p-5 text-body-base text-ink">{npcLine}</p>
        </PageShell>
      </>
    );
  }

  return (
    <VisualNovelView
      topic={entry.meta.title}
      npc={entry.meta.npc}
      expression={expression}
      messages={messages}
      objectives={objectives}
      currentInstruction={activeMission?.en}
      isTyping={false}
      recording={recording}
      panelEntries={panelEntries}
      canRedo={(turnKey) => tracker.canRedo(turnKey)}
      redosLeft={(turnKey) => MAX_REDOS - (tracker.get(turnKey)?.retryCount ?? 0)}
      onStopRecording={handleStop}
      onRedo={handleRedo}
      onExit={onExit}
    />
  );
}

/**
 * Reached at a terminal state or MAX_TURNS. Reports Task (mission ratio) and
 * whether the session got there via a recovery skip — a session that reached
 * the end through `hadSkips` did not complete under its own steam, so the
 * copy says so rather than presenting the ratio as an unqualified result.
 */
function DebriefPhase({
  session,
  onExit,
}: {
  session: ReturnType<typeof useRoleplaySession>;
  onExit: () => void;
}) {
  const { status, ratio } = session;
  const percent = Math.round(ratio * 100);
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;

  return (
    <motion.section variants={item} aria-labelledby="debrief-title" className="flex flex-col gap-5 rounded-card surface p-6">
      <div>
        <p className="text-eyebrow uppercase text-ink-subtle">Task summary</p>
        <h2 id="debrief-title" className="mt-1 text-title text-ink">Role play complete</h2>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-numeral text-num-l text-ink">{percent}%</span>
          <span className="text-body-s text-ink-muted">
            {status.completed.length} of {status.applicable} missions completed
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Missions completed"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="relative h-1.5 overflow-hidden rounded-pill bg-track"
        >
          <motion.span
            className="absolute inset-y-0 left-0 rounded-pill bg-progress"
            initial={{ width: reduced ? `${percent}%` : 0 }}
            animate={{ width: `${percent}%` }}
            transition={reduced ? { duration: 0 } : fill()}
          />
        </div>
        {percent >= 100 && (
          <p className="mt-1 inline-flex items-center gap-1.5 text-label text-progress-text">
            <Check size={14} aria-hidden="true" /> Every mission done
          </p>
        )}
      </div>

      {status.skipped && (
        <p className="rounded-control bg-reward-soft px-4 py-3 text-body-s text-reward-text">
          Moving on — this session included at least one step that wasn’t completed and was skipped automatically. It reached the end via recovery, not entirely under your own steam.
        </p>
      )}

      <Button size="lg" onClick={onExit} className="w-full sm:w-auto sm:self-start">Back to Explore</Button>
    </motion.section>
  );
}
