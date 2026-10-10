import { describe, it, expect } from 'vitest';
import { MIN_UNITS_PER_SECOND, TOTAL_CAP_MS, planReveal, revealAt, typedPrefix, typingUnits } from '../typing';
import { markQuotes } from '../markQuotes';
import { tryItHint } from '../tryItHint';

describe('typingUnits', () => {
  it('types characters one by one but a « quote » as a single unit', () => {
    const units = typingUnits("You said « j'ai allé » there.");
    expect(units).toContain("« j'ai allé »");
    expect(units.filter((u) => u.length > 1)).toEqual(["« j'ai allé »"]);
    expect(units.join('')).toBe("You said « j'ai allé » there.");
  });

  it('never splits a quote when the prefix stops inside it', () => {
    const text = 'Say « je suis allé » now';
    const before = typedPrefix(text, 'Say '.length);
    const after = typedPrefix(text, 'Say '.length + 1);
    expect(before).toBe('Say ');
    expect(after).toBe('Say « je suis allé »');
  });

  it('treats an unclosed « as ordinary text', () => {
    expect(typingUnits('a « b').length).toBe(5);
  });

  it('does not split an astral character', () => {
    expect(typingUnits('a😀b')).toEqual(['a', '😀', 'b']);
  });
});

describe('planReveal / revealAt', () => {
  it('finishes within the cap however much there is to type', () => {
    const plan = planReveal([0, 300, 0, 400, 0, 250, 0]);
    expect(plan.totalMs).toBeLessThanOrEqual(TOTAL_CAP_MS + 1);
    expect(revealAt(plan, plan.totalMs).done).toBe(true);
  });

  it('types a short script at a natural pace rather than stretching to the cap', () => {
    const plan = planReveal([0, 40]);
    expect(plan.unitsPerSecond).toBe(MIN_UNITS_PER_SECOND);
    expect(plan.totalMs).toBeLessThan(TOTAL_CAP_MS / 2);
  });

  it('shows the first line at once, then each line in order', () => {
    const plan = planReveal([0, 100, 0]);
    expect(revealAt(plan, 0)).toEqual({ visible: 1, units: 0, done: false });
    const mid = revealAt(plan, plan.startsAt[1] + 500);
    expect(mid.visible).toBe(2);
    expect(mid.units).toBeGreaterThan(0);
    expect(mid.units).toBeLessThan(100);
    const last = revealAt(plan, plan.startsAt[2] + 1);
    expect(last.visible).toBe(3);
  });

  it('is done immediately with nothing to show, and at Infinity', () => {
    expect(revealAt(planReveal([]), 0).done).toBe(true);
    expect(revealAt(planReveal([0, 50]), Number.POSITIVE_INFINITY).done).toBe(true);
  });
});

describe('markQuotes', () => {
  const answer = "Hier j'ai allé au cinéma avec mon amie parce que c'est drôle.";

  it('marks the quote and the segments rebuild the transcript exactly', () => {
    const segs = markQuotes(answer, ["j'ai allé"]);
    expect(segs.filter((s) => s.marked).map((s) => s.text)).toEqual(["j'ai allé"]);
    expect(segs.map((s) => s.text).join('')).toBe(answer);
  });

  it('matches regardless of case and apostrophe style', () => {
    const segs = markQuotes(answer, ['J’AI ALLÉ']);
    expect(segs.filter((s) => s.marked).map((s) => s.text)).toEqual(["j'ai allé"]);
  });

  it('leaves an unfound quote unmarked and merges overlapping ones', () => {
    expect(markQuotes(answer, ['pas dans la réponse'])).toEqual([{ text: answer, marked: false }]);
    const merged = markQuotes(answer, ["j'ai allé au", 'allé au cinéma']);
    expect(merged.filter((s) => s.marked).map((s) => s.text)).toEqual(["j'ai allé au cinéma"]);
  });

  it('returns nothing for an empty transcript', () => {
    expect(markQuotes('', ['x'])).toEqual([]);
  });
});

describe('tryItHint', () => {
  it('uses the quote and the tag, and never the correction', () => {
    expect(tryItHint("j'ai allé", 'Être vs Avoir')).toBe(
      "« j'ai allé » — something's off here (Être vs Avoir). Can you fix it?",
    );
    expect(tryItHint("j'ai allé")).toBe("« j'ai allé » — something's off here. Can you fix it?");
  });
});
