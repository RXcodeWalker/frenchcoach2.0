import { describe, it, expect } from 'vitest';
import { claimMentionsMarkOrBand } from '../../../../domain/examFeedback/shared/markClaimFilter';
import type { FeedbackV2 } from '../../../../types';
import type { FeedbackPointGroup } from '../../components/FeedbackPointList';
import { addressName, teacherInitials, TEACHER_NAME } from '../persona';
import {
  TEACHER_FRAMING,
  buildCoachTeacherScript,
  buildTeacherScript,
  recurringFixQuote,
  type RecurringMistake,
  type TeacherLine,
} from '../buildTeacherScript';

const TRANSCRIPT = "Hier j'ai allé au cinéma avec mon amie parce que c'est drôle.";

function fb(over: Partial<FeedbackV2> = {}): FeedbackV2 {
  return {
    scores: { overall: 6, communication: 6, language: 6, fluency: 6 },
    grammar: { critical: [], polish: [] },
    vocabulary: [], style: [], fillers: [], wordCount: 20, cefrLevel: 'A2',
    pronunciation: { score: null, issues: [] },
    ...over,
  } as FeedbackV2;
}

const strengths: FeedbackPointGroup = {
  heading: 'What you did well',
  tone: 'good',
  points: [{ kind: 'claim', claim: 'You gave a reason.', quote: "parce que c'est drôle" }],
};
const fixGroup = (n: number, heading = 'Fix these first'): FeedbackPointGroup => ({
  heading,
  tone: 'bad',
  points: Array.from({ length: n }, (_, i) => ({ kind: 'fix' as const, quote: `q${i}`, correction: `c${i}` })),
});
const empty = (heading: string, tone: 'good' | 'bad'): FeedbackPointGroup => ({ heading, tone, points: [] });

const talk = (lines: TeacherLine[]) => lines.filter((l): l is Extract<TeacherLine, { kind: 'talk' }> => l.kind === 'talk');
const ids = (lines: TeacherLine[]) => lines.map((l) => l.id);

describe('buildTeacherScript — order', () => {
  it('answer → opening → strengths → connective → fixes → also worth fixing → say it better → go further → memory', () => {
    const lines = buildTeacherScript({
      register: 'coach',
      transcript: TRANSCRIPT,
      groups: [strengths, fixGroup(2), fixGroup(1, 'Also worth fixing')],
      hasSayItBetter: true,
      hasGoFurther: true,
      recurring: { label: 'Être vs Avoir', times: 3, quote: "j'ai allé" },
    });
    expect(ids(lines)).toEqual([
      'learner',
      'opening',
      'points:What you did well',
      'connective',
      'points:Fix these first',
      'points:Also worth fixing',
      'section:say-it-better',
      'section:go-further',
      'memory',
    ]);
    expect(lines[0]).toEqual({ id: 'learner', kind: 'learner', text: TRANSCRIPT });
  });

  it('leaves out an empty group, a missing block and an empty answer', () => {
    const lines = buildTeacherScript({ register: 'coach', transcript: '  ', groups: [strengths, empty('Fix these first', 'bad'), empty('Also worth fixing', 'bad')] });
    expect(ids(lines)).toEqual(['opening', 'points:What you did well', 'connective']);
  });
});

describe('buildTeacherScript — opening', () => {
  it("uses the model's opening line, verbatim, when it survived the filters", () => {
    const lines = buildTeacherScript({ register: 'coach', transcript: TRANSCRIPT, opening: ' You explained « parce que c’est drôle » well. ', groups: [strengths, fixGroup(1)] });
    expect(talk(lines)[0]).toEqual({ id: 'opening', kind: 'talk', role: 'opening', text: 'You explained « parce que c’est drôle » well.' });
  });

  it('falls back to a template that uses the name', () => {
    const named = buildTeacherScript({ register: 'coach', transcript: TRANSCRIPT, name: 'Marie', groups: [fixGroup(1)] });
    expect(talk(named)[0].text).toBe("Let's go through your answer, Marie.");
    const anonymous = buildTeacherScript({ register: 'coach', transcript: TRANSCRIPT, groups: [fixGroup(1)] });
    expect(talk(anonymous)[0].text).toBe("Let's go through your answer.");
  });

  it('treats a blank opening as missing', () => {
    const lines = buildTeacherScript({ register: 'coach', transcript: TRANSCRIPT, opening: '   ', groups: [fixGroup(1)] });
    expect(talk(lines)[0].text).toBe("Let's go through your answer.");
  });
});

