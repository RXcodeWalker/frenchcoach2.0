import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Info, Target, Mic2, Brain, Zap, Users, Rocket, 
  Quote, ShieldCheck, Sparkles, MessageSquare, Play,
  Github, Globe, ExternalLink, Heart, Coffee, AlertCircle,
  Terminal, Camera, PenTool
} from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { TopContextBar } from '../components/TopContextBar';
import { StatTile } from '../components/ui/StatTile';
import { fadeUp, stagger } from '../components/motion/variants';

export function About() {
  const navigate = useNavigate();

  const manifestoItems = [
    {
      title: "Grades aren't the goal.",
      desc: "An A* is great, but the goal is the freedom to walk into a cafe in Paris and not feel like a fraud. We build for confidence, not just certificates."
    },
    {
      title: "Building is messy.",
      desc: "There are no 'professional' teams here. Just one 10th grader, a laptop, and a lot of late nights. If you find a bug, it's probably because I was sleepy."
    },
    {
      title: "The 'Fluency Gap' is real.",
      desc: "School teaches us the rules of the game, but never lets us play. Français AI is the playground where you're allowed to make mistakes."
    }
  ];

  const obsessions = [
    { label: "Arsenal FC", value: "Arsenal 🔴 (COYG!)", icon: <Heart size={12} className="text-red-400" /> },
    { label: "Coffee", value: "Cold Brew / No Sugar", icon: <Coffee size={12} className="text-amber-400" /> },
    { label: "Setup", value: "Dark Mode / VS Code", icon: <Terminal size={12} className="text-emerald-400" /> },
    { label: "Writing", value: "Honest blog posts", icon: <PenTool size={12} className="text-blue-400" /> }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      <TopContextBar 
        title="The Story Behind the AI" 
        subtitle="One student's quest to fix the 'Silent Examiner' syndrome."
      />
      
      <PageShell>
        <motion.div 
          className="space-y-16 pb-24 md:pb-12"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          {/* Radical Authenticity Hero */}
          <motion.div variants={fadeUp} className="relative py-12">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-8">
                <div className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-widest border border-red-500/10">
                  Raw & Unfiltered
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-red-500/20 to-transparent" />
              </div>

              <h1 className="text-4xl md:text-6xl font-black text-white leading-[1.1] mb-8">
                Sweaty palms. A ticking clock. <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">The examiner's blank stare.</span>
              </h1>
              
              <p className="text-slate-400 text-xl leading-relaxed mb-10 font-medium">
                I've been there. That moment in the Paper 3 mock exam where your brain just... deletes French. You know the words, you know the verbs, but your mouth won't move. I didn't build this app to be a "product." I built it because I was tired of that feeling.
              </p>

              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => navigate('/learn')}
                  className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5"
                >
                  START THE DRILL
                </button>
                <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/5 border border-white/5 text-slate-400 text-sm font-bold">
                  <AlertCircle size={18} className="text-amber-400" />
                  Warning: No corporate polish here.
                </div>
              </div>
            </div>
          </motion.div>

          {/* Narrative Founder Section */}
          <motion.div variants={fadeUp} className="relative">
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="glass-elevated border-white/5 rounded-[40px] p-8 md:p-12 overflow-hidden relative">
              <div className="flex flex-col lg:flex-row gap-12 items-start">
                <div className="w-full lg:w-1/3 space-y-6">
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-[32px] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                    <div className="relative aspect-square rounded-[28px] bg-slate-900 overflow-hidden border border-white/10">
                      <img 
                        src="https://github.com/omjhamvar.png" 
                        alt="Om Jhamvar" 
                        className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=Om+Jhamvar&background=6366f1&color=fff';
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-white/60">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                        <Globe size={14} />
                      </div>
                      <a href="https://beyondthebasics.me" target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-violet-400 transition-colors">beyondthebasics.me</a>
                    </div>
                    <div className="flex items-center gap-3 text-white/60">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                        <Github size={14} />
                      </div>
                      <a href="https://github.com/omjhamvar" target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-violet-400 transition-colors">@omjhamvar</a>
                    </div>
                    
                    <div className="pt-6 space-y-3">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Builder Stats</p>
                      <div className="grid grid-cols-2 gap-2">
                        {obsessions.map((obs, i) => (
                          <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                            <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-tight">
                              {obs.icon}
                              {obs.label}
                            </div>
                            <div className="text-xs font-bold text-white leading-none">{obs.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-2/3 space-y-8">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-black text-white mb-6 leading-tight">
                      "I'm not an expert. I'm just <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">in the same boat as you."</span>
                    </h2>
                    
                    <div className="space-y-6 text-slate-300 text-lg leading-relaxed font-medium">
                      <p>
                        My name is <strong className="text-white">Om Jhamvar</strong>. I'm a 10th-grade student from India. While most people my age were spending their weekends on Netflix, I spent mine wrestling with Python scripts and neural networks.
                      </p>
                      
                      <p>
                        Why? Because I was tired of feeling like a failure every time I opened my mouth in French class. 
                      </p>

                      <p>
                        Français AI is my attempt to bridge the "fluency gap." It's the result of hundreds of hours of trial and error, a lot of cold coffee, and the realization that we don't need another textbook—we need a safe space to fail. 
                      </p>

                      <p>
                        I analyze Arsenal's tactics because I love the strategy of the game. I apply that same strategy here: breaking down the Cambridge mark scheme into actionable, low-stakes drills. No judgment, no pressure, just progress.
                      </p>

                      <p className="italic text-slate-400 text-base border-l-2 border-violet-500/50 pl-4 py-1">
                        "Beyond the Basics" isn't just a domain name. It's my personal manifesto. It's about moving past the theory and actually doing the work. This app is my honest work in progress. Welcome to the journey.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-4">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 text-violet-400 text-xs font-bold border border-violet-500/10">
                      <Terminal size={14} />
                      Solo Developed
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/10">
                      <Heart size={14} />
                      Built with Passion
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* The Manifesto */}
          <motion.div variants={fadeUp} className="space-y-8">
            <div className="text-center">
              <h3 className="text-2xl font-black text-white mb-2">The Manifesto</h3>
              <p className="text-slate-500 text-sm">The rules I build by.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {manifestoItems.map((item, i) => (
                <div key={i} className="glass p-8 rounded-3xl border-white/5 hover:border-violet-500/20 transition-all group">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-violet-500/10 transition-all">
                    <span className="text-xl font-black text-violet-400">{i + 1}</span>
                  </div>
                  <h4 className="text-white font-bold text-lg mb-3">{item.title}</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* The Journey Timeline */}
          <motion.div variants={fadeUp} className="space-y-12">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-black text-white">The Messy Middle</h3>
              <p className="text-slate-500 text-sm">The timeline of a 10th-grade solo dev.</p>
            </div>

            <div className="max-w-4xl mx-auto space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-slate-700 bg-slate-900 text-slate-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  <Brain size={16} />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] glass p-6 rounded-2xl border-white/5">
                  <div className="flex items-center justify-between space-x-2 mb-1">
                    <div className="font-bold text-white">Mock Exam Meltdown</div>
                    <time className="font-mono text-[10px] font-bold text-violet-400 uppercase tracking-widest">Early 2024</time>
                  </div>
                  <div className="text-slate-400 text-xs leading-relaxed">
                    Frozen in my French oral mock. I realized I knew 2,000 words but couldn't say "Hello" under pressure. The idea for Français AI was born out of frustration.
                  </div>
                </div>
              </div>

              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-slate-700 bg-slate-900 text-slate-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  <Terminal size={16} />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] glass p-6 rounded-2xl border-white/5">
                  <div className="flex items-center justify-between space-x-2 mb-1">
                    <div className="font-bold text-white">The Bug Hunt</div>
                    <time className="font-mono text-[10px] font-bold text-violet-400 uppercase tracking-widest">Mid 2024</time>
                  </div>
                  <div className="text-slate-400 text-xs leading-relaxed">
                    Spent three weeks trying to get the microphone to work on Safari. Almost gave up. Realized that "Building in Public" means admitting when you're stuck.
                  </div>
                </div>
              </div>

              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-slate-700 bg-slate-900 text-slate-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  <Rocket size={16} />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] glass p-6 rounded-2xl border-white/5">
                  <div className="flex items-center justify-between space-x-2 mb-1">
                    <div className="font-bold text-white">The Launch Simulator</div>
                    <time className="font-mono text-[10px] font-bold text-violet-400 uppercase tracking-widest">Present</time>
                  </div>
                  <div className="text-slate-400 text-xs leading-relaxed">
                    Finally integrated the Cambridge mark scheme. It's not perfect, it's not "finished," but it's here. And it works.
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stories from the Trenches */}
          <motion.div variants={fadeUp} className="space-y-6">
            <h3 className="text-xl font-black text-white flex items-center gap-2 px-2">
              <Quote size={20} className="text-violet-400" />
              Stories from the Trenches
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { text: "I used to panic during roleplays. After just a week of practicing with Français AI, my confidence soared. I ended up getting an A* in my speaking exam!", author: "Sarah A.", role: "IGCSE Student", initials: "SA" },
                { text: "The feedback is incredibly specific. It doesn't just say 'good job', it tells me exactly which verb tenses I missed. It's like having a tutor 24/7.", author: "James M.", role: "IGCSE Student", initials: "JM" }
              ].map((t, i) => (
                <div key={i} className="glass-elevated border-white/5 rounded-3xl p-8 relative overflow-hidden">
                  <p className="text-slate-300 italic mb-6 relative z-10 text-lg">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[10px] font-black text-white">
                      {t.initials}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{t.author}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Final CTA */}
          <motion.div 
            variants={fadeUp} 
            className="rounded-[40px] p-12 text-center relative overflow-hidden bg-white shadow-2xl shadow-white/5 group"
          >
            <div className="absolute top-0 left-0 w-full h-full bg-slate-900 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 group-hover:text-white transition-colors mb-4">Ready to bridge the gap?</h2>
              <p className="text-slate-500 group-hover:text-slate-400 transition-colors mb-8 max-w-lg mx-auto font-medium">
                The examiner is waiting, but for once, they're on your side. Let's get to work.
              </p>
              <button 
                onClick={() => navigate('/exam')}
                className="px-10 py-5 bg-slate-900 text-white group-hover:bg-white group-hover:text-slate-900 rounded-2xl font-black transition-all shadow-xl"
              >
                LAUNCH EXAM SIMULATOR
              </button>
            </div>
          </motion.div>
        </motion.div>
      </PageShell>
    </div>
  );
}
