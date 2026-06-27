import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowLeft, MessageSquare, Star, ChevronRight, User, Info, CheckCircle2 } from 'lucide-react';
import { useApp, dispatchAddXP } from '../context/AppContext';
import roleplays from '../data/raw/roleplays.json';
import allQuestions from '../data/raw/questions.json';
import { RecordingPanel } from './learn/RecordingPanel';
import { FeedbackPanel } from './learn/FeedbackPanel';
import { useRecording } from '../features/recording/useRecording';
import { getAIFeedback, getRoleplayTurn } from '../services/api/apiClient';
import { ScenarioPrepScreen } from '../components/ui/ScenarioPrepScreen';
import { VisualNovelView } from '../components/ui/VisualNovelView';
import type { Expression } from '../components/ui/CharacterAvatar';
import type { Objective } from '../components/ui/MissionObjectivesList';
import type { FeedbackV2, Question } from '../types';
import { observeAttempt } from '../services/coach/sessionOrchestrator';
import { getSkillProfile } from '../services/coaching/diagnosticEngine';

interface Roleplay {
  id: string;
  scenario: string;
  candidate_role?: string;
  examiner_role?: string;
  question_ids: string[];
}

interface Message {
  id: string;
  text: string;
  sender: 'ai' | 'user';
  timestamp: number;
}

