import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getRandomQuestion, getQuestionById } from '../data/gameData';
import { getAIFeedback } from '../services/api/apiClient';
import { getSkillProfile } from '../services/coaching/diagnosticEngine';
import type { Session, Question, Feedback } from '../types/index';
import { useRecording } from '../features/recording/useRecording';
import { ExamIntro } from './exam/ExamIntro';
import { ExamResults } from './exam/ExamResults';
import { ExamRunner } from './exam/ExamRunner';

import roleplaysData from '../data/raw/roleplays.json';

type ExamState = 'intro' | 'prep' | 'roleplay' | 'topic1' | 'topic2' | 'results';

const PREP_TIME = 600; // 10 minutes
const TOPIC_TIME = 240; // 4 minutes
const ROLEPLAY_LENGTH = 5;

const TOPIC_AREAS = {
  ab: ['school', 'hobbies', 'family', 'food', 'home'],
  cde: ['environment', 'future', 'holidays']
};

export function ExamMode() {
  const { dispatch } = useApp();
  const navigate = useNavigate();
  const [examState, setExamState] = useState<ExamState>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(PREP_TIME);
  const [answers, setAnswers] = useState<{ score: number; time: number; phase: string }[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeTopicQuestions, setActiveTopicQuestions] = useState<Question[]>([]);
  const [roleplayScenario, setRoleplayScenario] = useState<string>('');
  const [roleplayCandidateRole, setRoleplayCandidateRole] = useState<string>('');
  const timerRef = useRef<number | null>(null);
  const recording = useRecording();

  const currentQ = examState === 'roleplay' 
    ? questions[currentIndex] 
    : activeTopicQuestions[currentIndex];

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (examState === 'prep') {
      setTimeLeft(PREP_TIME);
      timerRef.current = window.setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { 
            clearInterval(timerRef.current!); 
            startRolePlay();
            return 0; 
          }
          return t - 1;
        });
      }, 1000);
    } else if (examState === 'topic1' || examState === 'topic2') {
      // For topics, the timer is overarching for the phase
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        setTimeLeft(t => {
          if (t <= 0) { 
            clearInterval(timerRef.current!); 
            return 0; 
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [examState]);

  const startExam = () => {
    // 1. Select Role Play from real data
    const rp = roleplaysData[Math.floor(Math.random() * roleplaysData.length)];
    const rpQs: Question[] = rp.question_ids.map(id => {
      const q = getQuestionById(id);
      if (q) return q;
      // Fallback if not in main bank
      return {
        id,
        text: "Question de jeu de rôle...",
        topicKey: 'role_play',
        difficulty: 2
      } as Question;
    });

    setQuestions(rpQs);
    setRoleplayScenario(rp.scenario);
    setRoleplayCandidateRole(rp.candidate_role || 'Candidat(e)');

    setCurrentIndex(0);
    setAnswers([]);
    setExamState('prep');
  };

  const startRolePlay = () => {
    setExamState('roleplay');
    setCurrentIndex(0);
  };

  const startTopic1 = () => {
    const topic = TOPIC_AREAS.ab[Math.floor(Math.random() * TOPIC_AREAS.ab.length)];
    const qs: Question[] = [];
    const usedIds: string[] = [];
    for (let i = 0; i < 6; i++) {
      const q = getRandomQuestion(topic, usedIds, 3);
      usedIds.push(q.id);
      qs.push(q);
    }
    setActiveTopicQuestions(qs);
    setCurrentIndex(0);
    setTimeLeft(TOPIC_TIME);
    setExamState('topic1');
  };

  const startTopic2 = () => {
    const topic = TOPIC_AREAS.cde[Math.floor(Math.random() * TOPIC_AREAS.cde.length)];
    const qs: Question[] = [];
    const usedIds: string[] = [];
    for (let i = 0; i < 6; i++) {
      const q = getRandomQuestion(topic, usedIds, 3);
      usedIds.push(q.id);
      qs.push(q);
    }
    setActiveTopicQuestions(qs);
    setCurrentIndex(0);
    setTimeLeft(TOPIC_TIME);
    setExamState('topic2');
  };

  const handleNextQuestion = async () => {
    const transcript = await recording.stop();
    const elapsed = recording.elapsedTime;

    let fb: Feedback | undefined;
    let score: number;
    try {
      fb = await getAIFeedback(transcript, currentQ);
      score = fb.scores.overall;
    } catch {
      score = Math.round((Math.random() * 4 + 5) * 10) / 10;
    }

    const newAnswer = { score, time: elapsed, phase: examState };
    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);

    if (examState === 'roleplay') {
      if (currentIndex + 1 >= ROLEPLAY_LENGTH) {
        startTopic1();
      } else {
        setCurrentIndex(i => i + 1);
      }
    } else if (examState === 'topic1') {
      if (timeLeft <= 0) {
        startTopic2();
      } else {
        if (currentIndex + 1 >= activeTopicQuestions.length) setCurrentIndex(0);
        else setCurrentIndex(i => i + 1);
      }
    } else if (examState === 'topic2') {
      if (timeLeft <= 0) {
        finishExam(newAnswers);
      } else {
        if (currentIndex + 1 >= activeTopicQuestions.length) setCurrentIndex(0);
        else setCurrentIndex(i => i + 1);
      }
    }
  };

  const finishExam = (finalAnswers?: { score: number; time: number; phase: string }[]) => {
    const targetAnswers = finalAnswers || answers;
    setExamState('results');
    const avgScore = Math.round((targetAnswers.reduce((s, a) => s + a.score, 0) / targetAnswers.length) * 10) / 10;
    const totalSec = targetAnswers.reduce((s, a) => s + a.time, 0);
    dispatch({ type: 'ADD_XP', amount: 100, x: 70, y: 20 });
    const session: Session = {
      id: Date.now().toString(),
      mode: 'exam',
      wordCount: Math.round(totalSec * 1.5),
      score: avgScore,
      xpEarned: 100,
      durationSec: totalSec,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_SESSION', session });
    dispatch({ type: 'UPDATE_SKILL_PROFILE', skillProfile: getSkillProfile() });
    confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
  };

  const timerTotal = examState === 'prep' ? PREP_TIME : TOPIC_TIME;
  const timerPercent = (timeLeft / timerTotal) * 100;
  const timerColor = timeLeft > 30 ? '#10B981' : timeLeft > 10 ? '#F59E0B' : '#EF4444';

  if (examState === 'intro') return <ExamIntro onStart={startExam} onBack={() => navigate('/')} />;

  if (examState === 'results') {
    return (
      <ExamResults
        answers={answers}
        questions={questions}
        onRetake={() => setExamState('intro')}
        onHome={() => navigate('/')}
      />
    );
  }

  return (
    <ExamRunner
      examState={examState as any}
      currentIndex={currentIndex}
      totalQuestions={examState === 'roleplay' ? ROLEPLAY_LENGTH : activeTopicQuestions.length}
      timeLeft={timeLeft}
      timerPercent={timerPercent}
      timerColor={timerColor}
      currentQuestion={currentQ}
      recording={recording}
      onNextQuestion={() => void handleNextQuestion()}
      onExit={() => navigate('/')}
      onSkipPrep={examState === 'prep' ? startRolePlay : undefined}
      roleplayScenario={roleplayScenario}
      roleplayCandidateRole={roleplayCandidateRole}
    />
  );
}

