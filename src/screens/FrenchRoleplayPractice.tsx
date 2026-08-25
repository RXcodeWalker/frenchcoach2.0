import { MarketingLayout } from '../components/layout/MarketingLayout';
import { enterGuestMode } from '../hooks/useGuestMode';
import { getScenario, isAuthored, listScenarioIds } from '../data/scenarios/registry';

function startPractisingFree() {
  enterGuestMode();
  window.location.assign('/');
}

const BREADCRUMB = [
  { label: 'Home', href: '/' },
  { label: 'French Roleplay Practice' },
];

/**
 * Fallback title/icon for scenarios the registry doesn't have real meta for
 * yet (Stage 9 content authoring). Keyed by registry id rather than an
 * ordered array so this list can never silently drift out of sync with
 * which scenario ids actually exist — see `scenarioDisplay` below, which
 * prefers registry meta the moment a scenario is authored.
 */
const SCENARIO_DISPLAY_FALLBACK: Record<string, { title: string; icon: string }> = {
  airport: { title: 'Airport', icon: '✈️' },
  bakery: { title: 'Bakery', icon: '🥖' },
  bank: { title: 'Bank', icon: '🏦' },
  bookstore: { title: 'Bookstore', icon: '📚' },
  cafe: { title: 'Cafe', icon: '☕' },
  camping: { title: 'Camping', icon: '⛺' },
  car_rental: { title: 'Car Rental', icon: '🚗' },
  cinema: { title: 'Cinema', icon: '🎬' },
  dentist: { title: 'Dentist', icon: '🦷' },
  doctor: { title: 'Doctor', icon: '🏥' },
  flight: { title: 'Flight', icon: '🛫' },
  flower_shop: { title: 'Flower Shop', icon: '💐' },
  gare: { title: 'Train Station', icon: '🚉' },
  gas_station: { title: 'Gas Station', icon: '⛽' },
  gym: { title: 'Gym', icon: '💪' },
  hairdresser: { title: 'Hairdresser', icon: '💇' },
  hotel: { title: 'Hotel', icon: '🏨' },
  job_interview: { title: 'Job Interview', icon: '💼' },
  library: { title: 'Library', icon: '📖' },
  market: { title: 'Market', icon: '🛒' },
  museum: { title: 'Museum', icon: '🏛️' },
  pharmacy: { title: 'Pharmacy', icon: '💊' },
  police_station: { title: 'Police Station', icon: '👮' },
  post_office: { title: 'Post Office', icon: '📮' },
  real_estate: { title: 'Real Estate', icon: '🏠' },
  restaurant: { title: 'Restaurant', icon: '🍽️' },
  ski_resort: { title: 'Ski Resort', icon: '⛷️' },
  store: { title: 'Store', icon: '🛍️' },
  taxi: { title: 'Taxi', icon: '🚕' },
  tourist_office: { title: 'Tourist Office', icon: 'ℹ️' },
};

function scenarioDisplay(id: string): { title: string; icon: string } {
  if (isAuthored(id)) {
    const meta = getScenario(id)?.meta;
    if (meta) return { title: meta.title, icon: meta.emoji };
  }
  return SCENARIO_DISPLAY_FALLBACK[id] ?? { title: id, icon: '🗣️' };
}

// The registry's id list is the single source of which scenarios exist; this
// page can no longer drift out of sync with it (or with Explore) the way a
// hand-duplicated array could.
const SCENARIOS = listScenarioIds().map((id) => ({ id, ...scenarioDisplay(id) }));

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
                key={s.id}
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