export function StoryMode() {
  const navigate = useNavigate();
  const { dispatch } = useApp();
  const recording = useRecording();
  
  const [selectedStory, setSelectedStory] = useState<Roleplay | null>(null);
  const [isPrepping, setIsPrepping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [showFeedback, setShowFeedbackV2] = useState(false);
  const [lastFeedback, setLastFeedbackV2] = useState<FeedbackV2 | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [expression, setExpression] = useState<Expression>('neutral');
  const [overallScore, setOverallScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const selectStory = (story: Roleplay) => {
    setSelectedStory(story);
    setIsPrepping(true);
  };

  const startStory = () => {
    if (!selectedStory) return;
    setIsPrepping(false);
    setCurrentStep(0);
    setMessages([]);
    setShowFeedbackV2(false);
    setLastFeedbackV2(null);
    setOverallScore(0);
    setIsFinished(false);
    setExpression('happy');

    // Initialize Objectives
    const objs: Objective[] = selectedStory.question_ids.map((qid, i) => {
      const q = allQuestions.find(item => item.id === qid);
      return {
        id: qid,
        text: q?.instruction || `Complete part ${i + 1} of the exchange`,
        isCompleted: false
      };
    });
    setObjectives(objs);
    
    const firstQId = selectedStory.question_ids[0];
    const question = allQuestions.find(q => q.id === firstQId);
    
    if (question) {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        addMessage(question.text, 'ai');
      }, 1000);
    }
  };

  const addMessage = (text: string, sender: 'ai' | 'user') => {
    const newMessage: Message = {
      id: Math.random().toString(36).substring(2, 9),
      text,
      sender,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleStopRecording = async () => {
    if (!selectedStory) return;
    
    setIsProcessing(true);
    const transcript = await recording.stop();
    
    const currentQId = selectedStory.question_ids[currentStep];
    const question = allQuestions.find(q => q.id === currentQId) as unknown as Question;
    
    let fb: FeedbackV2;
    try {
      fb = await getAIFeedback(transcript, question);
    } catch {
      fb = { scores: { overall: 5, communication: 5, language: 5, fluency: 5 }, grammar: { critical: [], polish: [] }, vocabulary: [], style: [], fillers: [], wordCount: transcript.split(/\s+/).filter(Boolean).length, cefrLevel: 'A2' };
    }
    
    setIsProcessing(false);
    addMessage(transcript, 'user');
    setLastFeedbackV2(fb);
    setShowFeedbackV2(true);
    setOverallScore(prev => prev + fb.scores.overall);

    // Update expression based on feedback
    if (fb.scores.overall >= 8) setExpression('excited');
    else if (fb.scores.overall >= 6) setExpression('happy');
    else if (fb.scores.overall <= 3) setExpression('confused');
    else setExpression('thinking');

    // Emit evidence + update beliefs for the coach system.
    observeAttempt({
      sessionId: `story-${Date.now()}-${currentStep}`,
      question: question ?? null,
      feedback: fb,
      transcript,
      finalScore: fb.scores.overall,
      mode: 'story',
      topicKey: selectedStory?.id,
    });
    dispatch({ type: 'UPDATE_SKILL_PROFILE', skillProfile: getSkillProfile() });

    dispatchAddXP(dispatch, 10);
  };

  const handleNextStep = async () => {
    if (!selectedStory) return;

    // Check if we should use LLM fallback for off-script response
    const lastCommScore = lastFeedback?.scores.communication || 0;
    const isOffScript = lastCommScore < 4;

    if (isOffScript && currentStep < selectedStory.question_ids.length) {
      setIsTyping(true);
      setShowFeedbackV2(false);
      try {
        const history = messages.map(m => ({
          speaker: m.sender === 'ai' ? 'examiner' : 'student' as const,
          text: m.text
        }));
        
        const turn = await getRoleplayTurn({
          scenario_id: 'custom',
          turn_history: history,
          student_transcript: messages[messages.length - 1].text,
          is_final_turn: currentStep === selectedStory.question_ids.length - 1
        });

        setIsTyping(false);
        addMessage(turn.reply, 'ai');
        setExpression('thinking');
        // We stay on the current step if they are off-script to let them try again
        // or we can move forward if the LLM guided them back.
        // For now, let's keep them on the step until they pass.
        return; 
      } catch (e) {
        console.error("LLM Fallback failed:", e);
      }
    }

    // Mark current objective as completed
    const currentQId = selectedStory?.question_ids[currentStep];
    setObjectives(prev => prev.map(obj => 
      obj.id === currentQId ? { ...obj, isCompleted: true } : obj
    ));

    setShowFeedbackV2(false);
    setLastFeedbackV2(null);
    setExpression('neutral');
    const nextStep = currentStep + 1;
    
    if (nextStep < selectedStory.question_ids.length) {
      setCurrentStep(nextStep);
      const nextQId = selectedStory.question_ids[nextStep];
      const question = allQuestions.find(q => q.id === nextQId);
      
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        if (question) {
          addMessage(question.text, 'ai');
          setExpression('happy');
        }
      }, 1500);
    } else {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        addMessage("Excellent travail ! L'échange est terminé.", 'ai');
        setExpression('excited');
        setIsFinished(true);
        dispatchAddXP(dispatch, 50);
      }, 1000);
    }
  };

  if (!selectedStory) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <button 
            onClick={() => navigate('/explore')}
            className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white">Story Mode</h1>
            <p className="text-sm text-slate-500">Immerse yourself in interactive French scenarios.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roleplays.map((story) => (
            <motion.button
              key={story.id}
              onClick={() => selectStory(story as Roleplay)}
              className="glass-elevated p-6 text-left group hover:border-emerald-500/30 transition-all relative overflow-hidden"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/10">
                  <BookOpen size={24} />
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3].map(i => (
                    <Star key={i} size={10} className={i <= 2 ? 'text-emerald-400 fill-emerald-400' : 'text-slate-800'} />
                  ))}
                </div>
              </div>
              <h3 className="font-bold text-white mb-2 line-clamp-2 relative z-10">{story.scenario}</h3>
              {story.candidate_role && (
                <p className="text-xs text-slate-400 mb-4 line-clamp-1"><b>Role:</b> {story.candidate_role}</p>
              )}
              <div className="flex items-center justify-between mt-6 relative z-10">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                  <MessageSquare size={12} />
                  {story.question_ids.length} Exchanges
                </span>
                <div className="text-emerald-400 flex items-center gap-1 text-[10px] font-bold">
                  PLAY <ChevronRight size={14} />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  if (isPrepping) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 h-[calc(100vh-2rem)] flex flex-col">
        <div className="mb-6 flex items-center gap-3">
           <button 
            onClick={() => {
              setIsPrepping(false);
              setSelectedStory(null);
            }}
            className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-black text-white uppercase italic">Prep Phase</h2>
        </div>
        <div className="flex-1 overflow-hidden">
          <ScenarioPrepScreen 
            topic={selectedStory.scenario} 
            onReady={startStory} 
            onCancel={() => {
              setIsPrepping(false);
              setSelectedStory(null);
            }}
          />
        </div>
      </div>
    );
  }

  const currentQId = selectedStory.question_ids[currentStep];
  const currentQuestionData = allQuestions.find(q => q.id === currentQId) as any;

  return (
    <VisualNovelView 
      topic={selectedStory.scenario}
      role={selectedStory.examiner_role || 'Friend'}
      expression={expression}
      messages={messages}
      objectives={objectives}
      currentInstruction={currentQuestionData?.instruction}
      isTyping={isTyping}
      isProcessing={isProcessing}
      recording={recording}
      showFeedback={showFeedback}
      lastFeedback={lastFeedback}
      onStopRecording={handleStopRecording}
      onNextStep={handleNextStep}
      onExit={() => setSelectedStory(null)}
    />
  );
}
