import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ROUTES } from '../../../config/routes';
import { getPageSeo } from '../../../config/publicContentSeo';
import { PUBLIC_CONTENT_HUB_PATHS, PUBLIC_CONTENT_PAGE_PATHS, ROLEPLAY_HUB_PATH, TOPICS_HUB_PATH } from '../../../data/seo/paths';
import { TOPIC_PAGES } from '../../../data/seo/topics';
import { ROLE_PLAY_EXAMPLES } from '../../../data/seo/rolePlays';
import { publicContentElement } from '../registry';
import { TopicPageView } from '../TopicPageView';
import { RolePlayExampleView } from '../RolePlayExampleView';
import { MARKING_PATH, MISTAKES_PATH } from '../../../data/seo/paths';
import { COMMUNICATION, QUALITY_OF_LANGUAGE, ROLE_PLAY, TOTAL_MARKS } from '../../../domain/igcse/rubric';

// The pages the prerender step writes to disk, rendered the same way it does.

const ALL_PATHS = [...PUBLIC_CONTENT_HUB_PATHS, ...PUBLIC_CONTENT_PAGE_PATHS];

const render = (path: string): string => {
  const element = publicContentElement(path);
  if (!element) throw new Error(`no page for ${path}`);
  return renderToStaticMarkup(element);
};

const decode = (s: string) =>
  s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

const textOf = (markup: string) => decode(markup.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));

