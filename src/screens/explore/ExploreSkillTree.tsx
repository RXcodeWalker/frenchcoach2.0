import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle2, Star, Compass } from 'lucide-react';
import { EXPLORE_TREE, TreeNode } from '../../data/exploreTree';

export function ExploreSkillTree() {
  return (
    <div className="py-12 space-y-24 flex flex-col items-center relative">
      {/* Background path line */}
      <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-gradient-to-b from-transparent via-white/[0.03] to-transparent -translate-x-1/2" />

      {Object.entries(EXPLORE_TREE).map(([tier, nodes], tierIdx) => (
        <div key={tier} className="relative flex flex-col items-center w-full max-w-lg">
          {/* Tier Label */}
          <div className="mb-8 flex flex-col items-center">
            <div className="px-4 py-1 rounded-full bg-navy-200 border border-white/5 mb-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                Tier {tierIdx + 1}
              </span>
            </div>
            <h3 className="text-sm font-black text-white/60">
              {tierIdx === 0 ? 'Foundation' : tierIdx === 1 ? 'Daily Life' : tierIdx === 2 ? 'Exploration' : tierIdx === 3 ? 'Deep Dive' : 'Mastery'}
            </h3>
          </div>

          {/* Nodes Grid/Layout */}
          <div className="grid grid-cols-2 md:grid-cols-2 gap-x-12 md:gap-x-24 gap-y-12 relative">
             {/* Simple lines between nodes in the same tier */}
             {nodes.length > 1 && (
               <div className="absolute top-1/2 left-0 right-0 h-px bg-white/[0.02] -translate-y-1/2 -z-10" />
             )}
            
            {nodes.map((node) => (
              <SkillNode key={node.id} node={node} />
            ))}
          </div>

          {/* Connector to next tier */}
          {tierIdx < Object.keys(EXPLORE_TREE).length - 1 && (
            <div className="mt-16 flex flex-col items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
               <div className="w-px h-12 bg-gradient-to-b from-white/10 to-transparent" />
            </div>
          )}
        </div>
      ))}

      {/* Final Boss Node */}
      <div className="relative flex flex-col items-center">
        <motion.div
          className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border-2 border-amber-500/30 flex items-center justify-center opacity-40"
          whileHover={{ scale: 1.05 }}
        >
          <Compass size={40} className="text-amber-500/50" />
        </motion.div>
        <p className="mt-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ultimate Mastery</p>
      </div>
    </div>
  );
}

function SkillNode({ node }: { node: TreeNode }) {
  const navigate = useNavigate();
  const colors = [
    'from-violet-600 to-indigo-700',
    'from-emerald-600 to-teal-700',
    'from-cyan-600 to-blue-700',
    'from-orange-600 to-red-700',
    'from-pink-600 to-rose-700',
  ];
  const colorClass = colors[node.difficulty - 1] || colors[0];

  return (
    <div className="flex flex-col items-center group relative">
       <motion.button
        onClick={() => node.unlocked && navigate('/story-mode')}
        className={`relative w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center transition-all duration-300 z-10 ${
          node.unlocked 
            ? `bg-gradient-to-br ${colorClass} shadow-[0_0_30px_rgba(0,0,0,0.3)] border-4 border-white/10` 
            : 'bg-navy-300 border-4 border-white/5 opacity-40 cursor-not-allowed'
        }`}
        whileHover={node.unlocked ? { scale: 1.1, y: -5, rotate: 5 } : {}}
        whileTap={node.unlocked ? { scale: 0.95 } : {}}
       >
         {/* Inner Glow */}
         {node.unlocked && (
           <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
         )}

         {node.unlocked ? (
           <div className="flex flex-col items-center">
             <span className="text-4xl md:text-5xl drop-shadow-lg">{node.icon}</span>
           </div>
         ) : (
           <Lock size={28} className="text-slate-600" />
         )}

         {/* Progress Ring */}
         {node.unlocked && (
           <svg className="absolute -inset-1 -rotate-90 w-[calc(100%+8px)] h-[calc(100%+8px)] overflow-visible pointer-events-none">
             <circle
               cx="50%" cy="50%" r="48%"
               fill="none"
               stroke="currentColor"
               strokeWidth="4"
               strokeDasharray="100 100"
               strokeDashoffset={100 - node.mastery}
               className="text-white/30"
               style={{ strokeDasharray: '280', strokeDashoffset: 280 - (280 * node.mastery / 100) }}
             />
           </svg>
         )}

         {/* Completed Badge */}
         {node.mastery === 100 && (
           <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-navy shadow-lg z-20"
           >
             <CheckCircle2 size={16} className="text-white" />
           </motion.div>
         )}
       </motion.button>

       {/* Label */}
       <div className="mt-4 text-center">
         <h4 className={`text-xs font-black uppercase tracking-wider ${node.unlocked ? 'text-white' : 'text-slate-500'}`}>
           {node.title}
         </h4>
         <p className="text-[9px] text-slate-400 font-black mt-0.5">{node.category}</p>
         
         {node.unlocked && (
           <div className="flex gap-1 justify-center mt-2">
             {[1, 2, 3].map(star => (
               <Star 
                key={star} 
                size={10} 
                className={`${node.mastery >= (star * 33) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-800'} transition-colors`} 
               />
             ))}
           </div>
         )}
       </div>

       {/* Unlock Tooltip (if locked) */}
       {!node.unlocked && node.dependencies.length > 0 && (
         <div className="absolute top-0 -mt-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-navy-200 border border-white/10 px-2 py-1 rounded text-[8px] font-bold text-slate-400 whitespace-nowrap z-30">
           REQUIRES: {node.dependencies.join(', ').toUpperCase()}
         </div>
       )}
    </div>
  );
}