describe('buildTeacherScript — the name is said once', () => {
  const count = (lines: TeacherLine[], name: string) => talk(lines).filter((l) => l.text.includes(name)).length;

  it('in the template opening when that is used', () => {
    const lines = buildTeacherScript({ register: 'coach', transcript: TRANSCRIPT, name: 'Marie', groups: [strengths, fixGroup(2)] });
    expect(count(lines, 'Marie')).toBe(1);
    expect(talk(lines).find((l) => l.role === 'connective')!.text).not.toContain('Marie');
  });

  it('in the connective when the opening is the model’s own', () => {
    const lines = buildTeacherScript({ register: 'coach', transcript: TRANSCRIPT, name: 'Marie', opening: 'Nice « parce que c’est drôle ».', groups: [strengths, fixGroup(2)] });
    expect(count(lines, 'Marie')).toBe(1);
    expect(talk(lines).find((l) => l.role === 'connective')!.text).toBe("Let's fix the two that matter most first, Marie.");
  });

  it('never with a recurring line either, and never in either register twice', () => {
    for (const register of ['coach', 'examiner'] as const) {
      const lines = buildTeacherScript({
        register, transcript: TRANSCRIPT, name: 'Marie', opening: 'Une phrase « parce que c’est drôle ».',
        groups: [strengths, fixGroup(2)], recurring: { label: 'Être vs Avoir', times: null, quote: "j'ai allé" },
      });
      expect(count(lines, 'Marie')).toBeLessThanOrEqual(1);
    }
  });

  it('is left unsaid when the handle does not read as a name', () => {
    for (const handle of ['marie@example.com', '<b>x</b>', '', '   ', null, undefined, 'a'.repeat(40)]) {
      expect(addressName(handle)).toBeNull();
      const lines = buildTeacherScript({ register: 'coach', transcript: TRANSCRIPT, name: handle, groups: [fixGroup(1)] });
      expect(talk(lines)[0].text).toBe("Let's go through your answer.");
    }
    expect(addressName('  Marie   Claire ')).toBe('Marie Claire');
    expect(addressName("Jean-Luc_92")).toBe('Jean-Luc_92');
  });
});

describe('buildTeacherScript — connective by count', () => {
  const connective = (n: number, register: 'coach' | 'examiner' = 'coach', groups?: FeedbackPointGroup[]) =>
    talk(buildTeacherScript({ register, transcript: TRANSCRIPT, groups: groups ?? [strengths, ...(n ? [fixGroup(n)] : [])] })).find((l) => l.role === 'connective')!.text;

  it('none → no mistake found; one → one thing; more → the two that matter most first', () => {
    expect(connective(0)).toBe("I couldn't find a mistake in your French.");
    expect(connective(1)).toBe("There's one thing to fix.");
    expect(connective(2)).toBe("Let's fix the two that matter most first.");
    expect(connective(5)).toBe("Let's fix the two that matter most first.");
  });

  it('counts fixes across every group', () => {
    expect(connective(0, 'coach', [strengths, fixGroup(1), fixGroup(1, 'Also worth fixing')])).toBe("Let's fix the two that matter most first.");
  });

  it('the examiner register is formal', () => {
    expect(connective(0, 'examiner')).toBe('I did not find an error in your French.');
    expect(connective(1, 'examiner')).toBe('There is one point to correct.');
    expect(connective(3, 'examiner')).toBe('Let us correct the two most important points first.');
  });

  it('sits before the first fix group, and straight after the strengths when there are no fixes', () => {
    const withFixes = ids(buildTeacherScript({ register: 'coach', transcript: TRANSCRIPT, groups: [strengths, fixGroup(1)] }));
    expect(withFixes.indexOf('connective')).toBe(withFixes.indexOf('points:Fix these first') - 1);
    const noStrengthsNoFixes = ids(buildTeacherScript({ register: 'coach', transcript: TRANSCRIPT, groups: [empty('a', 'good'), empty('b', 'bad')] }));
    expect(noStrengthsNoFixes).toEqual(['learner', 'opening', 'connective']);
  });

  it('never praises: it states a count, nothing more', () => {
    for (const register of ['coach', 'examiner'] as const) {
      for (const n of [0, 1, 4]) expect(connective(n, register), `${register}/${n}`).not.toMatch(/\b(great|good|well|excellent|perfect|impressive|nice|wonderful)\b/i);
    }
  });
});

describe('buildTeacherScript — examiner groups keep their own order', () => {
  const worked: FeedbackPointGroup = { heading: 'What worked', tone: 'good', points: [{ kind: 'claim', claim: 'A clear reason.', quote: 'parce que' }] };
  const next: FeedbackPointGroup = { heading: 'Your next step', tone: 'good', points: [{ kind: 'claim', claim: 'Add a past tense.', quote: 'je joue' }] };

  it('puts the connective before the mistakes and the next step last', () => {
    const lines = buildTeacherScript({ register: 'examiner', transcript: TRANSCRIPT, groups: [worked, { ...fixGroup(1), heading: 'Mistakes to fix' }, next] });
    expect(ids(lines)).toEqual(['learner', 'opening', 'points:What worked', 'connective', 'points:Mistakes to fix', 'points:Your next step']);
  });

  it('with no mistakes, the connective still comes before the next step', () => {
    const lines = buildTeacherScript({ register: 'examiner', transcript: TRANSCRIPT, groups: [worked, { ...fixGroup(0), heading: 'Mistakes to fix' }, next] });
    expect(ids(lines)).toEqual(['learner', 'opening', 'points:What worked', 'connective', 'points:Your next step']);
  });

  it('uses the formal opening', () => {
    expect(talk(buildTeacherScript({ register: 'examiner', transcript: TRANSCRIPT, groups: [worked] }))[0].text).toBe('Let us go through your answer.');
  });
});

