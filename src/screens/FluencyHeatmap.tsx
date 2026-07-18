import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Thermometer, Calendar, Clock, ChevronLeft, Info, Zap, BookOpen, TrendingUp } from 'lucide-react';
import { getSessionHistory, type StoredSession } from '../services/analytics/analyticsService';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function FluencyHeatmap() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<{ date: string; score: number; count: number } | null>(null);
  const [history, setHistory] = useState<StoredSession[]>([]);
  
  // Filters
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');

  useEffect(() => {
    // Simulate async data fetching
    const timer = setTimeout(() => {
      setHistory(getSessionHistory());
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const filteredHistory = useMemo(() => {
    return history.filter(s => {
      const topicMatch = topicFilter === 'all' || s.topicKey === topicFilter;
      const modeMatch = modeFilter === 'all' || s.mode === modeFilter;
      return topicMatch && modeMatch;
    });
  }, [history, topicFilter, modeFilter]);

  const heatmapData = useMemo(() => {
    const data: Record<string, { totalScore: number; scoredCount: number; sessionCount: number }> = {};
    filteredHistory.forEach(s => {
      const date = s.date.slice(0, 10);
      if (!data[date]) data[date] = { totalScore: 0, scoredCount: 0, sessionCount: 0 };
      data[date].sessionCount++;
      if (typeof s.score === 'number') {
        data[date].totalScore += s.score;
        data[date].scoredCount++;
      }
    });
    return data;
  }, [filteredHistory]);

  const weeks = useMemo(() => {
    const result = [];
    const now = new Date();
    // Start from 24 weeks ago, aligned to Sunday
    const start = new Date(now);
    start.setDate(now.getDate() - (24 * 7));
    start.setDate(start.getDate() - start.getDay()); // Back to Sunday

    let current = new Date(start);
    while (current <= now) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const dateStr = current.toISOString().slice(0, 10);
        const dayData = heatmapData[dateStr] || { totalScore: 0, scoredCount: 0, sessionCount: 0 };
        week.push({
          date: dateStr,
          score: dayData.scoredCount > 0 ? dayData.totalScore / dayData.scoredCount : 0,
          count: dayData.sessionCount
        });
        current.setDate(current.getDate() + 1);
        if (current > now) break;
      }
      result.push(week);
    }
    return result;
  }, [heatmapData]);

  const insights = useMemo(() => {
    if (filteredHistory.length === 0) return null;

    // Time of day analysis — scored sessions only; an unscored session has no fluency signal to attribute.
    const hours: Record<number, { total: number; count: number }> = {};
    const topics: Record<string, { total: number; count: number }> = {};

    filteredHistory.forEach(s => {
      if (typeof s.score !== 'number') return;
      const date = new Date(s.date);
      const hour = date.getHours();
      if (!hours[hour]) hours[hour] = { total: 0, count: 0 };
      hours[hour].total += s.score;
      hours[hour].count++;

      if (s.topicKey) {
        if (!topics[s.topicKey]) topics[s.topicKey] = { total: 0, count: 0 };
        topics[s.topicKey].total += s.score;
        topics[s.topicKey].count++;
      }
    });

    const bestHour = Object.entries(hours).length > 0
      ? Object.entries(hours).reduce((a, b) =>
          (b[1].total / b[1].count) > (a[1].total / a[1].count) ? b : a
        )
      : null;

    const bestTopic = Object.entries(topics).length > 0
      ? Object.entries(topics).reduce((a, b) =>
          (b[1].total / b[1].count) > (a[1].total / a[1].count) ? b : a
        )
      : null;

    const scored = filteredHistory.map(s => s.score).filter((s): s is number => typeof s === 'number');

    return {
      bestHour: bestHour ? parseInt(bestHour[0]) : null,
      bestTopic: bestTopic ? bestTopic[0] : 'General',
      totalSessions: filteredHistory.length,
      avgFluency: scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : null,
    };
  }, [filteredHistory]);

  const trendData = useMemo(() => {
    const scoredHistory = filteredHistory.filter(s => typeof s.score === 'number');
    if (scoredHistory.length === 0) return [];

    // Group by date first
    const daily: Record<string, number> = {};
    scoredHistory.forEach(s => {
      const date = s.date.slice(0, 10);
      const score = s.score as number;
      if (!(date in daily)) daily[date] = score;
      else daily[date] = (daily[date] + score) / 2; // Rough daily avg
    });

    // Create a chronological list for the sparkline
    const sortedDates = Object.keys(daily).sort();
    return sortedDates.map(d => ({ date: d, value: daily[d] }));
  }, [filteredHistory]);

  const uniqueTopics = useMemo(() => {
    const set = new Set(history.map(s => s.topicKey).filter((t): t is string => Boolean(t)));
    return Array.from(set);
  }, [history]);

  const uniqueModes = useMemo(() => {
    const set = new Set(history.map(s => s.mode));
    return Array.from(set);
  }, [history]);

  const isDayInStreak = (date: string) => {
    const dayData = heatmapData[date];
    if (!dayData || dayData.sessionCount === 0) return false;

    // Check neighbors to see if it's part of a sequence
    const d = new Date(date);
    const prev = new Date(d);
    prev.setDate(d.getDate() - 1);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);

    const hasPrev = heatmapData[prev.toISOString().slice(0, 10)]?.sessionCount > 0;
    const hasNext = heatmapData[next.toISOString().slice(0, 10)]?.sessionCount > 0;

    return hasPrev || hasNext;
  };

  const getHeatColor = (score: number, date?: string) => {
    if (score === 0) return 'bg-white/[0.03]';
    
    let base = 'bg-blue-900/40';
    if (score < 5) base = 'bg-blue-700/60';
    else if (score < 7) base = 'bg-blue-500/80 shadow-[0_0_8px_rgba(59,130,246,0.4)]';
    else if (score < 9) base = 'bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.6)]';
    else base = 'bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)]';

    if (date && isDayInStreak(date)) {
      base += ' ring-1 ring-blue-400/50 ring-offset-1 ring-offset-slate-950';
    }
    
    return base;
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <motion.div
        className="max-w-5xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <button 
            onClick={() => navigate('/explore')}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Thermometer size={14} className="text-orange-400" />
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Pattern Analysis</span>
            </div>
            <h1 className="text-2xl font-black text-white">Fluency Heatmap</h1>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Topic:</span>
            <select 
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="bg-transparent text-[10px] font-black text-white focus:outline-none cursor-pointer uppercase italic"
            >
              <option value="all">All Topics</option>
              {uniqueTopics.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Mode:</span>
            <select 
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="bg-transparent text-[10px] font-black text-white focus:outline-none cursor-pointer uppercase italic"
            >
              <option value="all">All Modes</option>
              {uniqueModes.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
            </select>
          </div>
          {(topicFilter !== 'all' || modeFilter !== 'all') && (
            <button 
              onClick={() => { setTopicFilter('all'); setModeFilter('all'); }}
              className="text-[10px] font-bold text-blue-400 hover:text-blue-300 underline"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Heatmap Section */}
        <div className="glass-elevated p-6 rounded-2xl border-white/5 overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-blue-400" />
              <h2 className="text-sm font-bold text-white uppercase italic">Activity & Intensity</h2>
            </div>
            {!isLoading && (
              <div className="flex items-center gap-3">
                <span className="text-[8px] font-bold text-slate-600 uppercase">Less</span>
                <div className="flex gap-1">
                  {[0, 2, 4, 6, 8, 10].map(s => (
                    <div key={s} className={`w-3 h-3 rounded-sm ${getHeatColor(s)}`} />
                  ))}
                </div>
                <span className="text-[8px] font-bold text-slate-600 uppercase">More</span>
              </div>
            )}
          </div>

          <div className="relative overflow-x-auto pb-4 scrollbar-none">
            {isLoading ? (
              <div className="flex gap-1.5 min-w-max animate-pulse">
                <div className="flex flex-col gap-1.5 pr-2 pt-6">
                  {[1,2,3,4,5,6,7].map(i => <div key={i} className="w-6 h-3 bg-white/5 rounded" />)}
                </div>
                {[...Array(24)].map((_, i) => (
                  <div key={i} className="flex flex-col gap-1.5">
                    <div className="h-4 w-4" />
                    {[...Array(7)].map((_, j) => (
                      <div key={j} className="w-3 h-3 bg-white/5 rounded-sm" />
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-1.5 min-w-max">
                {/* Day Labels */}
                <div className="flex flex-col gap-1.5 pr-2 pt-6">
                  {DAYS_OF_WEEK.map((d, i) => (
                    <span key={d} className="text-[8px] font-bold text-slate-700 h-3 flex items-center">
                      {i % 2 === 0 ? d : ''}
                    </span>
                  ))}
                </div>

                {/* Grid */}
                {weeks.map((week, wIdx) => (
                  <div key={wIdx} className="flex flex-col gap-1.5">
                    {/* Month Label */}
                    <div className="h-4 flex items-center">
                      {wIdx % 4 === 0 && (
                        <span className="text-[8px] font-bold text-slate-500 uppercase">
                          {MONTHS[new Date(week[0].date).getMonth()]}
                        </span>
                      )}
                    </div>
                    {week.map(day => (
                      <motion.div
                        key={day.date}
                        layout
                        className={`w-3 h-3 rounded-sm transition-all duration-500 cursor-help ${getHeatColor(day.score, day.date)}`}
                        onMouseEnter={() => setHoveredDay(day)}
                        onMouseLeave={() => setHoveredDay(null)}
                        whileHover={{ scale: 1.25, zIndex: 10 }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Tooltip Overlay */}
            <AnimatePresence>
              {hoveredDay && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 pointer-events-none"
                >
                  <div className="glass-elevated px-3 py-2 rounded-lg border-blue-500/20 whitespace-nowrap text-center">
                    <p className="text-[8px] font-bold text-blue-400 uppercase mb-0.5">{new Date(hoveredDay.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    <p className="text-xs font-black text-white">{hoveredDay.count} sessions • {hoveredDay.score.toFixed(1)} fluency</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Trend Sparkline */}
          {!isLoading && trendData.length > 2 && (
            <div className="mt-8 border-t border-white/5 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={14} className="text-emerald-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Progression Trend</span>
              </div>
              <div className="h-16 w-full">
                <svg className="w-full h-full" viewBox={`0 0 ${trendData.length * 10} 100`} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <motion.path
                    d={`M 0 100 ${trendData.map((d, i) => `L ${i * 10} ${100 - (d.value * 10)}`).join(' ')} V 100 Z`}
                    fill="url(#gradient)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                  <motion.path
                    d={`M 0 ${100 - (trendData[0].value * 10)} ${trendData.map((d, i) => `L ${i * 10} ${100 - (d.value * 10)}`).join(' ')}`}
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                  />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Insights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-elevated p-6 rounded-2xl border-blue-500/20 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl">
                <Clock size={20} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase italic">Prime Performance</h3>
                <p className="text-[10px] text-slate-500">Your most fluent time of day</p>
              </div>
            </div>
            
            {isLoading ? (
              <div className="h-10 w-32 bg-white/5 animate-pulse rounded-lg" />
            ) : insights && insights.bestHour !== null ? (
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black text-white italic tracking-tighter">
                  {insights.bestHour > 12 ? insights.bestHour - 12 : insights.bestHour}
                  <span className="text-xl ml-1">{insights.bestHour >= 12 ? 'PM' : 'AM'}</span>
                </span>
                <span className="text-[10px] font-bold text-blue-400 mb-2 uppercase">Peak Fluency</span>
              </div>
            ) : (
              <p className="text-sm text-slate-600 italic">Complete more sessions to see insights</p>
            )}

            <div className="pt-2">
              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-2 w-full bg-white/5 animate-pulse rounded" />
                  <div className="h-2 w-2/3 bg-white/5 animate-pulse rounded" />
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  You tend to express yourself most clearly during this window. Use this time for high-intensity practice!
                </p>
              )}
            </div>
          </div>

          <div className="glass-elevated p-6 rounded-2xl border-purple-500/20 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-xl">
                <BookOpen size={20} className="text-purple-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase italic">Mastery Domain</h3>
                <p className="text-[10px] text-slate-500">Your most fluent topic area</p>
              </div>
            </div>

            {isLoading ? (
              <div className="h-10 w-40 bg-white/5 animate-pulse rounded-lg" />
            ) : insights && insights.bestTopic ? (
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-white italic tracking-tighter uppercase">
                  {insights.bestTopic.replace('_', ' ')}
                </span>
                <Zap size={18} className="text-amber-400 mb-2" />
              </div>
            ) : (
              <p className="text-sm text-slate-600 italic">Add some topic-based sessions first</p>
            )}

            <div className="pt-2">
              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-2 w-full bg-white/5 animate-pulse rounded" />
                  <div className="h-2 w-2/3 bg-white/5 animate-pulse rounded" />
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  You have strong linguistic control in this area. Try pushing into more complex sub-topics.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="glass p-4 rounded-xl text-center">
              {isLoading ? (
                <div className="space-y-2 flex flex-col items-center">
                  <div className="h-2 w-12 bg-white/5 animate-pulse rounded" />
                  <div className="h-6 w-16 bg-white/5 animate-pulse rounded" />
                </div>
              ) : (
                <>
                  <p className="text-[8px] font-bold text-slate-600 uppercase mb-1">
                    {i === 1 ? 'Total Effort' : i === 2 ? 'Avg Fluency' : i === 3 ? 'Consistency' : 'Elite Days'}
                  </p>
                  <p className={`text-xl font-black ${i === 2 ? 'text-blue-400' : i === 3 ? 'text-emerald-400' : 'text-white'}`}>
                    {i === 1 ? insights?.totalSessions : i === 2 ? (insights?.avgFluency == null ? '—' : insights.avgFluency.toFixed(1)) : i === 3 ? `${Math.round(((insights?.totalSessions || 0) / 168) * 100)}%` : Object.values(heatmapData).filter(d => d.scoredCount > 0 && (d.totalScore / d.scoredCount) > 8).length}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl flex items-start gap-3">
          <Info size={16} className="text-blue-400 mt-0.5" />
          <p className="text-[10px] text-slate-500 leading-relaxed">
            The heatmap analyzes both the **frequency** of your practice and the **intensity** of your performance. White cells indicate "Elite Fluency" (score {'>'} 9.0), while darker blue shows emerging patterns.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
