import { MarketingLayout } from '../../components/layout/MarketingLayout';
import { getPublicContentSeo } from '../../config/publicContentSeo';
import { ROLE_PLAY } from '../../domain/igcse/rubric';
import { ROLEPLAY_CARDS } from '../../data/roleplayCards';
import { getRolePlayExample } from '../../data/seo/rolePlays';
import type { RolePlayExample } from '../../data/seo/types';
import { IGCSE_PATH, ROLEPLAY_HUB_PATH, TOPICS_HUB_PATH, rolePlayPath } from '../../data/seo/paths';
import { Eyebrow, Fr, LinkCard, PracticePanel } from './parts';
import { FAINT, MUTED } from './styles';

/** One role-play example: the card's examiner lines and task instructions, with a model reply to each task. */
export function RolePlayExampleView({ slug }: { slug: string }) {
  const example: RolePlayExample | undefined = getRolePlayExample(slug);
  const card = example ? ROLEPLAY_CARDS.find((c) => c.id === example.cardId) : undefined;
  if (!example || !card) return <RolePlayNotFound />;

  const path = rolePlayPath(example.slug);
  const related = example.related
    .map((s) => getRolePlayExample(s))
    .filter((r): r is RolePlayExample => r !== undefined);

  return (
    <MarketingLayout
      route={path}
      seo={getPublicContentSeo(path)}
      breadcrumb={[
        { label: 'Home', href: '/' },
        { label: 'IGCSE French Speaking Exam', href: IGCSE_PATH },
        { label: 'Role-play examples', href: ROLEPLAY_HUB_PATH },
        { label: example.title },
      ]}
    >
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-10 md:py-14 space-y-14">
        <header>
          <Eyebrow>IGCSE French role play</Eyebrow>
          <h1 className="font-display text-4xl md:text-5xl leading-tight mb-4">
            {example.title}: French role play example
          </h1>
          <p className="text-lg leading-relaxed mb-5" style={MUTED}>
            {example.intro}
          </p>
          <div className="rounded-xl border mk-hairline p-5 text-sm leading-relaxed" style={{ background: 'var(--mk-surface)' }}>
            <p className="font-semibold mb-1" style={FAINT}>
              The situation
            </p>
            <p>{card.setting}</p>
          </div>
        </header>

        <section id="tasks">
          <h2 className="font-display text-2xl mb-3">The {card.tasks.length} tasks, with model replies</h2>
          <p className="text-base leading-relaxed mb-6" style={MUTED}>
            Cover the model reply and say your own answer out loud, then compare. Each task is worth up to{' '}
            {ROLE_PLAY.marksPerResponse} marks, for communicating what the task asks completely and correctly.
          </p>
          <ol className="flex flex-col gap-6">
            {card.tasks.map((task) => {
              const model = example.tasks.find((t) => t.taskId === task.task_id);
              if (!model) return null;
              return (
                <li key={task.task_id} className="rounded-2xl border mk-hairline p-6" style={{ background: 'var(--mk-surface)' }}>
                  <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--mk-accent)' }}>
                    Task {task.task_id}
                  </h3>
                  <p className="text-sm font-semibold mb-1" style={FAINT}>
                    The examiner says
                  </p>
                  <Fr as="p" className="text-lg leading-snug mb-4">
                    « {task.prompt_fr} »
                  </Fr>
                  <p className="text-sm font-semibold mb-1" style={FAINT}>
                    What you need to do
                  </p>
                  <p className="text-base mb-4" style={MUTED}>
                    {task.prompt_en}
                  </p>
                  <p className="text-sm font-semibold mb-1" style={FAINT}>
                    Model reply
                  </p>
                  <Fr as="p" className="text-base leading-relaxed mb-3 font-semibold">
                    {model.answer}
                  </Fr>
                  <p className="text-sm leading-relaxed" style={MUTED}>
                    {model.note}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>

        <section id="phrases">
          <h2 className="font-display text-2xl mb-4">Phrases to reuse</h2>
          <p className="text-base leading-relaxed mb-4" style={MUTED}>
            These work in almost any role play, whatever the setting.
          </p>
          <dl className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
            {example.phrases.map((p) => (
              <div key={p.fr} className="flex justify-between gap-4 border-b mk-hairline pb-2.5 text-sm">
                <dt>
                  <Fr className="font-semibold">{p.fr}</Fr>
                </dt>
                <dd style={MUTED}>{p.en}</dd>
              </div>
            ))}
          </dl>
        </section>

        <PracticePanel
          heading="Practise this role play out loud"
          body="Speak your replies and get feedback on each one. Free to start, no card needed."
          button="Start practising free"
          cta="roleplay_example_start"
        />

        <section>
          <h2 className="font-display text-2xl mb-4">Keep going</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {related.map((r) => (
              <LinkCard key={r.slug} href={rolePlayPath(r.slug)} title={r.title} sub="Role-play example" />
            ))}
            <LinkCard href={ROLEPLAY_HUB_PATH} title="All role-play examples" sub="Six practice role plays" />
            <LinkCard href={TOPICS_HUB_PATH} title="Topics and model answers" sub="Prepare the topic conversations" />
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}

function RolePlayNotFound() {
  return (
    <MarketingLayout route="/404">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-20 text-center">
        <h1 className="font-display text-3xl mb-4">Role play not found</h1>
        <p className="text-base leading-relaxed mb-6" style={MUTED}>
          There is no role-play example at that address. Every example is listed on the{' '}
          <a href={ROLEPLAY_HUB_PATH} className="mk-link">
            role-play examples page
          </a>
          .
        </p>
      </div>
    </MarketingLayout>
  );
}