describe('buildTeacherScript — the memory line', () => {
  const recurring: RecurringMistake = { label: 'Être vs Avoir', times: 3, quote: "j'ai allé" };
  const memory = (r: RecurringMistake | null | undefined, register: 'coach' | 'examiner' = 'coach') =>
    talk(buildTeacherScript({ register, transcript: TRANSCRIPT, groups: [fixGroup(1)], recurring: r })).find((l) => l.role === 'memory');

  it('appears only for a repeated mistake, quoting this answer', () => {
    expect(memory(null)).toBeUndefined();
    expect(memory(undefined)).toBeUndefined();
    expect(memory({ ...recurring, quote: '  ' })).toBeUndefined();
    expect(memory(recurring)!.text).toBe("« j'ai allé » is a slip I've seen before: Être vs Avoir has come up 3 times this week. Let's lock it in.");
  });

  it('does not claim a count it does not have', () => {
    expect(memory({ ...recurring, times: null })!.text).toContain('has come up more than once this week');
  });

  it('is formal for the examiner', () => {
    expect(memory(recurring, 'examiner')!.text).toBe("« j'ai allé » — this Être vs Avoir point has recurred 3 times in your recent answers. Please pay particular attention to it.");
  });
});

describe('recurringFixQuote / buildCoachTeacherScript', () => {
  const grammar = {
    critical: [{ theme: 'AUXILIARY_VERB', severity: 'major', msg: 'm', diagnostic: 'Aller takes être.', correction: 'je suis allé', quote: "j'ai allé" }],
    polish: [],
  } as unknown as FeedbackV2['grammar'];

  it('finds this answer’s fix for the problem’s skill, through the raw grammar theme', () => {
    expect(recurringFixQuote(fb({ grammar }), 'etre_avoir')).toBe("j'ai allé");
    expect(recurringFixQuote(fb({ grammar }), 'negation')).toBeNull();
  });

  it('still finds it when an issue covers the quote under a human label', () => {
    const issues = [{ id: 'a', category: 'grammar', severity: 'major', quote: "j'ai allé", diagnostic: 'd', correction: 'je suis allé', marksImpact: 3, themeLabel: 'Auxiliary verb' }] as FeedbackV2['issues'];
    expect(recurringFixQuote(fb({ issues, grammar }), 'etre_avoir')).toBe("j'ai allé");
    expect(recurringFixQuote(fb({ issues }), 'etre_avoir')).toBe("j'ai allé");
  });

  it('builds the coach script from filtered feedback, with the memory line only when a fix matches', () => {
    const feedback = fb({
      grammar,
      encouragement: 'You gave a clear reason with « parce que c’est drôle ».',
      best_moment: 'Good « parce que c’est drôle ».',
      improved_answer: "Hier je suis allé au cinéma.",
      expansion_ideas: ['Say who you went with.'],
    });
    const lines = buildCoachTeacherScript(feedback, { transcript: TRANSCRIPT, name: 'Marie', recurring: { nodeId: 'etre_avoir', label: 'Être vs Avoir', times: 3 } });
    expect(ids(lines)).toEqual([
      'learner', 'opening', 'points:What you did well', 'connective', 'points:Fix these first',
      'section:say-it-better', 'section:go-further', 'memory',
    ]);
    expect(talk(lines)[0].text).toBe('You gave a clear reason with « parce que c’est drôle ».');
    const unrelated = buildCoachTeacherScript(feedback, { transcript: TRANSCRIPT, recurring: { nodeId: 'negation', label: 'Negation', times: 3 } });
    expect(ids(unrelated)).not.toContain('memory');
  });
});

describe('framing never reads as a mark, band or grade (ADR 0005)', () => {
  it('holds for every static string, both registers, and every built talk line', () => {
    const recurring: RecurringMistake = { label: 'Être vs Avoir', times: 3, quote: "j'ai allé" };
    for (const register of ['coach', 'examiner'] as const) {
      const f = TEACHER_FRAMING[register];
      const strings = [f.opening(null), f.opening('Marie'), f.noFix(null), f.oneFix('Marie'), f.manyFix(null), f.memory(recurring), f.memory({ ...recurring, times: null }), f.sayItBetter, f.goFurther];
      for (const s of strings) expect(claimMentionsMarkOrBand(s), s).toBe(false);
      const lines = buildTeacherScript({ register, transcript: TRANSCRIPT, name: 'Marie', groups: [strengths, fixGroup(3)], recurring });
      for (const line of talk(lines)) expect(claimMentionsMarkOrBand(line.text), line.text).toBe(false);
    }
  });
});

describe('persona', () => {
  it('has initials for the avatar chip', () => {
    expect(TEACHER_NAME).toBe('Madame Laurent');
    expect(teacherInitials()).toBe('ML');
    expect(teacherInitials('Élodie')).toBe('É');
    expect(teacherInitials('')).toBe('');
  });
});
