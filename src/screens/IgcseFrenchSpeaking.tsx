import { MarketingLayout } from '../components/layout/MarketingLayout';
import { Section } from '../components/marketing/Section';
import { CtaButton } from '../components/marketing/CtaButton';
import { startPractisingFree } from '../components/marketing/startPractisingFree';

const BREADCRUMB = [
  { label: 'Home', href: '/' },
  { label: 'IGCSE French Speaking Exam' },
];

const COMPONENTS = [
  { n: '01', title: 'Role play — 5 transactional tasks', body: 'Two marks each. You get the role-play card during the 10 minutes of preparation.', marks: 10 },
  { n: '02', title: 'Communication', body: 'Both topic conversations, marked together — how relevant and developed your answers are.', marks: 15 },
  { n: '03', title: 'Quality of Language', body: 'The same two conversations, marked separately — structures, vocabulary, pronunciation.', marks: 15 },
];

const AT_A_GLANCE = [
  { label: 'Marks', value: '40' },
  { label: 'Assessed time', value: '~10 min' },
  { label: 'Prep time', value: '10 min' },
  { label: 'Level', value: 'A2 → B1' },
];

export function IgcseFrenchSpeaking() {
  return (
    <MarketingLayout route="/igcse-french-speaking" breadcrumb={BREADCRUMB}>
      <Section divider={false} className="!pt-8 md:!pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12 items-start">
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl md:text-5xl leading-tight mb-4">
              The IGCSE French Speaking Exam
            </h1>
            <p className="text-lg leading-relaxed mb-10" style={{ color: 'var(--mk-ink-muted)' }}>
              What Paper 3 actually covers, and how French Coach is built to help you practise it.
            </p>

            <h2 id="what-the-exam-is" className="font-display text-2xl mb-4 scroll-mt-24">What the exam is</h2>
            <p className="text-base leading-relaxed mb-5" style={{ color: 'var(--mk-ink-muted)' }}>
              Cambridge IGCSE French (0520) Paper 3 Speaking is worth{' '}
              <strong style={{ color: 'var(--mk-ink)' }}>40 marks</strong>. Each candidate sits it
              individually: about ten minutes of assessed conversation, preceded by ten minutes of
              preparation and a non-assessed 30-second greeting.
            </p>
            <p className="text-base leading-relaxed mb-5" style={{ color: 'var(--mk-ink-muted)' }}>
              The assessed part runs in three steps. First comes a role play of about two minutes, in
              which the examiner plays a character from your card and asks five questions. Then come
              two topic conversations of about four minutes each: the first on a topic from
              Everyday activities or Personal and social life, the second on a topic from The world
              around us, The world of work or The international world. You are told each topic as the
              conversation starts, so it pays to prepare several.
            </p>

            <div className="rounded-xl border mk-hairline overflow-hidden mb-5">
              {COMPONENTS.map((c) => (
                <div key={c.n} className="flex items-start gap-4 p-4 border-b mk-hairline last:border-b-0">
                  <span className="text-xs pt-0.5" style={{ color: 'var(--mk-ink-faint)' }}>{c.n}</span>
                  <div className="flex-1">
                    <p className="text-base font-semibold">{c.title}</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--mk-ink-muted)' }}>{c.body}</p>
                  </div>
                  <span className="text-base font-bold">{c.marks}</span>
                </div>
              ))}
              <div className="flex items-center gap-4 p-4" style={{ background: 'var(--mk-accent-soft)' }}>
                <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--mk-accent)' }}>Total</span>
                <span className="text-lg font-bold">40 marks</span>
              </div>
            </div>
            <p className="text-base leading-relaxed mb-10" style={{ color: 'var(--mk-ink-muted)' }}>
              The qualification targets language proficiency at{' '}
              <strong style={{ color: 'var(--mk-ink)' }}>CEFR A2 with elements of B1</strong>. For
              what each criterion rewards, with worked role-play marks, see{' '}
              <a href="/igcse-french-speaking/marking" className="mk-link">how the exam is marked</a>.
            </p>

            <h2 id="prepare-each-part" className="font-display text-2xl mb-4 scroll-mt-24">Prepare each part</h2>
            <p className="text-base leading-relaxed mb-4" style={{ color: 'var(--mk-ink-muted)' }}>
              Read worked examples first, then say your own answers out loud.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 mb-10">
              <a href="/igcse-french-speaking/topics" className="mk-focus block rounded-xl border mk-hairline p-4" style={{ background: 'var(--mk-surface)' }}>
                <span className="block text-base font-semibold mk-link">Topics and model answers</span>
                <span className="block text-sm mt-1" style={{ color: 'var(--mk-ink-muted)' }}>16 topics, four model answers each, for the two topic conversations</span>
              </a>
              <a href="/igcse-french-speaking/role-play" className="mk-focus block rounded-xl border mk-hairline p-4" style={{ background: 'var(--mk-surface)' }}>
                <span className="block text-base font-semibold mk-link">Role-play examples</span>
                <span className="block text-sm mt-1" style={{ color: 'var(--mk-ink-muted)' }}>Six practice role plays with a short model reply to every task</span>
              </a>
              <a href="/igcse-french-speaking/marking" className="mk-focus block rounded-xl border mk-hairline p-4" style={{ background: 'var(--mk-surface)' }}>
                <span className="block text-base font-semibold mk-link">How the exam is marked</span>
                <span className="block text-sm mt-1" style={{ color: 'var(--mk-ink-muted)' }}>Where the 40 marks come from, with worked role-play marks</span>
              </a>
              <a href="/igcse-french-speaking/common-mistakes" className="mk-focus block rounded-xl border mk-hairline p-4" style={{ background: 'var(--mk-surface)' }}>
                <span className="block text-base font-semibold mk-link">Common mistakes</span>
                <span className="block text-sm mt-1" style={{ color: 'var(--mk-ink-muted)' }}>Agreement, être or avoir, tenses and short answers, with fixes</span>
              </a>
            </div>

            <h2 id="what-french-coach-does" className="font-display text-2xl mb-4 scroll-mt-24">What French Coach does</h2>
            <p className="text-base leading-relaxed mb-2" style={{ color: 'var(--mk-ink-muted)' }}>
              You record spoken answers to role-play and topic-conversation questions and get
              feedback generated from your own transcript. Practise at your own pace in{' '}
              <a href="/learn" className="mk-link">Learn mode</a>, or under timed conditions in{' '}
              <a href="/exam" className="mk-link">Exam mode</a>. Progress across grammar
              categories is tracked over time, so you can see which structures still need work.
            </p>
            <p className="text-sm leading-relaxed mb-10" style={{ color: 'var(--mk-ink-faint)' }}>
              French Coach is not affiliated with or endorsed by Cambridge Assessment International
              Education. It is an independent practice tool, not an official Cambridge product.
            </p>

            <div className="rounded-2xl border p-7 flex flex-wrap items-center gap-6" style={{ borderColor: 'var(--mk-accent)', background: 'var(--mk-accent-soft)' }}>
              <div className="flex-1 min-w-[240px]">
                <p className="font-display text-2xl mb-1.5">Ready to practise?</p>
                <p className="text-base leading-relaxed" style={{ color: 'var(--mk-ink-muted)' }}>
                  Try a role play from the{' '}
                  <a href="/french-roleplay-practice" className="mk-link">scenario library</a>,
                  or start a timed mock straight away.
                </p>
              </div>
              <CtaButton onClick={() => startPractisingFree('igcse_page_start')}>Start practising free</CtaButton>
            </div>
          </div>

          <div className="sticky top-20 flex flex-col gap-5">
            <div className="rounded-xl border mk-hairline p-5">
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--mk-ink-faint)' }}>
                On this page
              </p>
              <div className="flex flex-col gap-2.5 text-sm">
                <a href="#what-the-exam-is" className="pl-3 border-l-2 font-semibold" style={{ borderColor: 'var(--mk-accent)' }}>What the exam is</a>
                <a href="#prepare-each-part" className="pl-3 border-l-2 mk-link" style={{ borderColor: 'var(--mk-hairline)', color: 'var(--mk-ink-muted)' }}>Prepare each part</a>
                <a href="#what-french-coach-does" className="pl-3 border-l-2 mk-link" style={{ borderColor: 'var(--mk-hairline)', color: 'var(--mk-ink-muted)' }}>What French Coach does</a>
              </div>
            </div>
            <div className="rounded-xl border mk-hairline p-5">
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--mk-ink-faint)' }}>
                The paper at a glance
              </p>
              <div className="flex flex-col gap-2 text-sm">
                {AT_A_GLANCE.map((row) => (
                  <div key={row.label} className="flex justify-between">
                    <span style={{ color: 'var(--mk-ink-muted)' }}>{row.label}</span>
                    <span className="font-semibold">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Section>
    </MarketingLayout>
  );
}
