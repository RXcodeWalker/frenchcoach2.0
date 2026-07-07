import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sword, Heart, Zap, Trophy, ArrowLeft, RefreshCw, Skull, Clock, Shield } from 'lucide-react';
import { useApp } from '../context/AppContext';
import minigameQuestions from '../data/scenarios/minigameQuestions.json';
import { matchTypedAnswer, completeMinigameSession } from '../features/minigames';

type GameState = 'selection' | 'battle' | 'finished';
type PlayerAction = 'attack' | 'heavy' | 'heal' | 'shield';

interface Boss {
  id: string;
  name: string;
  title: string;
  icon: string;
  phase2Icon: string;
  color: string;
  hp: number;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  mechanic: 'blur' | 'timer' | 'lock' | 'poison' | 'stun';
  category: string;
}

const BOSSES: Boss[] = [
  {
    id: 'subjunctive',
    name: 'Le Sorcier du Subjonctif',
    title: 'The Subjunctive Sorcerer',
    icon: '🧙‍♂️',
    phase2Icon: '💀',
    color: '#7C3AED',
    hp: 120,
    difficulty: 'hard',
    category: 'subjunctive',
    mechanic: 'blur',
    description: 'Master of subjectivity and doubt. He blurs your vision with his Fog of Doubt.'
  },
  {
    id: 'future',
    name: 'Le Golem du Futur',
    title: 'The Golem of the Future',
    icon: '🤖',
    phase2Icon: '🌋',
    color: '#0EA5E9',
    hp: 150,
    difficulty: 'hard',
    category: 'future',
    mechanic: 'stun',
    description: 'A massive stone giant from the time ahead. His heavy hits can stun your actions.'
  },
  {
    id: 'past_tense',
    name: 'Le Chevalier du Passé',
    title: 'The Past Tense Knight',
    icon: '🏇',
    phase2Icon: '⚔️',
    color: '#EF4444',
    hp: 100,
    difficulty: 'medium',
    category: 'past_tense',
    mechanic: 'timer',
    description: 'A warrior from the past. He enforces a strict time limit on your decisions.'
  },
  {
    id: 'negation',
    name: 'L\'Ombre de la Négation',
    title: 'The Shadow of Negation',
    icon: '👤',
    phase2Icon: '🌑',
    color: '#475569',
    hp: 90,
    difficulty: 'medium',
    category: 'negation',
    mechanic: 'poison',
    description: 'A shadowy figure of denial. Her venomous words drain your life over time.'
  },
  {
    id: 'gender',
    name: 'La Reine du Genre',
    title: 'The Queen of Gender',
    icon: '👑',
    phase2Icon: '👺',
    color: '#EC4899',
    hp: 80,
    difficulty: 'easy',
    category: 'gender',
    mechanic: 'lock',
    description: 'She rules over nouns. Miss a question, and she locks your focus with Gender Lock.'
  }
];

