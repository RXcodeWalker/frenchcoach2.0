import { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';
import { useRecording } from '../features/recording/useRecording';
import { RecordingPanel } from './learn/RecordingPanel';
import { PageShell } from '../components/layout/PageShell';
import { TopContextBar } from '../components/TopContextBar';
import { useHideDock } from '../components/layout/shellChrome';
import { useIsDesktop } from '../components/layout/useIsDesktop';
import { enter, enterReduced } from '../components/motion/variants';
import { useApp, dispatchAddXP } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useSpaceToRecord } from '../lib/useSpaceToRecord';
import { SpeakingConsentGate } from '../components/SpeakingConsentGate';
import { getRoleplayTurn, getAIFeedback } from '../services/api/apiClient';
import { observeAttempt } from '../services/coach/sessionOrchestrator';
import { getSkillProfile } from '../services/coaching/diagnosticEngine';
import type { FeedbackV2, GeneratedScenario } from '../types';

interface Message {
  id: string;
  text: string;
  sender: 'ai' | 'user';
  timestamp: number;
}

export function ScenarioArchitectSession() {
  const location = useLocation();
  const navigate = useNavigate();
  const { dispatch } = useApp();
  const { consentStatus } = useAuth();
  const recording = useRecording(consentStatus === 'pending');
  const endRef = useRef<HTMLDivElement>(null);
  const desktop = useIsDesktop();
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;
  useHideDock(true);

  const customScenario = location.state?.customScenario as GeneratedScenario;
  const description = location.state?.description as string | undefined;
  // Back returns to the architect with this scenario still on screen.
  const backToArchitect = () => navigate('/scenario-architect', { state: { customScenario, description } });

  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedObjectives, setCompletedObjectives] = useState<number[]>([]);

  useEffect(() => {
    if (!customScenario) {
      navigate('/scenario-architect');
      return;
    }

    // Start the conversation with the opening line
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addMessage(customScenario.opening_line, 'ai');
    }, 1500);
  }, [customScenario, navigate]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end', behavior: reduced ? 'auto' : 'smooth' });
  }, [messages, isTyping, reduced]);

  const addMessage = (text: string, sender: 'ai' | 'user') => {
    const newMessage: Message = {
      id: Math.random().toString(36).substring(2, 9),
      text,
      sender,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  useSpaceToRecord({
    enabled: !isTyping && !isProcessing,
    isRecording: recording.isRecording,
    onStart: () => void recording.start(),
    onStop: () => void handleStopRecording(),
  });

  const handleStopRecording = async () => {
    if (!customScenario) return;
    
    setIsProcessing(true);
    try {
      const transcript = await recording.stop();
      if (!transcript.trim()) {
        setIsProcessing(false);
        return;
      }
      
      addMessage(transcript, 'user');
      
      // Call AI for reply
      setIsTyping(true);
      const turnHistory = messages.map(m => ({
        speaker: m.sender === 'ai' ? 'examiner' : 'student' as 'examiner' | 'student',
        text: m.text
      }));

      const data = await getRoleplayTurn({
        scenario_id: 'custom',
        turn_history: turnHistory,
        student_transcript: transcript,
        custom_scenario: {
          title: customScenario.title,
          scenario: customScenario.scenario,
          npc_name: customScenario.npc_name,
          npc_personality: customScenario.npc_personality,
          objectives: customScenario.objectives,
        },
        turn_id: crypto.randomUUID(),
      });

      setIsTyping(false);
      addMessage(data.reply, 'ai');

      // Get AI feedback for coach evidence (fire-and-forget side effect)
      let fb: FeedbackV2;
      try {
        fb = await getAIFeedback(transcript, { id: 'scenario-architect', text: customScenario.title, topicKey: 'scenario', hint: '', difficulty: 2, followUps: [], modelAnswer: '', keyVocab: [] });
      } catch {
        fb = { scores: { overall: 0, communication: 0, language: 0, fluency: 0 }, unscored: 'evaluation_failed', grammar: { critical: [], polish: [] }, vocabulary: [], style: [], fillers: [], wordCount: transcript.split(/\s+/).filter(Boolean).length, cefrLevel: 'A2' };
      }
      observeAttempt({
        sessionId: `scenario-architect-${Date.now()}-${messages.length}`,
        question: null,
        feedback: fb,
        transcript,
        finalScore: fb.scores.overall,
        mode: 'scenario-architect',
        topicKey: customScenario.title,
      });
      dispatch({ type: 'UPDATE_SKILL_PROFILE', skillProfile: getSkillProfile() });

      // Simple objective tracking heuristic (normally handled by AI)
      // For this demo, we'll just mark one as done every few turns
      if (messages.length > 2 && completedObjectives.length < customScenario.objectives.length) {
        setCompletedObjectives(prev => [...prev, prev.length]);
        dispatchAddXP(dispatch, 20, 'roleplay');
      }

    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!customScenario) return null;

  const busy = isTyping || isProcessing;

  return (
    <>
      <TopContextBar
        title={customScenario.title}
        subtitle={customScenario.npc_name}
        showBack
        onBack={backToArchitect}
        backLabel="Back to Scenario Architect"
      />
      <PageShell maxWidth="xl" gap={16}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="mx-auto flex min-h-[calc(100dvh-170px)] w-full max-w-[720px] flex-col gap-4 lg:min-h-0">
            <ol aria-live="polite" aria-label="Conversation" className="flex flex-col gap-3">
              {messages.map((msg) => (
                <motion.li
                  key={msg.id}
                  variants={item}
                  initial="hidden"
                  animate="show"
                  className={`flex flex-col gap-1 ${msg.sender === 'ai' ? 'items-start' : 'items-end'}`}
                >
                  <span className="text-eyebrow uppercase text-ink-subtle">
                    {msg.sender === 'ai' ? customScenario.npc_name : 'You'}
                  </span>
                  <p
                    className={`max-w-[85%] rounded-card px-4 py-3 text-body-base ${
                      msg.sender === 'ai' ? 'border border-hairline bg-surface text-ink' : 'bg-action-soft text-action-text'
                    }`}
                  >
                    {msg.text}
                  </p>
                </motion.li>
              ))}
              {isTyping && (
                <li className="text-body-s text-ink-subtle">{customScenario.npc_name} is replying…</li>
              )}
            </ol>
            <div ref={endRef} />

            <div className="mt-auto">
              {busy ? (
                <div role="status" className="flex items-center gap-3 rounded-card surface p-4 text-body-s text-ink-muted">
                  <Loader2 size={18} className="shrink-0 animate-spin" aria-hidden="true" />
                  {isProcessing ? 'Listening back to your answer…' : 'Waiting for the reply…'}
                </div>
              ) : (
                <SpeakingConsentGate>
                  <RecordingPanel isActive recording={recording} onStop={handleStopRecording} compact={!desktop} />
                </SpeakingConsentGate>
              )}
            </div>
          </div>

          <aside aria-label="Objectives" className="flex flex-col gap-3 self-start rounded-card surface p-5 max-lg:order-first">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-section text-ink">Objectives</h2>
              <span className="font-numeral text-caption text-ink-subtle">
                {completedObjectives.length} of {customScenario.objectives.length}
              </span>
            </div>
            <ul className="flex flex-col gap-2.5">
              {customScenario.objectives.map((obj, i) => {
                const done = completedObjectives.includes(i);
                return (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-pill ${
                        done ? 'bg-progress text-action-ink' : 'border border-hairline-strong'
                      }`}
                    >
                      {done && <Check size={12} strokeWidth={3} />}
                    </span>
                    <span className={`text-body-s ${done ? 'text-ink-subtle line-through' : 'text-ink'}`}>
                      {obj}
                      {done && <span className="sr-only"> (done)</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      </PageShell>
    </>
  );
}
