import {
  Target, Mic2, Brain, Zap, Rocket,
  ShieldCheck, Sparkles, Play
} from 'lucide-react';
import { StatTile } from '../components/ui/StatTile';

// Pure JSX, no context/router/motion — safe to prerender or reuse across
// in-app and public-marketing chrome.
export function AboutContent() {
  const techItems = [
    {
      icon: <Mic2 size={20} className="text-blue-400" />,
      title: "Neural Speech-to-Text",
      desc: "Advanced recognition that understands non-native French accents and provides phonetic feedback."
    },
    {
      icon: <Brain size={20} className="text-violet-400" />,
      title: "Cambridge-Aligned Scoring",
      desc: "Your answers are marked against the published Cambridge 0520 mark scheme. Français AI is not affiliated with or endorsed by Cambridge Assessment International Education."
    },
    {
      icon: <Zap size={20} className="text-amber-400" />,
      title: "Real-Time Synthesis",
      desc: "Powered by Groq & Gemini for near-zero latency conversations that feel natural and fluid."
    }
  ];

  return (
    <div className="space-y-12 pb-24 md:pb-12">
      {/* Hero Section */}
      <div className="glass-elevated rounded-3xl p-8 md:p-12 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-electric/10 rounded-full blur-3xl group-hover:bg-violet-electric/20 transition-colors" />
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-violet-electric/20 flex items-center justify-center">
              <Sparkles size={24} className="text-violet-400 animate-pulse" />
            </div>
            <span className="text-[10px] font-black text-violet-400 uppercase tracking-[0.2em]">IGCSE Mastery</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-6">
            You can read French. You can write it. But when the examiner asks a question, <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">the words vanish.</span>
          </h1>

          <p className="text-slate-400 text-lg leading-relaxed mb-8">
            It's a universal frustration for language learners: the "fluency gap." You've spent years mastering conjugations and vocabulary, yet in the high-pressure environment of an oral exam, your brain freezes.
          </p>

          <a
            href="/learn"
            className="flex items-center gap-3 px-8 py-4 bg-violet-electric hover:bg-violet-600 text-white rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-violet-500/25 w-fit"
          >
            <Play size={20} fill="currentColor" />
            START PRACTICING NOW
          </a>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatTile
          icon={<ShieldCheck size={20} className="text-emerald-400" />}
          value="0520"
          label="Syllabus Aligned"
          className="border-emerald-500/10"
        />
        <StatTile
          icon={<Brain size={20} className="text-violet-400" />}
          value="Instant"
          label="AI Feedback"
          className="border-violet-500/10"
        />
      </div>

      {/* The Problem Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass border-white/5 rounded-3xl p-8">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-6">
            <Target size={20} className="text-orange-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">The Problem</h3>
          <div className="space-y-4 text-slate-400 leading-relaxed">
            <p>
              For IGCSE students, the Speaking Test (Paper 3) is often the most intimidating part of the syllabus. It requires more than just knowing French—it requires <strong className="text-white">performance</strong>.
            </p>
            <p>
              Students are expected to navigate spontaneous roleplays, sustain complex conversations, and demonstrate specific structures, all while being recorded.
            </p>
          </div>
        </div>

        <div className="glass border-white/5 rounded-3xl p-8">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6">
            <Rocket size={20} className="text-blue-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">The Solution</h3>
          <div className="space-y-4 text-slate-400 leading-relaxed">
            <p>
              <strong className="text-white font-bold">Français AI</strong> is a speaking coach built specifically for the IGCSE French syllabus.
            </p>
            <p>
              It simulates Cambridge-style exam scenarios turn-by-turn. This is not a chatbot—this is an <span className="text-blue-400 font-bold italic">Exam Simulator</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Tech Section */}
      <div className="glass-elevated rounded-3xl p-8 border-violet-500/10">
        <h3 className="text-2xl font-bold text-white mb-8 text-center">The Technology Behind the Coach</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {techItems.map((item, i) => (
            <div key={i} className="text-center space-y-4 group">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto group-hover:scale-110 group-hover:bg-white/10 transition-all duration-300">
                {item.icon}
              </div>
              <h4 className="text-white font-bold">{item.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Founder Section */}
      <div className="glass border-white/5 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-4xl shrink-0">
          👨‍💻
        </div>
        <div className="text-center md:text-left">
          <h3 className="text-xl font-bold text-white mb-2">Meet the Creator</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Built by a team of educators and engineers who saw students struggle with oral exams year after year.
            Our mission is to democratize elite-level coaching, making high-quality speaking practice accessible to every student, everywhere.
          </p>
        </div>
      </div>

      {/* Final CTA */}
      <div className="rounded-3xl p-12 text-center relative overflow-hidden bg-gradient-to-br from-violet-600 to-indigo-700 shadow-2xl shadow-violet-500/20">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle,white_1px,transparent_1px)] [background-size:40px_40px] animate-pulse" />
        </div>

        <h2 className="text-3xl md:text-4xl font-black text-white mb-4 relative z-10">Ready to bridge the gap?</h2>
        <p className="text-violet-100 mb-8 max-w-lg mx-auto relative z-10 opacity-90">
          Stop studying French. Start speaking it. The examiner is waiting.
        </p>
        <a
          href="/exam"
          className="inline-block px-10 py-4 bg-white text-violet-700 rounded-2xl font-black hover:scale-105 active:scale-95 transition-all shadow-xl relative z-10"
        >
          LAUNCH EXAM SIMULATOR
        </a>
      </div>
    </div>
  );
}
