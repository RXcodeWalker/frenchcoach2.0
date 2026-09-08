import type { ReactNode } from 'react';
import { MarketingLayout } from '../components/layout/MarketingLayout';
import { Reveal } from '../components/marketing/Reveal';
import { CtaButton } from '../components/marketing/CtaButton';
import { enterGuestMode } from '../hooks/useGuestMode';

// Long-form founder narrative, linked from landing/Founder.tsx and the footer.
// Public marketing page — MarketingLayout gives it the `.marketing` editorial
// token scope, the SSR-safe shell, and its own <Seo route="/story">. The
// CSS-only <Reveal> (immediate on the hero, scroll-triggered everywhere else)
// is the whole animation budget here, matching the rest of the marketing tree.
// Reading measure is deliberately tighter than the landing page — 760px for
// the framing sections, 640px for the article body.

function startPractisingFree() {
  enterGuestMode();
  window.location.assign('/');
}

const BREADCRUMB = [
  { label: 'Home', href: '/' },
  { label: 'Story' },
];

const STATS = [
  { value: '97%', label: 'IGCSE French, A*' },
  { value: 'A2 · B1', label: 'DELF, with distinction' },
  { value: '60s', label: 'avg. speaking time / class' },
  { value: 'B2', label: 'DELF target, next' },
];

function Chapter({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Reveal>
      <div className="mb-14">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3.5"
          style={{ color: 'var(--mk-accent)' }}
        >
          {eyebrow}
        </p>
        <h2 className="font-display text-2xl md:text-[32px] leading-snug mb-4">{title}</h2>
        <div className="space-y-4 text-[17px] leading-[1.75]" style={{ color: 'var(--mk-ink-muted)' }}>
          {children}
        </div>
      </div>
    </Reveal>
  );
}

function PullQuote({ children }: { children: ReactNode }) {
  return (
    <Reveal>
      <p className="font-display italic text-2xl md:text-3xl leading-[1.5] text-center my-14">
        {children}
      </p>
    </Reveal>
  );
}

