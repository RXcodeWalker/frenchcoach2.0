import { MarketingLayout } from '../components/layout/MarketingLayout';
import { enterGuestMode } from '../hooks/useGuestMode';

function startPractisingFree() {
  enterGuestMode();
  window.location.assign('/');
}

const BREADCRUMB = [
  { label: 'Home', href: '/' },
  { label: 'IGCSE French Speaking Exam' },
];

export function IgcseFrenchSpeaking() {
  return (
    <MarketingLayout route="/igcse-french-speaking" breadcrumb={BREADCRUMB}>
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-10 space-y-10">
        <header>
          <h1 className="text-3xl md:text-4xl font-black leading-tight mb-4">
            The IGCSE French Speaking Exam
          </h1>
          <p className="text-slate-500 text-lg leading-relaxed">
            What Paper 3 actually covers, and how Français AI is built to help you practise it.
          </p>
        </header>

        <section>
          <h2 className="text-xl font-bold mb-4">What the exam is</h2>
          <div className="space-y-3 text-slate-500 leading-relaxed">
            <p>
              Cambridge IGCSE French (0520) Paper 3 Speaking makes up 25% of the qualification and
              is worth 40 marks in total. Each candidate sits it individually: approximately 10
              minutes of assessed conversation, preceded by 10 minutes of preparation time and a
              non-assessed 30-second greeting.
            </p>
            <p>The paper has three assessed components:</p>
            <ul className="list-disc list-inside space-y-1.5">
              <li>A role play with 5 transactional tasks, worth 2 marks each (10 marks total).</li>
              <li>
                Two topic conversations, marked together for Communication — how relevant and
                developed your responses are (15 marks).
              </li>
              <li>
                The same two topic conversations, marked separately for Quality of Language —
                accuracy of structures, vocabulary, and pronunciation (15 marks).
              </li>
            </ul>
            <p>
              The qualification targets language proficiency at CEFR level A2 with elements of
              B1.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">What Français AI does</h2>
          <div className="space-y-3 text-slate-500 leading-relaxed">
            <p>
              Français AI lets you record spoken answers to role-play and topic-conversation style
              questions and get feedback on your grammar and vocabulary, generated from your
              transcript. You can practise in{' '}
              <a href="/learn" className="text-violet-400 hover:underline">
                Learn mode
              </a>{' '}
              at your own pace, or under timed conditions in{' '}
              <a href="/exam" className="text-violet-400 hover:underline">
                Exam mode
              </a>
              . Progress across grammar categories is tracked over time so you can see which
              structures still need work.
            </p>
            <p className="text-sm">
              Français AI is not affiliated with or endorsed by Cambridge Assessment International
              Education. It is an independent practice tool, not an official Cambridge product.
            </p>
          </div>
        </section>

        <section className="glass-elevated rounded-3xl p-8 text-center">
          <h2 className="text-xl font-bold mb-3">Ready to practise?</h2>
          <p className="text-slate-500 mb-6">
            Try a role-play scenario in the{' '}
            <a href="/french-roleplay-practice" className="text-violet-400 hover:underline">
              roleplay practice library
            </a>
            , or jump straight into a session.
          </p>
          <button
            onClick={startPractisingFree}
            className="px-8 py-4 bg-violet-electric hover:bg-violet-600 text-white rounded-2xl font-bold transition-colors shadow-lg shadow-violet-500/25"
          >
            Start practising free
          </button>
        </section>
      </div>
    </MarketingLayout>
  );
}
