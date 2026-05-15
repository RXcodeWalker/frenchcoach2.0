import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Zap, Shield, Gem, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTopicQuestions, getRandomQuestion } from '../data/gameData';
import { useItem } from '../services/progression/progressionService';
import { getAIFeedback } from '../services/api/apiClient';
import { getSkillProfile, buildSkillContext, detectAvoidance, runAfterSession } from '../services/coaching/diagnosticEngine';
import { useRecording } from '../features/recording/useRecording';
import { TopicGrid } from './learn/TopicGrid';
import { QuestionCard } from './learn/QuestionCard';
import { RecordingPanel } from './learn/RecordingPanel';
import { FeedbackExperience } from '../features/feedback';
import { TopContextBar } from '../components/TopContextBar';
import { SessionCompletion } from '../components/SessionCompletion';
import type { Topic, Question, Session, FeedbackV2 } from '../types/index';

type LearnState = 'topics' | 'question' | 'recording' | 'feedback' | 'complete';

export function Learn() {
  const { state, dispatch } = useApp();
  const { profile } = state;
  const [learnState, setLearnState] = useState<LearnState>('topics');
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackV2 | null>(null);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const recording = useRecording();

  const activeBoosters = (profile.activeBoosters || []).filter(b => new Date(b.expiresAt) > new Date());
  const hasShield = (profile.inventory?.['perfect_shield'] || 0) > 0;

  const selectTopic = (topic: Topic) => {
    setSelectedTopic(topic);
    const q = getRandomQuestion(topic.key);
    setCurrentQuestion(q);
    setLearnState('question');
    setShowHint(false);
    setFeedback(null);
  };

  const nextQuestion = () => {
    if (!selectedTopic) return;
    const q = getRandomQuestion(selectedTopic.key, currentQuestion ? [currentQuestion.id] : []);
    setCurrentQuestion(q);
    setLearnState('question');
    setShowHint(false);
    setFeedback(null);
    recording.stop();
  };

  const handleStopRecording = async () => {
    const transcript = await recording.stop();
    setLearnState('feedback');
    setIsLoadingFeedback(true);

    const elapsed = recording.elapsedTime;

    // Build personalization context BEFORE calling AI — this is the key change
    const skillContext = buildSkillContext();
    const avoidanceSignals = detectAvoidance(transcript, currentQuestion!);

    let fb: FeedbackV2;
    try {
      fb = await getAIFeedback(transcript, currentQuestion!, skillContext, recording.audioBlob ?? undefined);
      // Inject offline-detected avoidance into the feedback for the UI
      if (avoidanceSignals.length > 0 && !fb.avoidanceReport?.length) {
        fb = { ...fb, avoidanceReport: avoidanceSignals, skillContextUsed: true };
      } else if (skillContext.sessionsAnalyzed > 0) {
        fb = { ...fb, skillContextUsed: true };
      }
    } catch {
      fb = {
        scores: { overall: 5, communication: 5, language: 5, fluency: 5 },
        grammar: { critical: [], polish: [] },
        vocabulary: [], style: [], fillers: [],
        wordCount: transcript.split(/\s+/).filter(Boolean).length,
        cefrLevel: 'A2',
        pronunciation: { score: 7, issues: [] },
        avoidanceReport: avoidanceSignals,
      };
    }
    setFeedback(fb);
    setIsLoadingFeedback(false);

    let finalScore = fb.scores.overall;
    let usedShield = false;

    if (finalScore < 8.5 && (profile.inventory['perfect_shield'] || 0) > 0) {
      finalScore = Math.max(8.5, finalScore + 2);
      usedShield = true;
      if (useItem('perfect_shield')) {
        dispatch({ type: 'USE_ITEM', itemId: 'perfect_shield' });
      }
    }

    const xpGain = 25 + Math.round(finalScore * 2);
    dispatch({ type: 'ADD_XP', amount: xpGain, x: 60, y: 30 });

    const session: Session = {
      id: Date.now().toString(),
      mode: 'practice',
      topicKey: selectedTopic?.key,
      questionText: currentQuestion?.text,
      transcript,
      wordCount: fb.wordCount,
      score: finalScore,
      xpEarned: xpGain,
      durationSec: elapsed,
      feedback: fb,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_SESSION', session });

    // Run diagnostic engine with avoidance signals for accurate skill tracking
    runAfterSession(fb, avoidanceSignals);

    if (usedShield) {
      // Small visual feedback for shield
    }

    dispatch({ type: 'UPDATE_SKILL_PROFILE', skillProfile: getSkillProfile() });
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#06B6D4', '#0EA5E9', '#6366F1', '#A855F7', '#EC4899', '#F59E0B'],
      ticks: 500,
      gravity: 0.8,
      shapes: ['circle', 'square'],
    });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopContextBar 
        title={learnState === 'topics' ? "Learning Hub" : (selectedTopic?.label || "Practice")}
        subtitle={learnState === 'topics' ? "Choose a topic to begin" : "Active Session"}
        showBack={learnState !== 'topics'}
        onBack={() => setLearnState('topics')}
      />

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-6 py-6 md:py-8">
        <AnimatePresence mode="wait">
          {learnState === 'topics' && (
            <motion.div
              key="topics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <TopicGrid onSelect={selectTopic} />
            </motion.div>
          )}

          {(learnState === 'question' || learnState === 'recording' || learnState === 'feedback') && (
            <motion.div
              key="practice"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {currentQuestion && (
                <QuestionCard
                  question={currentQuestion}
                  showHint={showHint}
                  onToggleHint={() => setShowHint(!showHint)}
                />
              )}

              <RecordingPanel
                isActive={learnState === 'question' || learnState === 'recording'}
                recording={recording}
                onStop={handleStopRecording}
              />

              {learnState === 'feedback' && (
                <FeedbackExperience
                  feedback={feedback}
                  isLoading={isLoadingFeedback}
                  transcript={recording.transcript}
                  modelAnswer={currentQuestion?.modelAnswer}
                  onRetry={() => setLearnState('question')}
                  onComplete={() => { 
                    setLearnState('complete'); 
                    triggerConfetti(); 
                  }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {learnState === 'complete' && feedback && (
          <SessionCompletion
            score={feedback.scores.overall}
            xpEarned={25 + Math.round(feedback.scores.overall * 2)}
            wordCount={feedback.wordCount}
            skillImprovement={{ name: 'Fluency', before: 78, after: 81 }} // Mocked for now
            onNext={() => { nextQuestion(); }}
            onRetry={() => setLearnState('question')}
            onBack={() => setLearnState('topics')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

