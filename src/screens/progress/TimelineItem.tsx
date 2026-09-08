import { motion, AnimatePresence } from 'framer-motion';
import { Session } from '../../types';
import { Star, TrendingUp, Trophy, Clock, ChevronRight } from 'lucide-react';

interface Props {
  session: Session;
  isExpanded: boolean;
  onToggle: () => void;
}

export function TimelineItem({ session, isExpanded, onToggle }: Props) {
  const isHighPerformance = session.score != null && session.score >= 8.5;
  const isPerfect = session.score != null && session.score >= 9.5;
  const isExam = session.mode === 'exam';
  
  const time = new Date(session.createdAt).toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <motion.div
      layout
      className={`glass-elevated p-4 rounded-2xl border-white/5 group hover:border-violet-500/30 transition-all cursor-pointer relative overflow-hidden perspective-1000`}
      onClick={onToggle}
      whileHover={{ 
        rotateX: 2, 
        rotateY: -2,
        scale: 1.01,
        transition: { type: 'spring', stiffness: 400, damping: 20 }
      }}
    >
      {/* Shimmer Sweep Animation */}
      {isHighPerformance && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer-sweep pointer-events-none" />
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div className="flex items-start gap-4">
          <motion.div 
            className={`p-3 rounded-xl ${isExam ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'} border border-white/5 relative`}
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            {isExam ? <Trophy size={20} /> : <Star size={20} />}
            {isPerfect && (
              <motion.div 
                className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full blur-[2px]"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </motion.div>
          
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-[10px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded shadow-inner ${isExam ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                {session.mode.replace('_', ' ')}
              </span>
              <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                <Clock size={10} /> {time}
              </span>
            </div>
            <h4 className="text-white font-bold text-sm group-hover:text-violet-300 transition-colors">
              {session.topicKey ? session.topicKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'General Practice'}
            </h4>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-[10px] text-slate-500 font-medium">{session.wordCount} words spoken</span>
              <span className="text-slate-700">•</span>
              <span className="text-[10px] text-slate-500 font-medium">{(session.durationSec / 60).toFixed(1)} mins</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end">
              {isHighPerformance && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={isPerfect ? 'text-amber-400' : 'text-emerald-400'}
                >
                  <TrendingUp size={12} />
                </motion.div>
              )}
              <p className={`text-2xl font-black italic tracking-tighter ${isPerfect ? 'text-transparent bg-clip-text bg-gradient-to-br from-amber-300 to-orange-500' : isHighPerformance ? 'text-emerald-400' : 'text-white'}`}>
                {session.score == null ? '—' : session.score.toFixed(1)}
              </p>
            </div>
            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Score</p>
          </div>
          
          <button className={`p-2 rounded-lg bg-white/5 text-slate-600 group-hover:text-white group-hover:bg-violet-500/20 transition-all ${isExpanded ? 'rotate-90 bg-violet-500/20 text-white shadow-[0_0_10px_rgba(139,92,246,0.3)]' : ''}`}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="mt-6 pt-6 border-t border-white/5 space-y-6 overflow-hidden"
          >
            {/* Metrics Grid with Staggered Slide-in */}
            <motion.div 
              className="grid grid-cols-3 gap-4"
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.05 } }
              }}
            >
              {[
                { label: 'Fluency', value: session.score == null ? '—' : session.score.toFixed(1), color: 'text-blue-400', progress: (session.score ?? 0) * 10 },
                { label: 'Vocabulary', value: '7.8', color: 'text-violet-400', progress: 78 },
                { label: 'Grammar', value: '8.2', color: 'text-emerald-400', progress: 82 },
              ].map((m, i) => (
                <motion.div 
                  key={i}
                  variants={{
                    hidden: { y: 20, opacity: 0 },
                    visible: { y: 0, opacity: 1 }
                  }}
                  className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                >
                  <p className="text-[9px] font-bold text-slate-500 uppercase mb-2">{m.label}</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-lg font-black ${m.color}`}>{m.value}</p>
                    <div className="w-8 h-8 relative">
                      <svg className="w-full h-full -rotate-90">
                        <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/5" />
                        <motion.circle 
                          cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2" 
                          strokeDasharray="88"
                          initial={{ strokeDashoffset: 88 }}
                          animate={{ strokeDashoffset: 88 - (88 * m.progress) / 100 }}
                          transition={{ duration: 1, delay: 0.2 + i * 0.1 }}
                          className={m.color}
                        />
                      </svg>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {session.transcript && (
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-violet-500" /> Transcript Snippet
                </p>
                <div className="p-4 rounded-xl bg-navy-950/50 border border-white/5 italic text-sm text-slate-400 relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-violet-500/20 rounded-l-xl" />
                  "{session.transcript.length > 200 ? session.transcript.slice(0, 200) + '...' : session.transcript}"
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div 
                className="space-y-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Key Mistakes</p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-xs p-2 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0 shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
                    <p className="text-slate-300"><span className="text-red-400 font-bold">Gender Agreement:</span> "Le maison" → <span className="text-emerald-400 font-bold">"La maison"</span></p>
                  </div>
                  <div className="flex items-start gap-2 text-xs p-2 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0 shadow-[0_0_5px_rgba(245,158,11,0.5)]" />
                    <p className="text-slate-300"><span className="text-amber-400 font-bold">Verb Tense:</span> "Je mangé" → <span className="text-emerald-400 font-bold">"J'ai mangé"</span></p>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                className="space-y-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Vocabulary Boosts</p>
                <div className="flex flex-wrap gap-2">
                  {['magnifique', 'quotidiennement', 'néanmoins'].map((word, i) => (
                    <motion.span 
                      key={word}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.6 + i * 0.1 }}
                      className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-bold shadow-sm"
                    >
                      {word}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            </div>

            <motion.div 
              className="flex justify-end pt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <button className="group relative px-6 py-2.5 bg-violet-600 text-white rounded-xl text-[10px] font-black italic tracking-tighter hover:bg-violet-500 transition-all shadow-lg shadow-violet-500/20 overflow-hidden">
                <span className="relative z-10">FULL PERFORMANCE REPORT</span>
                <motion.div 
                  className="absolute inset-0 bg-white/20 -translate-x-full"
                  whileHover={{ x: '100%' }}
                  transition={{ duration: 0.5 }}
                />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
