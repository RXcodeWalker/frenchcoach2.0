import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, Plus, Trophy, Zap, MessageSquare, ChevronRight, Lock, Globe, Filter } from 'lucide-react';
import { MOCK_MY_GROUPS, MOCK_DISCOVER_GROUPS } from '../data/mocks/mockGroups';
import { StudyGroup } from '../types';
import { PageShell } from '../components/layout/PageShell';
import { fadeUp } from '../components/motion/variants';

export function StudyGroups() {
  const [activeTab, setActiveTab] = useState<'my-groups' | 'discover'>('my-groups');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDiscoverGroups = MOCK_DISCOVER_GROUPS.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <PageShell>
      {/* Header */}
      <motion.div
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
        variants={fadeUp}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} className="text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Social Learning</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white">Study Groups</h1>
          <p className="text-sm text-ink-muted mt-1">Learn together, reach goals faster</p>
        </div>

        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 self-start">
          <button
            onClick={() => setActiveTab('my-groups')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold transition-all ${
              activeTab === 'my-groups' ? 'bg-emerald-500/10 text-emerald-400' : 'text-ink-muted hover:text-ink-muted'
            }`}
          >
            <Users size={14} /> MY GROUPS
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold transition-all ${
              activeTab === 'discover' ? 'bg-emerald-500/10 text-emerald-400' : 'text-ink-muted hover:text-ink-muted'
            }`}
          >
            <Globe size={14} /> DISCOVER
          </button>
        </div>
      </motion.div>

      {/* Global Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-elevated p-4 rounded-2xl border-emerald-500/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Trophy size={18} className="text-emerald-400" />
            </div>
            <span className="text-[10px] font-bold text-ink-muted uppercase">Group Rank</span>
          </div>
          <p className="text-2xl font-black text-white">#12 <span className="text-xs font-normal text-ink-muted italic">global leaderboard</span></p>
        </div>
        <div className="glass-elevated p-4 rounded-2xl border-blue-500/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Zap size={18} className="text-blue-400" />
            </div>
            <span className="text-[10px] font-bold text-ink-muted uppercase">Weekly XP</span>
          </div>
          <p className="text-2xl font-black text-white">4,400 <span className="text-xs font-normal text-ink-muted italic">combined effort</span></p>
        </div>
        <div className="glass-elevated p-4 rounded-2xl border-amber-500/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <MessageSquare size={18} className="text-amber-400" />
            </div>
            <span className="text-[10px] font-bold text-ink-muted uppercase">Active Now</span>
          </div>
          <p className="text-2xl font-black text-white">24 <span className="text-xs font-normal text-ink-muted italic">members online</span></p>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {activeTab === 'my-groups' ? (
          <motion.div
            key="my-groups"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-ink-muted uppercase tracking-widest">Ongoing Progress</h2>
              <button className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 hover:underline">
                <Plus size={12} /> Create New Group
              </button>
            </div>

            {MOCK_MY_GROUPS.map(group => (
              <GroupCard key={group.id} group={group} isMember={true} />
            ))}

            <button
              onClick={() => setActiveTab('discover')}
              className="w-full py-8 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2 text-ink-subtle hover:border-emerald-500/20 hover:text-emerald-400 transition-all group"
            >
              <Search size={24} className="group-hover:scale-110 transition-transform" />
              <div className="text-center">
                <span className="text-xs font-bold uppercase tracking-widest block">Find more groups</span>
                <span className="text-[10px] text-ink-subtle">Explore communities that match your goals</span>
              </div>
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="discover"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-subtle" size={18} />
                <input
                  type="text"
                  placeholder="Search by name, tag, or level..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-emerald-500/30 transition-all text-sm"
                />
              </div>
              <button className="px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-ink-muted hover:text-white transition-all flex items-center gap-2">
                <Filter size={18} />
                <span className="text-sm font-medium">Filters</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredDiscoverGroups.map(group => (
                <GroupCard key={group.id} group={group} isMember={false} />
              ))}
            </div>

            {filteredDiscoverGroups.length === 0 && (
              <div className="py-20 text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search size={24} className="text-ink-subtle" />
                </div>
                <h3 className="text-white font-bold">No groups found</h3>
                <p className="text-sm text-ink-subtle mt-1">Try a different search term or explore tags</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}

function GroupCard({ group, isMember }: { group: StudyGroup; isMember: boolean }) {
  const progressPercent = (group.weeklyXPProgress / group.weeklyXPGoal) * 100;

  return (
    <motion.div
      className="glass-elevated p-6 rounded-2xl border-white/5 relative overflow-hidden group"
      whileHover={{ scale: 1.01 }}
    >
      <div className="flex flex-col md:flex-row gap-6">
        {/* Group Info */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-3 min-w-[180px]">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl flex items-center justify-center border border-white/10 overflow-hidden shadow-inner">
              {group.avatar ? (
                <img src={group.avatar} alt={group.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-black text-white">{group.name[0]}</span>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-navy-900 border border-white/10 rounded-lg px-1.5 py-0.5 flex items-center gap-1 shadow-lg">
              <span className="text-[8px] font-black text-emerald-400 uppercase">LVL {group.level}</span>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-2">
              {group.name}
              {group.isPrivate && <Lock size={12} className="text-ink-subtle" />}
            </h3>
            <div className="flex items-center gap-2 mt-1 justify-center md:justify-start">
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-tighter flex items-center gap-1">
                <Users size={10} /> {group.memberCount}/{group.maxMembers}
              </span>
              <span className="text-ink-subtle">•</span>
              <span className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-tighter">
                {group.totalXP.toLocaleString()} XP ALL-TIME
              </span>
            </div>
          </div>
        </div>

        {/* Description & Tags */}
        <div className="flex-1 space-y-4">
          <p className="text-xs text-ink-muted leading-relaxed italic">
            "{group.description}"
          </p>
          <div className="flex flex-wrap gap-1.5">
            {group.tags.map(tag => (
              <span key={tag} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-ink-muted group-hover:border-emerald-500/20 group-hover:text-emerald-400/70 transition-all">
                #{tag}
              </span>
            ))}
          </div>

          {/* Weekly Goal Progress */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
              <span className="text-ink-muted">Weekly Goal</span>
              <span className="text-emerald-400">{group.weeklyXPProgress.toLocaleString()} / {group.weeklyXPGoal.toLocaleString()} XP</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <motion.div
                className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col justify-center">
          <button className={`w-full md:w-auto px-6 py-3 rounded-xl font-black transition-all text-xs italic tracking-tighter flex items-center justify-center gap-2 ${
            isMember
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
              : 'bg-white text-slate-950 hover:bg-slate-200'
          }`}>
            {isMember ? 'VIEW GROUP' : 'JOIN GROUP'}
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