describe('public content pages (static prerender output)', () => {
  it('renders a page for every path in routes.ts, and nothing for any other path', () => {
    for (const p of ALL_PATHS) expect(publicContentElement(p), p).toBeDefined();
    expect(publicContentElement('/igcse-french-speaking/topics/no-such-topic')).toBeUndefined();
    expect(publicContentElement('/igcse-french-speaking')).toBeUndefined();
    const generated = ROUTES.filter((r) => r.kind === 'generated').map((r) => r.path);
    expect(generated.sort()).toEqual([...PUBLIC_CONTENT_PAGE_PATHS].sort());
  });

  describe.each(ALL_PATHS.map((p) => [p] as const))('%s', (path) => {
    const markup = render(path);

    it('has exactly one <h1> and never skips a heading level', () => {
      expect((markup.match(/<h1[\s>]/g) ?? []).length).toBe(1);
      const levels = [...markup.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
      expect(levels[0]).toBe(1);
      let maxSeen = levels[0];
      for (const level of levels.slice(1)) {
        expect(level).toBeLessThanOrEqual(maxSeen + 1);
        maxSeen = Math.max(maxSeen, level);
      }
    });

    it('is fully visible without JavaScript and ships a free-start call to action', () => {
      expect(markup).not.toMatch(/opacity:\s*0(?!\.\d)/);
      expect(markup).toContain('Start practising free');
    });

    it('only links to pages that exist', () => {
      const known = new Set(ROUTES.filter((r) => r.kind !== 'dynamic' && r.kind !== 'dev-only').map((r) => r.path));
      const hrefs = [...markup.matchAll(/href="(\/[^"#?]*)/g)].map((m) => decode(m[1]));
      expect(hrefs.length).toBeGreaterThan(5);
      for (const href of hrefs) expect(known.has(href), `${path} links to ${href}`).toBe(true);
    });

    it('has a visible breadcrumb that matches its BreadcrumbList data', () => {
      const crumbs = getPageSeo(path)!.jsonLd!.find((b) => b['@type'] === 'BreadcrumbList') as unknown as {
        itemListElement: { name: string }[];
      };
      const nav = markup.match(/<nav aria-label="Breadcrumb"[\s\S]*?<\/nav>/)?.[0] ?? '';
      expect(nav, 'a visible breadcrumb').not.toBe('');
      for (const item of crumbs.itemListElement) expect(textOf(nav), item.name).toContain(item.name);
    });
  });

  describe('topic pages', () => {
    it.each(TOPIC_PAGES.map((t) => [t.slug, t] as const))('%s: shows every question, answer, highlight and vocabulary item', (_s, t) => {
      const text = textOf(renderToStaticMarkup(<TopicPageView slug={t.slug} />));
      for (const a of t.answers) {
        expect(text).toContain(a.question);
        expect(text).toContain(a.answer);
        for (const h of a.highlights) expect(text).toContain(h.fr);
      }
      for (const v of t.vocab) expect(text).toContain(v.en);
      for (const q of t.moreQuestions) expect(text).toContain(q);
    });

    it('marks every French answer and question as French (lang="fr")', () => {
      const markup = renderToStaticMarkup(<TopicPageView slug="school" />);
      expect((markup.match(/lang="fr"/g) ?? []).length).toBeGreaterThanOrEqual(4 * 2 + 4);
    });

    it('builds FAQ data only from questions and answers the page shows', () => {
      for (const t of TOPIC_PAGES) {
        const text = textOf(renderToStaticMarkup(<TopicPageView slug={t.slug} />));
        const faq = getPageSeo(`/igcse-french-speaking/topics/${t.slug}`)!.jsonLd!.find((b) => b['@type'] === 'FAQPage') as unknown as {
          mainEntity: { name: string; acceptedAnswer: { text: string } }[];
        };
        expect(faq.mainEntity).toHaveLength(4);
        for (const q of faq.mainEntity) {
          expect(text).toContain(q.name);
          expect(text).toContain(q.acceptedAnswer.text);
        }
      }
    });

    it('answers an unknown slug with a not-found page that links back to the topics', () => {
      const markup = renderToStaticMarkup(<TopicPageView slug="nope" />);
      expect(markup).toContain('Topic not found');
      expect(markup).toContain('href="/igcse-french-speaking/topics"');
    });
  });

  describe('role-play example pages', () => {
    it.each(ROLE_PLAY_EXAMPLES.map((r) => [r.slug, r] as const))('%s: shows every examiner line, instruction and model reply', (_s, r) => {
      const text = textOf(renderToStaticMarkup(<RolePlayExampleView slug={r.slug} />));
      for (const t of r.tasks) {
        expect(text).toContain(t.answer);
        expect(text).toContain(t.note);
      }
      expect(text).toContain('The examiner says');
      expect(text).toContain('What you need to do');
    });

    it('answers an unknown slug with a not-found page', () => {
      expect(renderToStaticMarkup(<RolePlayExampleView slug="nope" />)).toContain('Role play not found');
    });
  });

  describe('the marking and common-mistakes pages', () => {
    const marking = textOf(render(MARKING_PATH));
    const mistakes = textOf(render(MISTAKES_PATH));

    it('state the marks from the sourced rubric, and nothing the notes do not give', () => {
      expect(marking).toContain(`${TOTAL_MARKS} marks`);
      expect(marking).toContain(`${ROLE_PLAY.tasks} tasks, ${ROLE_PLAY.marksPerResponse} marks each`);
      expect(marking).toContain(`(${COMMUNICATION.maxMarks} marks)`);
      expect(marking).toContain(`(${QUALITY_OF_LANGUAGE.maxMarks} marks)`);
      // The paper's share of the qualification is unsourced (domain/igcse/unsourced.ts).
      expect(marking).not.toMatch(/25\s?%|per ?cent of the (qualification|grade)/i);
    });

    it('never quote a Cambridge descriptor line', () => {
      const descriptors = [
        ...COMMUNICATION.bands.flatMap((b) => b.descriptor),
        ...QUALITY_OF_LANGUAGE.bands.flatMap((b) => b.descriptor),
        ...ROLE_PLAY.marks.flatMap((m) => m.descriptor),
      ];
      for (const line of descriptors) {
        const needle = line.replace(/[.;]$/, '').toLowerCase();
        if (needle.length < 25) continue;
        expect(marking.toLowerCase(), line).not.toContain(needle);
        expect(mistakes.toLowerCase(), line).not.toContain(needle);
      }
    });

    it('link to each other and to the topic pages for examples', () => {
      expect(render(MARKING_PATH)).toContain(`href="${MISTAKES_PATH}"`);
      expect(render(MISTAKES_PATH)).toContain(`href="${MARKING_PATH}"`);
      expect(render(MISTAKES_PATH)).toMatch(/href="\/igcse-french-speaking\/topics\/[a-z-]+"/);
    });

    it('are linked from the exam guide, both hubs and the shared footer', () => {
      for (const path of [TOPICS_HUB_PATH, ROLEPLAY_HUB_PATH]) {
        const html = render(path);
        expect(html, path).toContain(`href="${MARKING_PATH}"`);
        expect(html, path).toContain(`href="${MISTAKES_PATH}"`);
      }
    });
  });

  it('does not advertise hidden or unbuilt features, and makes no marking promises', () => {
    const banned = [
      /Leagues?\b/, /Daily Challenge/, /Study Groups/, /Boss Battle/, /Speaking Arena/, /Rapid Fire/,
      /Word Drop/, /Speed Speaking/, /Whisper/,
      /predicts? your grade/i, /guarantee/i, /exactly like (the )?cambridge/i, /official (cambridge )?(mark|grade|score)/i,
    ];
    for (const p of ALL_PATHS) {
      const text = textOf(render(p));
      for (const re of banned) expect(text, `${p} matches ${re}`).not.toMatch(re);
    }
  });
});
