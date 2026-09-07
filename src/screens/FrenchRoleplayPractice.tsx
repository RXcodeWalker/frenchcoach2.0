import { MarketingLayout } from '../components/layout/MarketingLayout';
import { CtaButton } from '../components/marketing/CtaButton';
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

const TIERS: { label: string; sub: string; ids: string[]; frenchNames?: Record<string, string> }[] = [
  {
    label: 'Start here · everyday basics',
    sub: 'short, forgiving, 4–6 turns',
    ids: ['bakery', 'cafe', 'market', 'store', 'library', 'flower_shop'],
    frenchNames: {
      bakery: 'à la boulangerie', cafe: 'au café', market: 'au marché',
      store: 'au magasin', library: 'à la bibliothèque', flower_shop: 'chez le fleuriste',
    },
  },
  {
    label: 'Getting things done',
    sub: 'transactions, forms, appointments',
    ids: ['bank', 'post_office', 'pharmacy', 'bookstore', 'hairdresser', 'dentist', 'doctor', 'tourist_office', 'police_station', 'real_estate'],
  },
  {
    label: 'Travel & getting around',
    sub: 'timetables, bookings, problems to solve',
    ids: ['gare', 'airport', 'flight', 'hotel', 'taxi', 'car_rental', 'gas_station', 'camping', 'ski_resort'],
  },
  {
    label: 'Leisure & the hard ones',
    sub: 'longer turns, opinions, formal register',
    ids: ['restaurant', 'cinema', 'museum', 'gym', 'job_interview'],
  },
];

export function FrenchRoleplayPractice() {
  return (
    <MarketingLayout route="/french-roleplay-practice" breadcrumb={BREADCRUMB}>
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-10 md:py-14 space-y-14">
        <header>
          <h1 className="font-display text-4xl md:text-5xl leading-tight mb-4">
            French Roleplay Practice
          </h1>
          <p className="text-lg leading-relaxed" style={{ color: 'var(--mk-ink-muted)' }}>
            {SCENARIOS.length} everyday situations to practise spoken French in, each a short
            branching conversation you speak your way through out loud.
          </p>
        </header>

        <section>
          <h2 className="font-display text-2xl mb-4">How it works</h2>
          <p className="text-base leading-relaxed mb-3" style={{ color: 'var(--mk-ink-muted)' }}>
            Each scenario drops you into a short conversation — at a café counter, checking into a
            hotel, or explaining symptoms to a doctor. You respond by speaking, the scenario
            branches based on what you say, and you get feedback on your grammar and vocabulary
            afterwards.
          </p>
          <p className="text-base leading-relaxed" style={{ color: 'var(--mk-ink-muted)' }}>
            This is separate from the structured{' '}
            <a href="/igcse-french-speaking" className="mk-link">IGCSE Speaking exam practice</a>:
            roleplay scenarios are open-ended conversational practice, not scored against the
            Paper 3 mark scheme.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl mb-6">Scenarios</h2>
          <div className="flex flex-col gap-9">
            {TIERS.map((tier) => (
              <div key={tier.label}>
                <div className="flex items-baseline gap-3 pb-2.5 border-b mk-hairline-strong mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--mk-accent)' }}>{tier.label}</p>
                  <p className="text-xs" style={{ color: 'var(--mk-ink-faint)' }}>{tier.sub}</p>
                </div>
                <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
                  {tier.ids.map((id) => {
                    const s = SCENARIOS.find((x) => x.id === id);
                    if (!s) return null;
                    const isHardest = id === 'job_interview';
                    return (
                      <div
                        key={id}
                        className="rounded-xl border p-3.5 flex items-center gap-3"
                        style={isHardest ? { borderColor: 'var(--mk-accent)', background: 'var(--mk-accent-soft)' } : { borderColor: 'var(--mk-hairline)' }}
                      >
                        <span className="text-lg" aria-hidden="true">{s.icon}</span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{s.title}</p>
                          {tier.frenchNames?.[id] && (
                            <p className="text-xs" style={{ color: 'var(--mk-ink-faint)' }}>{tier.frenchNames[id]}</p>
                          )}
                          {isHardest && (
                            <p className="text-xs" style={{ color: 'var(--mk-accent)' }}>hardest scenario</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border mk-hairline p-8 text-center">
          <h2 className="font-display text-2xl mb-3">Ready to try a scenario?</h2>
          <CtaButton onClick={startPractisingFree}>Start practising free</CtaButton>
        </section>
      </div>
    </MarketingLayout>
  );
}