export function Story() {
  return (
    <MarketingLayout route="/story" breadcrumb={BREADCRUMB}>
      {/* Hero */}
      <Reveal immediate className="block max-w-[760px] mx-auto px-4 md:px-6 pt-14 md:pt-20 pb-12">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-6"
          style={{ color: 'var(--mk-accent)' }}
        >
          The story behind Français AI
        </p>
        <h1 className="font-display text-4xl md:text-6xl leading-[1.12] mb-7">
          I didn&rsquo;t set out to build an app.
          <br />
          <span style={{ color: 'var(--mk-accent)' }}>I was just tired of staying quiet.</span>
        </h1>
        <p
          className="text-lg md:text-xl leading-relaxed max-w-xl mb-8"
          style={{ color: 'var(--mk-ink-muted)' }}
        >
          Ten years of French class taught me plenty about grammar. It never once taught me how to
          speak. This is the story of the gap between the two — and how it became Français AI.
        </p>
        <div
          className="flex items-center flex-wrap gap-3 text-sm"
          style={{ color: 'var(--mk-ink-faint)' }}
        >
          <span
            className="w-9 h-9 rounded-full flex items-center justify-center font-display text-sm shrink-0"
            style={{ background: 'var(--mk-accent-soft)', color: 'var(--mk-accent)' }}
          >
            OJ
          </span>
          <span className="font-semibold" style={{ color: 'var(--mk-ink)' }}>
            Om Jhamvar
          </span>
          <span>Founder, Français AI</span>
          <span aria-hidden="true">·</span>
          <span>8 min read</span>
        </div>
      </Reveal>

      {/* Stat strip */}
      <section className="border-t mk-hairline">
        <div className="max-w-[760px] mx-auto px-4 md:px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="font-display text-3xl">{s.value}</div>
              <div className="text-xs mt-1.5 leading-tight" style={{ color: 'var(--mk-ink-faint)' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Article */}
      <article className="border-t mk-hairline">
        <div className="max-w-[640px] mx-auto px-4 md:px-6 py-16 md:py-20">
          <Chapter eyebrow="01 — Thrown in" title="The deep end, at seven years old">
            <p>
              <span
                className="float-left font-display leading-[0.8] pr-2.5 pt-1.5"
                style={{ fontSize: '58px', color: 'var(--mk-accent)' }}
              >
                W
              </span>
              hen I was five, my parents signed me up for French classes once or twice a week — a
              fun after-school thing that didn&rsquo;t prepare me for what came next. At seven, I
              moved to a bilingual school where half the day ran in English and half entirely in
              French. I was suddenly learning math and science in a language I barely knew.
            </p>
            <p>
              It was terrifying. Everyone else seemed to be chatting effortlessly while I could
              barely string a few words together. But because I had to use the language constantly —
              to think, not just to recite — pronunciation became second nature. I wasn&rsquo;t
              memorising vocabulary lists; I was using French to solve problems and talk to friends.
            </p>
            <p>
              By the end of that first year, my teacher stopped mid-lesson to tell me I had the
              accent of a native speaker. My second-grade self was thrilled.
            </p>
          </Chapter>

          <Chapter
            eyebrow="02 — Back in the box"
            title="From a living language to a subject on a timetable"
          >
            <p>
              In Grade 3 I moved to a standard English-medium school, and French got shoved into a
              completely different box. It became just another subject. The vibrant, living language
              I&rsquo;d grown up speaking was replaced by grammar grids, comprehension worksheets,
              and writing drills — hours dissecting text, almost none of it spent actually talking.
            </p>
            <p>
              For years I accepted that this was just how language classes worked. Then Grade 10
              happened.
            </p>
          </Chapter>

          <Chapter
            eyebrow="03 — The arithmetic of silence"
            title="Smart kids, frozen by a simple question"
          >
            <p>
              I looked around at classmates who&rsquo;d studied French for years — genuinely smart
              kids. Yet the moment a teacher asked a question that needed an on-the-spot spoken
              answer, the room went dead silent.
            </p>
            <p>
              Do the math on a normal classroom: twenty-five or thirty students, one teacher, two
              lessons a week. Each student gets maybe sixty seconds of actual speaking time per
              class. No teacher, however good, can give everyone personalised feedback on their
              accent or sentence structure at that rate. So speaking becomes terrifying — students
              translate in their heads, fear the mistake, and stay quiet.
            </p>
          </Chapter>

          <PullQuote>
            &ldquo;Students don&rsquo;t struggle because they don&rsquo;t know French. They struggle
            because they never get to <span style={{ color: 'var(--mk-accent)' }}>speak it.</span>&rdquo;
          </PullQuote>

          <Chapter
            eyebrow="04 — Outside the tourist bubble"
            title="A summer in France, no Google Translate"
          >
            <p>
              Between eighth and ninth grade I travelled to France. Outside the typical tourist
              areas, many locals didn&rsquo;t speak much English — so I talked. I ordered meals at
              small bistros, asked for directions, chatted with strangers entirely in French, no app
              in hand.
            </p>
            <p>
              People were genuinely surprised, and it was the confirmation I needed: language
              doesn&rsquo;t exist to pass exams or fill worksheets. It exists to connect with people.
            </p>
          </Chapter>

          <Chapter
            eyebrow="05 — Trying everything else"
            title="Great for habits. Nothing for speaking."
          >
            <p>
              Even after scoring 97% (A*) in IGCSE French and earning distinctions in DELF A2 and
              B1, I felt the gap the moment I got back to school. Now prepping for IBDP French B
              orals and eyeing DELF B2, I went looking for something better and tried the popular
              apps — Duolingo, Babbel, the newer AI chat tools.
            </p>
            <p>
              They&rsquo;re genuinely good at building a habit and teaching vocabulary. But on
              speaking, they left me hanging — quizzes and pre-recorded phrases that tell you
              &ldquo;correct&rdquo; or &ldquo;incorrect&rdquo; and never answer the question you
              actually have. Even AI chat apps that felt conversational offered nothing toward the
              frameworks a real oral exam demands.
            </p>
          </Chapter>

          <Chapter
            eyebrow="06 — What's actually different"
            title="It's not that it talks back. It's that it remembers."
          >
            <p>
              Most language tools treat every session like you&rsquo;re a stranger: open the app, do
              an exercise, close it, forgotten. Français AI is built to remember you the way a real
              tutor would — tracking recurring pronunciation habits, the grammar slips you repeat
              when you&rsquo;re tired, the vocabulary gaps that keep resurfacing.
            </p>
            <div className="rounded-2xl border mk-hairline mk-surface p-6 my-2">
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-3"
                style={{ color: 'var(--mk-ink-faint)' }}
              >
                A typical tool says
              </p>
              <p className="italic mb-4" style={{ color: 'var(--mk-ink-muted)' }}>
                &ldquo;Wrong tense.&rdquo;
              </p>
              <div className="h-px mb-4" style={{ background: 'var(--mk-hairline)' }} />
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-3"
                style={{ color: 'var(--mk-accent)' }}
              >
                Français AI says
              </p>
              <p className="leading-relaxed" style={{ color: 'var(--mk-ink)' }}>
                &ldquo;Your use of the subjunctive is getting much more natural — but you&rsquo;re
                still dropping the liaison in <em>rendez-vous</em> and <em>les amis</em>. Let&rsquo;s
                practice three sentences to lock that in.&rdquo;
              </p>
            </div>
            <p>
              Two things matter most: conversation that adapts to your actual level and exam goals,
              whether that&rsquo;s a formal DELF presentation or a roleplay ordering food under
              pressure — and memory that carries forward, so a rough Tuesday with past-tense
              agreement quietly resurfaces in Friday&rsquo;s review.
            </p>
          </Chapter>

          <Chapter
            eyebrow="07 — Who this is for"
            title="Not for a grade. For the version of me who wanted a turn to speak."
          >
            <p>
              I&rsquo;m not building this only to help students chase a perfect score. Exams are
              milestones, not the point. I&rsquo;m building it for the student who only gets French
              twice a week, who has no native speaker at home, who can&rsquo;t afford a private
              tutor — the version of me who just wanted more chances to speak without feeling judged.
            </p>
            <p>
              What made me comfortable speaking French all those years ago wasn&rsquo;t memorising
              more words on a page. It was being forced to use the language — to make mistakes, and
              to talk to real people. Français AI is my attempt to give that same experience to
              every learner, anywhere.
            </p>
          </Chapter>
        </div>
      </article>

      {/* Closing */}
      <section className="border-t mk-hairline">
        <Reveal className="block max-w-[700px] mx-auto px-4 md:px-6 py-20 md:py-24 text-center">
          <p className="font-display text-3xl md:text-4xl leading-[1.35] mb-9">
            Language isn&rsquo;t a puzzle to solve on paper.
            <br />
            <span style={{ color: 'var(--mk-accent)' }}>It&rsquo;s a bridge to connect with people.</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
            <CtaButton onClick={startPractisingFree}>Start practising free</CtaButton>
            <CtaButton href="/" variant="secondary">
              Back to Français AI
            </CtaButton>
          </div>
          <p className="text-xs" style={{ color: 'var(--mk-ink-faint)' }}>
            No account, no card. Your first session takes twelve minutes.
          </p>
        </Reveal>
      </section>
    </MarketingLayout>
  );
}
