import { MarketingLayout } from '../components/layout/MarketingLayout';
import { enterGuestMode } from '../hooks/useGuestMode';

function startPractisingFree() {
  enterGuestMode();
  window.location.assign('/');
}

const BREADCRUMB = [
  { label: 'Home', href: '/' },
  { label: 'French Roleplay Practice' },
];

// Titles mirror src/data/gameData.ts / src/data/exploreTree.ts where a
// registered title exists; scenarios not yet registered there use a
// filename-derived title (id.replace('_', ' ')) rather than invented copy.
const SCENARIOS: { title: string; icon: string }[] = [
  { title: 'Restaurant', icon: '🍽️' },
  { title: 'Hotel', icon: '🏨' },
  { title: 'Airport', icon: '✈️' },
  { title: 'Pharmacy', icon: '💊' },
  { title: 'Doctor', icon: '🏥' },
  { title: 'Job Interview', icon: '💼' },
  { title: 'Bakery', icon: '🥖' },
  { title: 'Market', icon: '🛒' },
  { title: 'Bank', icon: '🏦' },
  { title: 'Museum', icon: '🏛️' },
  { title: 'Cafe', icon: '☕' },
  { title: 'Store', icon: '🛍️' },
  { title: 'Post Office', icon: '📮' },
  { title: 'Bookstore', icon: '📚' },
  { title: 'Train Station', icon: '🚉' },
  { title: 'Cinema', icon: '🎬' },
  { title: 'Gym', icon: '💪' },
  { title: 'Real Estate', icon: '🏠' },
  { title: 'Police Station', icon: '👮' },
  { title: 'Camping', icon: '⛺' },
  { title: 'Car Rental', icon: '🚗' },
  { title: 'Dentist', icon: '🦷' },
  { title: 'Flight', icon: '🛫' },
  { title: 'Flower Shop', icon: '💐' },
  { title: 'Gas Station', icon: '⛽' },
  { title: 'Hairdresser', icon: '💇' },
  { title: 'Library', icon: '📖' },
  { title: 'Ski Resort', icon: '⛷️' },
  { title: 'Taxi', icon: '🚕' },
  { title: 'Tourist Office', icon: 'ℹ️' },
];

export function FrenchRoleplayPractice() {
  return (
    <MarketingLayout route="/french-roleplay-practice" breadcrumb={BREADCRUMB}>
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-10 space-y-10">
        <header>
          <h1 className="text-3xl md:text-4xl font-black leading-tight mb-4">
            French Roleplay Practice
          </h1>
          <p className="text-slate-500 text-lg leading-relaxed">
            {SCENARIOS.length} everyday situations to practise spoken French in, each a short
            branching conversation you speak your way through out loud.
          </p>
        </header>

        <section>
          <h2 className="text-xl font-bold mb-4">How it works</h2>
          <p className="text-slate-500 leading-relaxed mb-3">
            Each scenario drops you into a short conversation — at a café counter, checking into a
            hotel, or explaining symptoms to a doctor. You respond by speaking, the scenario
            branches based on what you say, and you get feedback on your grammar and vocabulary
            afterwards.
          </p>
          <p className="text-slate-500 leading-relaxed">
            This is separate from the structured{' '}
            <a href="/igcse-french-speaking" className="text-violet-400 hover:underline">
              IGCSE Speaking exam practice
            </a>
            : roleplay scenarios are open-ended conversational practice, not scored against the
            Paper 3 mark scheme.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">Scenarios</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {SCENARIOS.map((s) => (
              <div
                key={s.title}
                className="glass border-white/5 rounded-xl p-3.5 flex items-center gap-2.5"
              >
                <span className="text-lg" aria-hidden="true">{s.icon}</span>
                <span className="text-sm font-medium">{s.title}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-elevated rounded-3xl p-8 text-center">
          <h2 className="text-xl font-bold mb-3">Ready to try a scenario?</h2>
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
