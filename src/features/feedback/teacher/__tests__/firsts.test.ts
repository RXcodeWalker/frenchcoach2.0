import { describe, expect, it } from 'vitest';
import { claimMentionsMarkOrBand } from '../../../../domain/examFeedback/shared/markClaimFilter';
import { TEACHER_FRAMING } from '../buildTeacherScript';
import { FIRST_IDS, LONG_ANSWER_WORDS, detectFirsts } from '../firsts';

const SHORT = 'Je joue au foot.';
const PAST = "Hier j'ai mangé une pizza.";
const FUTURE = 'Demain je vais jouer au foot.';
const TWO_REASONS = "J'aime le sport parce que c'est drôle et parce que je vois mes amis.";
const LONG = `${'Je joue au foot avec mes amis '.repeat(8)}.`;
const history = [SHORT, 'Je suis content.'];

describe('detectFirsts — a first is only claimed when it can be proven', () => {
  it('fires a genuinely new milestone', () => {
    expect(detectFirsts(PAST, history, [])).toEqual(['past']);
    expect(detectFirsts(FUTURE, history, [])).toEqual(['future']);
    expect(detectFirsts(TWO_REASONS, history, [])).toEqual(['two-reasons']);
    expect(detectFirsts(LONG, history, [])).toEqual(['long-answer']);
  });

  it('an existing user whose history already has the milestone gets no line', () => {
    expect(detectFirsts(PAST, [...history, "L'année dernière nous sommes allés à Paris."], [])).toEqual([]);
    expect(detectFirsts(LONG, [...history, LONG], [])).toEqual([]);
    expect(detectFirsts(TWO_REASONS, [...history, "Je l'aime car c'est utile, puisque je travaille."], [])).toEqual([]);
  });

  it('says each first once ever: never again once it is in firstsSeen', () => {
    expect(detectFirsts(PAST, history, ['past'])).toEqual([]);
    expect(detectFirsts(`${PAST} Demain je vais jouer.`, history, ['past'])).toEqual(['future']);
  });

  it('with no stored history there is nothing to check against, so nothing fires', () => {
    expect(detectFirsts(PAST, [], [])).toEqual([]);
    expect(detectFirsts(LONG, ['', '   '], [])).toEqual([]);
  });

  it('nothing fires when the answer does not do it', () => {
    expect(detectFirsts(SHORT, history, [])).toEqual([]);
  });

  it('a long answer means more than 40 words, exactly', () => {
    const words = (n: number) => Array.from({ length: n }, () => 'mot').join(' ');
    expect(detectFirsts(words(LONG_ANSWER_WORDS), history, [])).toEqual([]);
    expect(detectFirsts(words(LONG_ANSWER_WORDS + 1), history, [])).toEqual(['long-answer']);
  });

  it('one reason is not two reasons', () => {
    expect(detectFirsts("J'aime le sport parce que c'est drôle.", history, [])).toEqual([]);
  });

  it('"anglais" and "informations" are never a tense (the conditional is left out, and the old false matches are gone)', () => {
    expect(detectFirsts("J'étudie l'anglais et les informations.", history, [])).toEqual([]);
  });

  it('can fire several at once, in a fixed order', () => {
    const answer = `${LONG} Hier j'ai mangé une pizza parce que j'avais faim et parce que c'était bon. Demain je vais manger encore.`;
    expect(detectFirsts(answer, history, [])).toEqual(['long-answer', 'two-reasons', 'past', 'future']);
  });

  it('every milestone has wording in both registers, none of it a mark, band or grade, and no confetti', () => {
    for (const register of ['coach', 'examiner'] as const) {
      for (const id of FIRST_IDS) {
        const text = TEACHER_FRAMING[register].firsts[id];
        expect(claimMentionsMarkOrBand(text)).toBe(false);
        expect(text).not.toMatch(/!|🎉|xp|congrat|amazing/i);
      }
    }
  });
});