export function BossBattle() {
  const navigate = useNavigate();
  const { dispatch } = useApp();
  
  const [gameState, setGameState] = useState<GameState>('selection');
  const [selectedBoss, setSelectedBoss] = useState<Boss | null>(null);
  const [bossHp, setBossHp] = useState(100);
  const [playerHp, setPlayerHp] = useState(100);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [lastAction, setLastAction] = useState<'hit' | 'miss' | 'player_hit' | 'heal' | 'shield' | null>(null);
  const [isWon, setIsWon] = useState(false);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [damageNumbers, setDamageNumbers] = useState<{ id: number; value: number | string; x: number; y: number; type: 'player' | 'boss' | 'heal' | 'poison' }[]>([]);
  const [bossTaunt, setBossTaunt] = useState<string | null>(null);
  const [superMeter, setSuperMeter] = useState(0);
  const [inputFeedback, setInputFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [isSuperAttacking, setIsSuperAttacking] = useState(false);
  
  // New "Ultimate" States
  const [phase, setPhase] = useState<1 | 2>(1);
  const [selectedAction, setSelectedAction] = useState<PlayerAction>('attack');
  const [isKO, setIsKO] = useState(false);
  const [isShielded, setIsShielded] = useState(false);
  const [mechanicActive, setMechanicActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [isLockedLeft, setIsLockedLeft] = useState(false);
  const [isLockedRight, setIsLockedRight] = useState(false);
  const [isStunned, setIsStunned] = useState(false);
  const [isPoisoned, setIsPoisoned] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const poisonTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (gameState === 'battle' && selectedBoss?.mechanic === 'timer' && phase === 2 && !isKO) {
      if (timeLeft > 0) {
        timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      } else {
        handleMiss(true); // Time out
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, gameState, phase, isKO]);

  useEffect(() => {
    if (gameState === 'battle' && isPoisoned && !isKO) {
      poisonTimerRef.current = setInterval(() => {
        setPlayerHp(prev => Math.max(1, prev - 2));
        spawnDamageNumber(2, 'poison');
      }, 5000);
    }
    return () => {
      if (poisonTimerRef.current) clearInterval(poisonTimerRef.current);
    };
  }, [isPoisoned, gameState, isKO]);

  const TAUNTS = {
    subjunctive: [
      "You doubt my power? How... subjunctive of you.",
      "Il faut que tu perdes!",
      "My mood is always uncertain, but your defeat is guaranteed.",
      "Can you handle the weight of subjectivity?"
    ],
    future: [
      "I have seen the end. You are not in it.",
      "Your destiny is set in stone.",
      "The future belongs to the strong!",
      "I will crush your hopes before they even begin."
    ],
    past_tense: [
      "I was strong, I am strong, and I will be strong!",
      "Your future is already history.",
      "Passé composé or imparfait? Decide quickly, or fall!",
      "The knight of the past never forgets a mistake."
    ],
    negation: [
      "Ne... rien. That is what will remain of you.",
      "You are nothing but a shadow of a threat.",
      "I deny your right to victory!",
      "Your efforts are in vain. Ne... jamais forget that."
    ],
    gender: [
      "Is it 'le' or 'la'? Choose wrong and suffer!",
      "My kingdom is built on perfect agreements.",
      "You lack the elegance of a true grammarian.",
      "A masculine noun with a feminine adjective? Blasphemy!"
    ]
  };

  const spawnDamageNumber = (value: number, type: 'player' | 'boss' | 'heal' | 'poison') => {
    const id = nextId.current++;
    const x = Math.random() * 60 - 30; // Random offset
    const y = -20;
    setDamageNumbers(prev => [...prev, { id, value, x, y, type }]);
    setTimeout(() => {
      setDamageNumbers(prev => prev.filter(dn => dn.id !== id));
    }, 1000);
  };

  const showTaunt = () => {
    if (!selectedBoss) return;
    const bossTaunts = TAUNTS[selectedBoss.id as keyof typeof TAUNTS] || [];
    const taunt = bossTaunts[Math.floor(Math.random() * bossTaunts.length)];
    setBossTaunt(taunt);
    setTimeout(() => setBossTaunt(null), 3000);
  };

  const startBattle = (boss: Boss) => {
    setSelectedBoss(boss);
    setBossHp(boss.hp);
    setPlayerHp(100);
    setGameState('battle');
    setIsWon(false);
    setCombo(0);
    setMaxCombo(0);
    setSuperMeter(0);
    setInputFeedback(null);
    setIsSuperAttacking(false);
    setPhase(1);
    setSelectedAction('attack');
    setIsKO(false);
    setIsShielded(false);
    setMechanicActive(false);
    setTimeLeft(10);
    setIsLockedLeft(false);
    setIsLockedRight(false);
    setIsStunned(false);
    setIsPoisoned(false);
    setBattleLog([`The battle against ${boss.name} has begun!`]);
    
    const filtered = minigameQuestions.filter(q => q.category === boss.category);
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    setQuestions(shuffled);
    setCurrentIndex(0);
    
    setTimeout(() => {
      inputRef.current?.focus();
      showTaunt();
    }, 100);
  };

  function handleMiss(isTimeout = false) {
    if (isShielded) {
      setIsShielded(false);
      const reflectDamage = Math.floor(selectedBoss!.hp * 0.05); // 5% reflect
      setBossHp(prev => Math.max(0, prev - reflectDamage));
      setBattleLog(prev => [`PERFECT PARRY! Reflected ${reflectDamage} damage!`, ...prev].slice(0, 5));
      spawnDamageNumber(reflectDamage, 'boss');
      setLastAction('hit');
      setTimeout(() => {
        setLastAction(null);
        setInputFeedback(null);
        if (isTimeout) nextQuestion();
      }, 600);
      return;
    }

    const damage = Math.floor(Math.random() * 10) + (phase === 2 ? 15 : 10);
    setPlayerHp(prev => Math.max(0, prev - damage));
    setLastAction('player_hit');
    spawnDamageNumber(damage, 'player');
    setCombo(0);
    
    let effectMsg = "";
    if (selectedBoss?.mechanic === 'stun' && Math.random() > 0.4) {
      setIsStunned(true);
      effectMsg = "STUNNED! You cannot act for 3 seconds!";
      setTimeout(() => setIsStunned(false), 3000);
    } else if (selectedBoss?.mechanic === 'poison' && Math.random() > 0.4) {
      setIsPoisoned(true);
      effectMsg = "POISONED! You are taking damage over time!";
    }

    setBattleLog(prev => [
      isTimeout ? `TIME'S UP! ${selectedBoss?.name} attacked for ${damage}!` : `MISSED! ${selectedBoss?.name} counter-attacked for ${damage}!`, 
      ...(effectMsg ? [effectMsg] : []),
      ...prev
    ].slice(0, 5));
    showTaunt();
    
    if (selectedBoss?.mechanic === 'lock' && Math.random() > 0.5) {
      const lockLeft = Math.random() > 0.5;
      if (lockLeft) setIsLockedLeft(true);
      else setIsLockedRight(true);
      setBattleLog(prev => ["GENDER LOCK! Your vision is impaired!", ...prev].slice(0, 5));
    }

    if (playerHp - damage <= 0) {
      handleLoss();
    } else {
      setTimeout(() => {
        setLastAction(null);
        setInputFeedback(null);
        if (isTimeout) nextQuestion();
      }, 600);
    }
  }

  const nextQuestion = () => {
    setUserInput('');
    setInputFeedback(null);
    setLastAction(null);
    setTimeLeft(10);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      const reshuffled = [...questions].sort(() => Math.random() - 0.5);
      setQuestions(reshuffled);
      setCurrentIndex(0);
    }
  };

  const handleAttack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || !selectedBoss || isKO || isStunned) return;

    const currentQ = questions[currentIndex];
    const isCorrect = matchTypedAnswer(userInput, currentQ.french);

    if (isCorrect) {
      setInputFeedback('correct');
      if (isPoisoned) {
        setIsPoisoned(false);
        setBattleLog(prev => ["Antidote! Poison cured.", ...prev].slice(0, 5));
      }
      const isSuper = superMeter >= 100;
      if (isSuper) setIsSuperAttacking(true);

      setTimeout(() => {
        let logMsg = "";
        
        if (selectedAction === 'heal') {
          const healAmount = 25;
          setPlayerHp(prev => Math.min(100, prev + healAmount));
          setLastAction('heal');
          spawnDamageNumber(healAmount, 'heal');
          logMsg = `Healed for ${healAmount} HP!`;
        } else if (selectedAction === 'shield') {
          setIsShielded(true);
          setLastAction('shield');
          logMsg = "Shield activated!";
        } else {
          // Attack logic
          const baseDamage = selectedAction === 'heavy' ? 30 : 15;
          const comboBonus = Math.floor(combo * 2);
          const phaseBonus = phase === 2 ? 10 : 0;
          let totalDamage = Math.floor(Math.random() * 10) + baseDamage + comboBonus + phaseBonus;
          
          if (isSuper) totalDamage *= 2;
          
          setBossHp(prev => Math.max(0, prev - totalDamage));
          setLastAction('hit');
          spawnDamageNumber(totalDamage, 'boss');
          
          const newCombo = combo + 1;
          setCombo(newCombo);
          setMaxCombo(prev => Math.max(prev, newCombo));
          
          logMsg = isSuper ? `SUPER ATTACK! Dealt ${totalDamage} damage!` : `Dealt ${totalDamage} damage! (Combo x${newCombo})`;
          
          // Check Phase 2
          if (phase === 1 && bossHp - totalDamage <= selectedBoss.hp / 2) {
            setPhase(2);
            setBattleLog(prev => ["PHASE 2 INITIATED! Boss power increasing!", ...prev].slice(0, 5));
          }

          if (bossHp - totalDamage <= 0) {
            setIsKO(true);
            setTimeout(handleWin, 2000);
            return;
          }
        }

        if (isSuper) {
          setSuperMeter(0);
          setIsSuperAttacking(false);
        } else {
          setSuperMeter(prev => Math.min(100, prev + (selectedAction === 'heavy' ? 30 : 20)));
        }

        setBattleLog(prev => [logMsg, ...prev].slice(0, 5));
        setIsLockedLeft(false);
        setIsLockedRight(false);
        
        if (Math.random() > 0.7) setTimeout(showTaunt, 500);
        nextQuestion();
      }, isSuper ? 600 : 100);
    } else {
      handleMiss();
    }
  };

  const handleWin = () => {
    setIsWon(true);
    setGameState('finished');
    const xp = selectedBoss ? (selectedBoss.difficulty === 'hard' ? 200 : selectedBoss.difficulty === 'medium' ? 100 : 50) : 0;
    completeMinigameSession({ dispatch, score: xp });
  };

  const handleLoss = () => {
    setIsWon(false);
    setGameState('finished');
  };

  if (gameState === 'selection') {
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
            <h1 className="text-2xl font-black text-white">Boss Battles</h1>
            <p className="text-sm text-slate-500">Defeat the grammar masters to earn massive XP</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {BOSSES.map((boss) => (
            <motion.button
              key={boss.id}
              onClick={() => startBattle(boss)}
              className="glass-elevated p-8 text-center group hover:border-white/20 transition-all relative overflow-hidden"
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.98 }}
            >
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity"
                style={{ background: `radial-gradient(circle at top, ${boss.color}, transparent)` }}
              />
              <div 
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6 transition-transform group-hover:scale-110 shadow-2xl"
                style={{ background: `${boss.color}20`, border: `1px solid ${boss.color}40` }}
              >
                {boss.icon}
              </div>
              <h3 className="text-lg font-black text-white mb-1">{boss.name}</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: boss.color }}>{boss.title}</p>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">{boss.description}</p>
              
              <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-slate-400">
                <span className="flex items-center gap-1"><Heart size={12} className="text-red-500" /> {boss.hp} HP</span>
                <span className={`px-2 py-0.5 rounded-full border ${
                  boss.difficulty === 'easy' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  boss.difficulty === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {boss.difficulty.toUpperCase()}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  if (gameState === 'battle' && selectedBoss) {
    const currentQ = questions[currentIndex];
    const isPhase2 = phase === 2;
    
    return (
      <motion.div 
        className="relative min-h-screen overflow-hidden px-4 pt-8 pb-12"
        animate={isSuperAttacking ? { x: [0, -15, 15, -15, 15, 0], y: [0, -10, 10, -10, 10, 0] } : isKO ? { scale: 1.05 } : {}}
        transition={isKO ? { duration: 2, ease: "linear" } : { duration: 0.4 }}
      >
        {/* Cinematic Super Cut-in */}
        <AnimatePresence>
          {isSuperAttacking && (
            <motion.div 
              initial={{ x: '-100%', skewX: -20 }}
              animate={{ x: '100%', skewX: -20 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "anticipate" }}
              className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center overflow-hidden"
            >
              <div className="bg-cyan-500/90 w-full py-12 flex items-center justify-center gap-12 shadow-[0_0_100px_rgba(34,211,238,0.8)]">
                <span className="text-8xl font-black text-white italic tracking-tighter drop-shadow-2xl">SUPER</span>
                <div className="w-32 h-32 rounded-3xl bg-white flex items-center justify-center text-7xl shadow-2xl">👤</div>
                <span className="text-8xl font-black text-white italic tracking-tighter drop-shadow-2xl">ATTACK</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Background */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <motion.div 
            className="absolute inset-0 transition-colors duration-1000"
            style={{ 
              background: isPhase2 
                ? `radial-gradient(circle at 50% 50%, ${selectedBoss.color}40, #000 80%)`
                : `radial-gradient(circle at 50% 50%, ${selectedBoss.color}20, transparent 70%)`,
            }}
            animate={isPhase2 ? { 
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.5, 0.3]
            } : { 
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ duration: isPhase2 ? 2 : 4, repeat: Infinity }}
          />
          <div className="absolute inset-0">
            {[...Array(isPhase2 ? 50 : 20)].map((_, i) => (
              <motion.div
                key={i}
                className={`absolute w-1 h-1 rounded-full bg-white ${isPhase2 ? 'opacity-40' : 'opacity-20'}`}
                style={{ 
                  left: `${Math.random() * 100}%`, 
                  top: `${Math.random() * 100}%` 
                }}
                animate={{ 
                  y: [0, isPhase2 ? -300 : -100],
                  opacity: [0, 0.5, 0],
                  scale: [1, isPhase2 ? 2 : 1, 1]
                }}
                transition={{ 
                  duration: Math.random() * (isPhase2 ? 1 : 3) + (isPhase2 ? 0.5 : 2), 
                  repeat: Infinity, 
                  delay: Math.random() * 5 
                }}
              />
            ))}
          </div>
        </div>

        <AnimatePresence>
          {!isKO && (
            <motion.div 
              className="max-w-4xl mx-auto"
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 1 }}
            >
              {/* Battle Header */}
              <div className="flex justify-between items-end mb-8">
                {/* Combo Counter */}
                <AnimatePresence mode="wait">
                  {combo > 1 && (
                    <motion.div 
                      key={combo}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1.2, opacity: 1 }}
                      exit={{ scale: 1.5, opacity: 0 }}
                      className="flex flex-col"
                    >
                      <span className="text-[10px] font-black text-amber-500 uppercase tracking-tighter">COMBO</span>
                      <span className="text-4xl font-black text-white italic drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">x{combo}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Mechanic UI: Timer */}
                {selectedBoss.mechanic === 'timer' && isPhase2 && (
                  <div className="flex flex-col items-center gap-1 mb-2">
                    <Clock size={20} className={timeLeft <= 3 ? 'text-red-500 animate-pulse' : 'text-white'} />
                    <div className="h-1 w-32 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                      <motion.div 
                        className={`h-full ${timeLeft <= 3 ? 'bg-red-500' : 'bg-white'}`}
                        animate={{ width: `${(timeLeft / 10) * 100}%` }}
                        transition={{ duration: 1, ease: "linear" }}
                      />
                    </div>
                  </div>
                )}

                {/* Super Meter */}
                <div className="w-48 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">SUPER</span>
                    <span className="text-[10px] font-black text-white">{superMeter}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded-full border border-white/10 overflow-hidden p-0.5">
                    <motion.div 
                      className={`h-full rounded-full ${superMeter >= 100 ? 'bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)]' : 'bg-cyan-600'}`}
                      animate={{ width: `${superMeter}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Battle Scene */}
              <div className="grid grid-cols-2 gap-12 mb-12 relative">
                {/* Gender Lock Overlays */}
                <AnimatePresence>
                  {isLockedLeft && (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="absolute inset-y-0 left-0 w-1/2 bg-black/80 backdrop-blur-md z-40 rounded-3xl flex items-center justify-center border-r-2 border-red-500/50"
                    >
                      <Skull className="text-red-500 animate-pulse" size={48} />
                    </motion.div>
                  )}
                  {isLockedRight && (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="absolute inset-y-0 right-0 w-1/2 bg-black/80 backdrop-blur-md z-40 rounded-3xl flex items-center justify-center border-l-2 border-red-500/50"
                    >
                      <Skull className="text-red-500 animate-pulse" size={48} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Damage Numbers */}
                <div className="absolute inset-0 pointer-events-none z-50">
                  <AnimatePresence>
                    {damageNumbers.map((dn) => (
                      <motion.div
                        key={dn.id}
                        initial={{ opacity: 1, y: 0, scale: 1 }}
                        animate={{ opacity: 0, y: -100, scale: 2 }}
                        exit={{ opacity: 0 }}
                        className={`absolute font-black text-4xl drop-shadow-2xl ${
                          dn.type === 'boss' ? 'text-red-500' : 
                          dn.type === 'heal' ? 'text-emerald-400' : 
                          dn.type === 'poison' ? 'text-lime-500' : 'text-emerald-500'
                        }`}
                        style={{ 
                          left: dn.type === 'boss' ? '25%' : '75%', 
                          top: '40%',
                          transform: `translateX(${dn.x}px)`
                        }}
                      >
                        {dn.type === 'heal' ? `+${dn.value}` : `-${dn.value}`}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Boss Side */}
                <div className="space-y-6 relative">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white uppercase tracking-widest">
                        {selectedBoss.name} {isPhase2 && <span className="text-red-500">[PHASE 2]</span>}
                      </span>
                      <span className="text-xs font-black text-slate-400">{bossHp} / {selectedBoss.hp}</span>
                    </div>
                    <div className="h-4 w-full bg-slate-900 rounded-full border-2 border-white/5 overflow-hidden shadow-inner">
                      <motion.div 
                        className={`h-full bg-gradient-to-r ${isPhase2 ? 'from-red-600 to-orange-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]' : 'from-red-600 to-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)]'}`}
                        animate={{ width: `${(bossHp / selectedBoss.hp) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="relative group">
                    <AnimatePresence>
                      {bossTaunt && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.5, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.5, y: 20 }}
                          className="absolute -top-16 left-1/2 -translate-x-1/2 z-20 bg-white text-slate-950 px-4 py-2 rounded-2xl text-[10px] font-bold whitespace-nowrap shadow-2xl"
                        >
                          {bossTaunt}
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45" />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.div 
                      className={`w-40 h-40 rounded-[2.5rem] flex items-center justify-center text-7xl mx-auto border-4 relative z-10 transition-all duration-500 ${
                        lastAction === 'hit' ? 'bg-red-500/20 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]' : 
                        isPhase2 ? 'bg-orange-500/10 border-orange-500 shadow-[0_0_40px_rgba(249,115,22,0.3)]' : 'bg-slate-900 border-white/10'
                      }`}
                      animate={lastAction === 'hit' ? { 
                        x: [0, -20, 20, -20, 20, 0],
                        rotate: [0, -10, 10, -10, 10, 0],
                        scale: [1, 0.9, 1.1, 1]
                      } : { 
                        y: [0, -10, 0],
                        rotate: [0, 2, -2, 0],
                        scale: isPhase2 ? [1, 1.1, 1] : 1
                      }}
                      transition={lastAction === 'hit' ? { duration: 0.4 } : { duration: isPhase2 ? 1 : 4, repeat: Infinity }}
                    >
                      <span className="drop-shadow-2xl">{isPhase2 ? selectedBoss.phase2Icon : selectedBoss.icon}</span>
                      <div 
                        className="absolute inset-0 rounded-[2.5rem] opacity-20 blur-2xl -z-10"
                        style={{ backgroundColor: selectedBoss.color }}
                      />
                    </motion.div>
                  </div>
                </div>

                {/* Player Side */}
                <div className="space-y-6 flex flex-col justify-end">
                  <motion.div 
                    className={`w-40 h-40 rounded-[2.5rem] flex items-center justify-center text-7xl mx-auto border-4 relative z-10 transition-colors ${
                      lastAction === 'player_hit' ? 'bg-red-500/20 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]' : 
                      isShielded ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.4)]' :
                      isPoisoned ? 'bg-lime-500/20 border-lime-500 shadow-[0_0_30px_rgba(132,204,22,0.4)]' :
                      lastAction === 'heal' ? 'bg-emerald-500/20 border-emerald-500' : 'bg-violet-500/10 border-violet-500/30'
                    }`}
                    animate={lastAction === 'player_hit' ? { 
                      x: [0, -20, 20, -20, 20, 0],
                      scale: [1, 0.9, 1.1, 1]
                    } : isPoisoned ? {
                      scale: [1, 1.05, 1],
                      rotate: [0, 1, -1, 0]
                    } : { 
                      y: [0, 10, 0],
                      rotate: [0, -2, 2, 0]
                    }}
                    transition={lastAction === 'player_hit' ? { duration: 0.4 } : { duration: 4, repeat: Infinity }}
                  >
                    👤
                    {isShielded && (
                      <motion.div 
                        className="absolute -inset-4 border-2 border-cyan-400 rounded-full border-dashed"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                      />
                    )}
                    {isPoisoned && (
                      <motion.div 
                        className="absolute inset-0 rounded-[2.5rem] bg-lime-500/10 blur-xl"
                        animate={{ opacity: [0.2, 0.5, 0.2] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                    {superMeter >= 100 && (
                      <motion.div 
                        className="absolute inset-0 border-4 border-cyan-400 rounded-[2.5rem]"
                        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    )}
                  </motion.div>

                  <div className="space-y-2">
                    <div className="h-4 w-full bg-slate-900 rounded-full border-2 border-white/5 overflow-hidden shadow-inner">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                        animate={{ width: `${playerHp}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-400">{playerHp} / 100</span>
                      <span className="text-xs font-black text-white uppercase tracking-widest">YOU</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex justify-center gap-4 mb-8">
                {[
                  { id: 'attack', icon: <Sword size={18} />, label: 'ATTACK', color: 'bg-red-500' },
                  { id: 'heavy', icon: <Zap size={18} />, label: 'HEAVY', color: 'bg-orange-500' },
                  { id: 'heal', icon: <Heart size={18} />, label: 'HEAL', color: 'bg-emerald-500' },
                  { id: 'shield', icon: <Shield size={18} />, label: 'SHIELD', color: 'bg-cyan-500' }
                ].map((action) => (
                  <button
                    key={action.id}
                    disabled={isStunned}
                    onClick={() => setSelectedAction(action.id as PlayerAction)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs transition-all ${
                      isStunned ? 'opacity-50 grayscale cursor-not-allowed' :
                      selectedAction === action.id 
                        ? `${action.color} text-white shadow-lg scale-105` 
                        : 'bg-white/5 text-slate-500 hover:bg-white/10'
                    }`}
                  >
                    {action.icon}
                    {action.label}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <motion.div 
                className={`glass-elevated p-10 rounded-3xl mb-8 relative overflow-hidden border-2 transition-all duration-300 ${
                  isStunned ? 'border-amber-500/50 bg-amber-500/5' :
                  inputFeedback === 'correct' ? 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)] bg-emerald-500/5' :
                  inputFeedback === 'incorrect' ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)] bg-red-500/5' :
                  superMeter >= 100 ? 'border-cyan-500/50 shadow-[0_0_50px_rgba(34,211,238,0.1)]' : 'border-white/10'
                }`}
                layout
              >
                {isStunned && (
                  <div className="absolute inset-0 z-50 backdrop-blur-sm flex flex-col items-center justify-center bg-black/40">
                    <Zap className="text-amber-500 animate-bounce mb-2" size={32} />
                    <span className="text-amber-500 font-black tracking-widest text-xl">STUNNED!</span>
                  </div>
                )}
                
                {superMeter >= 100 && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500 animate-pulse" />
                )}

                <div className={`text-center space-y-8 transition-all duration-500 ${selectedBoss.mechanic === 'blur' && isPhase2 ? 'blur-md hover:blur-none' : ''}`}>
                  <div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 block">Translate to French</span>
                    <h2 className="text-3xl md:text-4xl font-black text-white leading-tight drop-shadow-lg">
                      {currentQ?.english}
                    </h2>
                  </div>

                  <form onSubmit={handleAttack} className="max-w-xl mx-auto space-y-4">
                    <div className="relative">
                      <input
                        ref={inputRef}
                        type="text"
                        disabled={isStunned}
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder={isStunned ? "..." : "Type your attack..."}
                        autoComplete="off"
                        className="w-full bg-slate-950/80 border-2 border-white/10 rounded-2xl px-8 py-6 text-2xl font-black text-white placeholder:text-slate-800 focus:border-white/30 focus:outline-none transition-all text-center shadow-2xl disabled:opacity-30"
                      />
                      {superMeter >= 100 && (
                        <motion.div 
                          className="absolute -inset-1 rounded-2xl border-2 border-cyan-400 pointer-events-none"
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                      )}
                    </div>
                    
                    <button 
                      type="submit"
                      disabled={isStunned}
                      className={`w-full py-5 text-white font-black text-xl rounded-2xl shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 ${
                        superMeter >= 100 ? 'bg-cyan-500 hover:bg-cyan-400' : 
                        selectedAction === 'attack' ? 'bg-red-600 hover:bg-red-500' :
                        selectedAction === 'heavy' ? 'bg-orange-600 hover:bg-orange-500' :
                        selectedAction === 'heal' ? 'bg-emerald-600 hover:bg-emerald-500' :
                        'bg-cyan-600 hover:bg-cyan-500'
                      }`}
                    >
                      {isStunned ? "STUNNED" : superMeter >= 100 ? <><Zap size={24} className="fill-white" /> SUPER ATTACK!</> : 
                       selectedAction === 'attack' ? <><Sword size={24} /> ATTACK</> :
                       selectedAction === 'heavy' ? <><Zap size={24} /> HEAVY ATTACK</> :
                       selectedAction === 'heal' ? <><Heart size={24} /> HEAL</> :
                       <><Shield size={24} /> SHIELD</>
                      }
                    </button>
                  </form>
                </div>
              </motion.div>

              {/* Battle Log */}
              <div className="bg-slate-950/50 border border-white/5 p-6 rounded-2xl space-y-2 h-40 overflow-hidden flex flex-col justify-end shadow-inner">
                <AnimatePresence>
                  {battleLog.map((log, i) => (
                    <motion.p 
                      key={log + i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1 - i * 0.15, x: 0 }}
                      className="text-xs font-bold text-slate-400 flex items-center gap-2"
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        log.includes('Correct') || log.includes('Heal') ? 'bg-emerald-500' : 
                        log.includes('MISSED') || log.includes('TIME') ? 'bg-red-500' : 
                        log.includes('SUPER') || log.includes('PHASE') ? 'bg-cyan-400' : 'bg-slate-600'
                      }`} />
                      {log}
                    </motion.p>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cinematic Finisher K.O. */}
        <AnimatePresence>
          {isKO && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
            >
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 3, opacity: 1 }}
                transition={{ duration: 1, ease: "backOut" }}
                className="text-8xl font-black text-white italic drop-shadow-[0_0_50px_rgba(239,68,68,0.8)]"
              >
                K.O.
              </motion.div>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-12 text-2xl font-bold text-slate-400"
              >
                {selectedBoss.name} has been erased.
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  if (gameState === 'finished') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
        <motion.div 
          className="max-w-md w-full glass-elevated p-8 text-center space-y-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {isWon ? (
            <>
              <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-amber-500/20 mb-2">
                <Trophy size={48} className="text-amber-400 fill-amber-400/20" />
              </div>
              <h1 className="text-4xl font-black text-white">VICTORY!</h1>
              <p className="text-slate-400">You have defeated <b>{selectedBoss?.name}</b>! Your grammar skills are truly legendary.</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest mb-1">XP Gained</p>
                  <p className="text-3xl font-black text-white">+{selectedBoss?.difficulty === 'hard' ? 200 : selectedBoss?.difficulty === 'medium' ? 100 : 50}</p>
                </div>
                <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                  <p className="text-[10px] text-violet-500 font-black uppercase tracking-widest mb-1">Max Combo</p>
                  <p className="text-3xl font-black text-white">x{maxCombo}</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-red-500/20 mb-2">
                <Skull size={48} className="text-red-400 fill-red-400/20" />
              </div>
              <h1 className="text-4xl font-black text-white">DEFEATED</h1>
              <p className="text-slate-400"><b>{selectedBoss?.name}</b> was too strong this time. Review your notes and try again!</p>
              
              <div className="p-4 rounded-xl bg-slate-500/10 border border-white/10">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Max Combo</p>
                <p className="text-2xl font-black text-white">x{maxCombo}</p>
              </div>
            </>
          )}

          <div className="flex flex-col gap-3 pt-6">
            <motion.button
              onClick={() => setGameState('selection')}
              className="w-full py-4 bg-white text-slate-950 font-black rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RefreshCw size={18} />
              CHALLENGE AGAIN
            </motion.button>
            <button 
              onClick={() => navigate('/explore')}
              className="w-full py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all"
            >
              BACK TO EXPLORE
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
