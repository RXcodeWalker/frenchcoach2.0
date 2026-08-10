import { Mic, MessageSquare, BarChart3 } from 'lucide-react';
import { MarketingLayout } from '../components/layout/MarketingLayout';
import { enterGuestMode } from '../hooks/useGuestMode';

function startPractisingFree() {
  enterGuestMode();
  window.location.assign('/');
}

export function Landing() {
  return (
    <MarketingLayout route="/">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-12 md:py-20 space-y-16">
        <section className="max-w-2xl">
          <h1 className="text-3xl md:text-5xl font-black leading-tight mb-6">
            Practise the IGCSE French speaking exam by speaking, not by reading.
          </h1>
          <p className="text-slate-500 text-lg leading-relaxed mb-8">
            Français AI is a speaking-practice coach for IGCSE French learners. Record spoken
            answers to role-play and topic-conversation style questions, get structured feedback,
            and track skill mastery across grammar categories over time.
          </p>
          <button
            onClick={startPractisingFree}
            className="px-8 py-4 bg-violet-electric hover:bg-violet-600 text-white rounded-2xl font-bold transition-colors shadow-lg shadow-violet-500/25"
          >
            Start practising free
          </button>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass border-white/5 rounded-2xl p-6">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4">
              <Mic size={20} className="text-violet-400" />
            </div>
            <h2 className="font-bold mb-2">Speak your answers</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Record spoken responses to French questions instead of typing them, closer to what
              the actual Speaking exam asks of you.
            </p>
          </div>
          <div className="glass border-white/5 rounded-2xl p-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
              <MessageSquare size={20} className="text-blue-400" />
            </div>
            <h2 className="font-bold mb-2">Get structured feedback</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Each answer gets feedback on grammar and vocabulary, generated from your transcript.
            </p>
          </div>
          <div className="glass border-white/5 rounded-2xl p-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
              <BarChart3 size={20} className="text-emerald-400" />
            </div>
            <h2 className="font-bold mb-2">Track skill mastery</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Progress is tracked across grammar categories, so you can see which structures need
              more practice.
            </p>
          </div>
        </section>

        <section className="glass-elevated rounded-3xl p-8 md:p-10">
          <h2 className="text-xl font-bold mb-4">Two ways to practise</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-sm mb-1">
                <a href="/igcse-french-speaking" className="hover:text-violet-400 transition-colors">
                  IGCSE French Speaking exam practice
                </a>
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Role-play and topic-conversation style questions modelled on the Paper 3 exam
                structure.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-sm mb-1">
                <a href="/french-roleplay-practice" className="hover:text-violet-400 transition-colors">
                  French roleplay practice scenarios
                </a>
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Everyday situations like ordering at a café, checking into a hotel, or booking a
                doctor's appointment.
              </p>
            </div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
