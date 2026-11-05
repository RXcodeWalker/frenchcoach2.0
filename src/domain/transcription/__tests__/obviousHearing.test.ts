import { describe, expect, it } from 'vitest';
import { markSpokenText } from '../../igcse/stt/project/spokenText';
import { resolveObviousHearings } from '../obviousHearing';

const HEARD =
  "Un professeur que j'admire, c'est mon professeur de sciences. Il est très passionnant quand il donne des leçons. En plus, il toujours m'encourage à étudier et à travailler dur. Enfin, grâce à lui, j'ai obtenu de bonnes notes dans sa matière.";

const OTHER_WAY = HEARD
  .replace("m'encourage", 'mon courage')
  .replace('obtenu de bonnes', 'obtenu des bonnes');

describe('resolveObviousHearings — the sentence settles it', () => {
  it('does not ask about m\'encourage / mon courage or de / des when the sentence fits only one', () => {
    const resolved = resolveObviousHearings(HEARD, OTHER_WAY);
    expect(resolved.spans).toEqual([]);
    expect(resolved.primaryText).toContain("m'encourage");
    expect(resolved.primaryText).toContain('de bonnes notes');
    expect(resolved.primaryText).not.toContain('mon courage');
    expect(resolved.primaryText).not.toContain('des bonnes');
  });

  it('takes the reading that fits even when it was the other recogniser', () => {
    const resolved = resolveObviousHearings(OTHER_WAY, HEARD);
    expect(resolved.spans).toEqual([]);
    expect(resolved.primaryText).toContain("m'encourage à étudier");
    expect(resolved.primaryText).toContain('de bonnes notes');
  });

  it('keeps a real disagreement in the same answer, and its place, after a shorter reading is filled in', () => {
    const primary = 'Il mon courage à étudier et il mange du poisson.';
    const secondary = "Il m'encourage à étudier et il mange du poison.";
    const resolved = resolveObviousHearings(primary, secondary);
    expect(resolved.primaryText).toBe("Il m'encourage à étudier et il mange du poisson.");
    expect(resolved.spans.map((s) => [s.kind, s.primaryWords, s.secondaryWords])).toEqual([
      ['different', 'poisson.', 'poison'],
    ]);
  });

  it('hears « de très bonnes notes » as de, and « des notes » after a verb as des', () => {
    expect(resolveObviousHearings("j'ai de très bonnes notes", "j'ai des très bonnes notes").spans).toEqual([]);
    expect(resolveObviousHearings("j'ai de très bonnes notes", "j'ai des très bonnes notes").primaryText).toContain('de très bonnes');

    const notes = resolveObviousHearings("j'ai obtenu des notes", "j'ai obtenu de notes");
    expect(notes.spans).toEqual([]);
    expect(notes.primaryText).toContain('des notes');
  });

  it('uses de after pas, and does not rewrite « de sciences » after a noun', () => {
    const negated = resolveObviousHearings("je n'ai pas de devoirs", "je n'ai pas des devoirs");
    expect(negated.spans).toEqual([]);
    expect(negated.primaryText).toContain('pas de devoirs');

    const subject = resolveObviousHearings('mon professeur de sciences', 'mon professeur des sciences');
    expect(subject.spans.map((s) => s.primaryWords)).toEqual(['de']);
  });

  it('resolves the same nasal split for emmener, and the noun when the noun is the one that fits', () => {
    expect(resolveObviousHearings("il m'emmène à l'école", 'il mon mène à l\'école').spans).toEqual([]);
    const noun = resolveObviousHearings("c'est mon courage", "c'est m'encourage");
    expect(noun.spans).toEqual([]);
    expect(noun.primaryText).toBe("c'est mon courage");
  });

  it('resolves me/mes, ce/ces and le/les only when the next word shows which one', () => {
    expect(resolveObviousHearings('il me parle souvent', 'il mes parle souvent').spans).toEqual([]);
    expect(resolveObviousHearings('il me parle souvent', 'il mes parle souvent').primaryText).toContain('me parle');
    expect(resolveObviousHearings('avec mes amis', 'avec me amis').primaryText).toContain('mes amis');
    expect(resolveObviousHearings('ce sont mes notes', 'ce sont me notes').primaryText).toContain('mes notes');
    expect(resolveObviousHearings('sur tes notes', 'sur te notes').primaryText).toContain('tes notes');
    expect(resolveObviousHearings('tu te notes', 'tu tes notes').spans).toHaveLength(1);

    expect(resolveObviousHearings('ce bon professeur', 'ces bon professeur').primaryText).toContain('ce bon');
    expect(resolveObviousHearings('ces bonnes notes', 'ce bonnes notes').primaryText).toContain('ces bonnes');
    expect(resolveObviousHearings('le petit chat', 'les petit chat').primaryText).toContain('le petit');
    expect(resolveObviousHearings('les petites notes', 'le petites notes').primaryText).toContain('les petites');
  });
});

describe('resolveObviousHearings — still a conflict', () => {
  it('still asks when either reading could be what was said', () => {
    const ont = resolveObviousHearings('Ils ont un chien', 'ils sont en chien');
    expect(ont.spans.map((s) => s.primaryWords)).toEqual(['ont un']);

    const poison = resolveObviousHearings('Je mange du poisson', 'je mange du poison');
    expect(poison.spans.map((s) => [s.primaryWords, s.secondaryWords])).toEqual([['poisson', 'poison']]);

    const article = resolveObviousHearings('Il a un chat', 'il a en chat');
    expect(article.spans.map((s) => s.primaryWords)).toEqual(['un']);
  });

  it('leaves le / les alone before a vowel, where the real form is l\'', () => {
    const resolved = resolveObviousHearings('le ami', 'les ami');
    expect(resolved.spans).toHaveLength(1);
  });
});

describe('resolveObviousHearings — exam marks are untouched', () => {
  it('still reports the disagreement to the marker', () => {
    const marked = markSpokenText(HEARD, OTHER_WAY);
    const heard = marked.spans.map((s) => s.heard);
    expect(heard.some((w) => w.includes('encourage') || w.includes('courage'))).toBe(true);
    expect(heard.some((w) => w === 'de' || w === 'des')).toBe(true);
  });
});
