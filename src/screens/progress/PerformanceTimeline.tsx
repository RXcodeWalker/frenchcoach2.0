import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Session } from '../../types';
import { fadeUp } from '../../components/motion/variants';
import { Activity, Calendar, Search, Filter, ArrowUpDown } from 'lucide-react';
import { TimelineItem } from './TimelineItem';

interface Props {
  sessions: Session[];
}

export function PerformanceTimeline({ sessions }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Group and Filter sessions with memoization
  const { groupedSessions, dates, totalCount } = useMemo(() => {
    const filtered = sessions.filter(s => {
      const matchesSearch = s.topicKey?.toLowerCase()?.includes(searchQuery.toLowerCase()) || 
                           s.mode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMode = modeFilter === 'all' || s.mode === modeFilter;
      return matchesSearch && matchesMode;
    });

    filtered.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

    const groups = filtered.reduce((acc, session) => {
      const date = new Date(session.createdAt).toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
      if (!acc[date]) acc[date] = [];
      acc[date].push(session);
      return acc;
    }, {} as Record<string, Session[]>);

    return {
      groupedSessions: groups,
      dates: Object.keys(groups),
      totalCount: filtered.length
    };
  }, [sessions, searchQuery, modeFilter, sortOrder]);

  if (sessions.length === 0) {
    return (
      <motion.div variants={fadeUp} className="py-20 text-center glass-elevated rounded-2xl border-dashed border-white/10">
        <Activity size={40} className="mx-auto text-slate-700 mb-4" />
        <h3 className="text-white font-bold text-lg">No performance data yet</h3>
        <p className="text-slate-500 max-w-xs mx-auto mt-2 text-sm italic">
          Complete practice sessions or exams to see your progress timeline here.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <motion.div variants={fadeUp} className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Search topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/30 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-400 focus:outline-none focus:border-violet-500/30 transition-all appearance-none cursor-pointer"
          >
            <option value="all">All Modes</option>
            <option value="practice">Practice</option>
            <option value="exam">Exam</option>
            <option value="rapid_fire">Rapid Fire</option>
          </select>
          <button
            onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-400 hover:text-white transition-all flex items-center gap-2"
          >
            <ArrowUpDown size={14} />
            {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
          </button>
        </div>
      </motion.div>

      {/* Summary Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-subtle p-3 rounded-xl border border-white/5">
          <p className="text-[9px] font-bold text-slate-600 uppercase mb-1">Total Sessions</p>
          <p className="text-xl font-black text-white">{sessions.length}</p>
        </div>
        <div className="glass-subtle p-3 rounded-xl border border-white/5">
          <p className="text-[9px] font-bold text-slate-600 uppercase mb-1">Average Score</p>
          <p className="text-xl font-black text-emerald-400">
            {(sessions.reduce((a, b) => a + b.score, 0) / (sessions.length || 1)).toFixed(1)}
          </p>
        </div>
        <div className="glass-subtle p-3 rounded-xl border border-white/5">
          <p className="text-[9px] font-bold text-slate-600 uppercase mb-1">Best Streak</p>
          <p className="text-xl font-black text-orange-400">12 Days</p>
        </div>
        <div className="glass-subtle p-3 rounded-xl border border-white/5">
          <p className="text-[9px] font-bold text-slate-600 uppercase mb-1">XP Momentum</p>
          <p className="text-xl font-black text-violet-400">+12%</p>
        </div>
      </motion.div>

      <div className="relative">
        {/* Ambient Background Blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 -left-20 w-64 h-64 bg-violet-600/5 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-blue-600/5 rounded-full blur-[100px] animate-pulse animation-delay-2000" />
        </div>

        {/* Dynamic SVG Energy Line */}
        <div className="absolute left-[19px] top-4 bottom-4 w-[2px] hidden md:block">
          <svg className="h-full w-full overflow-visible" preserveAspectRatio="none">
            <defs>
              <linearGradient id="line-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.5" />
                <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.2" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <rect 
              x="0" y="0" width="2" height="100%" 
              fill="url(#line-gradient)" 
              filter="url(#glow)"
            />
            {/* Pulsing Energy Bit */}
            <motion.rect
              x="0" width="2" height="100"
              fill="white"
              initial={{ y: -100, opacity: 0 }}
              animate={{ 
                y: ['0%', '100%'],
                opacity: [0, 1, 0]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                ease: "linear" 
              }}
              className="opacity-20 blur-[1px]"
            />
          </svg>
        </div>

        <div className="space-y-8">
          {dates.map((date) => (
            <motion.div 
              key={date} 
              variants={fadeUp} 
              className="space-y-4 relative"
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: "-50px" }}
            >
              {/* Date Header */}
              <div className="flex items-center gap-4">
                <div className="relative hidden md:block">
                  <div className="w-10 h-10 rounded-full glass border-white/10 flex items-center justify-center relative z-10 overflow-hidden group">
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                    <Calendar size={18} className="text-violet-400 relative z-10" />
                  </div>
                  {/* Decorative Glow behind date icon */}
                  <div className="absolute inset-0 bg-violet-500/10 blur-xl rounded-full" />
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest bg-navy-900/50 px-4 py-1.5 rounded-xl border border-white/5 shadow-inner backdrop-blur-md">
                  {date}
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-3 md:ml-14">
                <AnimatePresence mode="popLayout">
                  {groupedSessions[date].map((session) => (
                    <TimelineItem 
                      key={session.id} 
                      session={session} 
                      isExpanded={expandedId === session.id}
                      onToggle={() => setExpandedId(expandedId === session.id ? null : session.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {totalCount === 0 && (
        <div className="py-12 text-center">
          <Filter size={32} className="mx-auto text-slate-800 mb-3" />
          <p className="text-slate-600 text-sm">No sessions match your filters</p>
          <button 
            onClick={() => { setSearchQuery(''); setModeFilter('all'); }}
            className="mt-2 text-xs text-violet-400 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
