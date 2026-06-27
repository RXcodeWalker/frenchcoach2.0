import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift, Sparkles, Zap, Trophy, RefreshCw } from 'lucide-react';
import { useApp, dispatchAddXP } from '../context/AppContext';

type BoxState = 'closed' | 'shaking' | 'opening' | 'revealed';

export function MysteryBox() {
  const navigate = useNavigate();
  const { dispatch } = useApp();
  
  const [boxState, setBoxState] = useState<BoxState>('closed');
  const [reward, setReward] = useState<{ type: string; value: number; title: string } | null>(null);

  const REWARDS = [
    { type: 'xp', value: 50, title: 'Mini XP Boost', icon: '⚡' },
    { type: 'xp', value: 100, title: 'Mega XP Boost', icon: '⚡⚡' },
    { type: 'xp', value: 250, title: 'Legendary XP Cache', icon: '💎' },
  ];

  const openBox = () => {
    setBoxState('shaking');
    
    setTimeout(() => {
      setBoxState('opening');
      const randomReward = REWARDS[Math.floor(Math.random() * REWARDS.length)];
      setReward(randomReward);
      
      setTimeout(() => {
        setBoxState('revealed');
        dispatchAddXP(dispatch, randomReward.value);
      }, 1000);
    }, 1500);
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
      <div className="absolute top-8 left-4 md:left-8">
        <button 
          onClick={() => navigate('/explore')}
          className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <motion.div 
        className="max-w-md w-full text-center space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles size={16} className="text-pink-400" />
            <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest">Daily Surprise</span>
          </div>
          <h1 className="text-3xl font-black text-white">Mystery Box</h1>
          <p className="text-slate-500 text-sm">What's inside? Open it to find out!</p>
        </div>

        <div className="relative h-64 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {boxState === 'closed' || boxState === 'shaking' ? (
              <motion.button
                key="closed"
                onClick={boxState === 'closed' ? openBox : undefined}
                className="relative cursor-pointer group"
                animate={boxState === 'shaking' ? {
                  rotate: [0, -5, 5, -5, 5, 0],
                  scale: [1, 1.05, 1, 1.05, 1],
                  transition: { duration: 0.5, repeat: Infinity }
                } : {}}
                whileHover={boxState === 'closed' ? { scale: 1.05 } : {}}
              >
                <div className="absolute inset-0 bg-pink-500/20 blur-3xl rounded-full group-hover:bg-pink-500/30 transition-colors" />
                <Gift size={120} className="text-pink-500 relative z-10 drop-shadow-[0_0_15px_rgba(236,72,153,0.5)]" />
                {boxState === 'closed' && (
                  <motion.div 
                    className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-black text-pink-400 uppercase tracking-widest"
                    animate={{ y: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    Click to Open
                  </motion.div>
                )}
              </motion.button>
            ) : boxState === 'opening' ? (
              <motion.div
                key="opening"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1.5, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-white"
              >
                <Sparkles size={80} className="animate-spin text-yellow-400" />
              </motion.div>
            ) : (
              <motion.div
                key="revealed"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="glass-elevated p-8 rounded-3xl border-yellow-500/20 w-full"
              >
                <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-yellow-500/20 mb-4">
                  <Trophy size={40} className="text-yellow-400" />
                </div>
                <h3 className="text-2xl font-black text-white mb-1">{reward?.title}</h3>
                <div className="flex items-center justify-center gap-2 mb-6">
                  <span className="text-4xl font-black text-yellow-400">+{reward?.value}</span>
                  <span className="text-xl font-bold text-slate-500 uppercase tracking-widest">XP</span>
                </div>
                
                <p className="text-xs text-slate-500 mb-8 leading-relaxed">
                  Congratulations! You've found a {reward?.title.toLowerCase()}. 
                  Your French journey is getting even better!
                </p>

                <div className="flex flex-col gap-3">
                  <motion.button
                    onClick={() => navigate('/explore')}
                    className="w-full py-4 bg-white text-slate-950 font-black rounded-xl hover:bg-slate-200 transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    AWESOME!
                  </motion.button>
                  <button 
                    onClick={() => {
                      setBoxState('closed');
                      setReward(null);
                    }}
                    className="text-[10px] font-bold text-slate-600 hover:text-white transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw size={10} />
                    Open another (Debug)
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
