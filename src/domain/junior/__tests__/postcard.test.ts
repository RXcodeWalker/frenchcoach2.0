import { describe, expect, it } from 'vitest';
import { MAX_POSTCARD_LINES, buildPostcard, postcardLines, type Postcard } from '../postcard';
import type { JuniorTurnResult, MatchOutcome, ScaffoldStep } from '../types';

const reward = { sticker: { id: 'moi-rocket', emoji: '🚀', name: 'Rocket' }, gold: false };

function turn(
  questionId: string,
  outcome: MatchOutcome,
  sentence: string,
  opts: { step?: ScaffoldStep; patternId?: string; heard?: string[]; second?: string } = {},
): JuniorTurnResult {
  const frames = [{ patternId: opts.patternId ?? 'j-aime-le-X', step: opts.step ?? 'frame', sentence }];
  if (opts.second) frames.push({ patternId: 'j-ai-un-X', step: opts.step ?? 'frame', sentence: opts.second });
  return {
    questionId,
    outcome,
    frames,
    heard: opts.heard ?? (outcome === 'none' ? [] : ["j'aime"]),
    recordingId: `rec-${questionId}`,
  };
}

const kinds = (p: Postcard) => p.items.map((i) => i.kind);

describe('buildPostcard (junior-track §9)', () => {
  it('a mixed mission: ⭐ said great, 🎯 practise an almost, 🏅 sticker', () => {
    const p = buildPostcard(
      [turn('q1', 'got', "J'aime le bleu."), turn('q2', 'almost', "J'ai un chat.", { heard: ["j'ai"] }), turn('q3', 'none', "J'ai dix ans.")],
      reward,
    );
    expect(kinds(p)).toEqual(['saidGreat', 'practise', 'sticker']);
    expect(p.items[0]).toMatchObject({ sentence: "J'aime le bleu.", recordingId: 'rec-q1' });
    expect(p.items[1]).toMatchObject({ sentence: "J'ai un chat.", heard: ["j'ai"], recordingId: 'rec-q2' });
    expect(p.items[2]).toMatchObject({ sticker: reward.sticker, gold: false });
  });

  it('⭐ shows the target sentence and the recording, never the raw transcript', () => {
    const t = { ...turn('q1', 'got', "J'aime le bleu."), transcript: 'jem le bleu' } as JuniorTurnResult;
    const p = buildPostcard([t, turn('q2', 'almost', "J'ai un chat.")], reward);
    expect(p.items[0]).toMatchObject({ kind: 'saidGreat', sentence: "J'aime le bleu.", recordingId: 'rec-q1' });
    expect(JSON.stringify(p)).not.toContain('jem le bleu');
    expect(postcardLines(p).join('\n')).not.toContain('jem le bleu');
  });

  it('⭐ picks the longest "got it" sentence, a two-sentence turn included', () => {
    const p = buildPostcard(
      [turn('q1', 'got', "J'aime le bleu."), turn('q2', 'got', "J'ai dix ans.", { second: "J'ai un chat." }), turn('q3', 'almost', 'x')],
      reward,
    );
    expect(p.items[0]).toMatchObject({ sentence: "J'ai dix ans. J'ai un chat." });
  });

  describe('edge cases', () => {
    it('no "got it" turn → "Great try!" with the best "almost" turn', () => {
      const p = buildPostcard(
        [
          turn('q1', 'almost', "J'aime le bleu.", { heard: ['bleu'] }),
          turn('q2', 'almost', "J'ai un chat.", { heard: ["j'ai", 'chat'] }),
          turn('q3', 'none', "J'ai dix ans."),
        ],
        reward,
      );
      expect(kinds(p)).toEqual(['greatTry', 'practise', 'sticker']);
      expect(p.items[0]).toMatchObject({ label: 'Great try!', sentence: "J'ai un chat.", recordingId: 'rec-q2' });
      expect(p.items[1]).toMatchObject({ sentence: "J'aime le bleu." });
    });

    it('no "got it" and a single "almost" → that almost is the ⭐; 🎯 practises a "none" turn', () => {
      const p = buildPostcard([turn('q1', 'almost', "J'aime le bleu."), turn('q2', 'none', "J'ai dix ans.")], reward);
      expect(kinds(p)).toEqual(['greatTry', 'practise', 'sticker']);
      expect(p.items[1]).toMatchObject({ sentence: "J'ai dix ans.", heard: [] });
    });

    it('no "almost" turn (all got it) → "Challenge: say it without help" on the hardest pattern', () => {
      const p = buildPostcard(
        [
          turn('q1', 'got', "J'aime le bleu.", { step: 'free' }),
          turn('q2', 'got', "J'ai dix ans.", { step: 'echo', patternId: 'j-ai-N-ans' }),
          turn('q3', 'got', "J'habite dans une maison.", { step: 'frame', patternId: 'j-habite-dans-X' }),
        ],
        reward,
      );
      expect(kinds(p)).toEqual(['saidGreat', 'challenge', 'sticker']);
      expect(p.items[1]).toMatchObject({ label: 'Challenge: say it without help', sentence: "J'ai dix ans.", patternId: 'j-ai-N-ans' });
    });

    it('every turn "none" → "You finished!" + one sentence to listen to + the sticker', () => {
      const p = buildPostcard([turn('q1', 'none', "J'aime le bleu."), turn('q2', 'none', "J'ai dix ans.")], reward);
      expect(kinds(p)).toEqual(['finished', 'listen', 'sticker']);
      expect(p.items[1]).toMatchObject({ sentence: "J'aime le bleu." });
      const text = postcardLines(p).join('\n');
      expect(text).not.toMatch(/sorry|oops|wrong|failed|lost|try harder/i);
    });
  });

  it('refuses an empty mission rather than show an empty Postcard', () => {
    expect(() => buildPostcard([], reward)).toThrow();
  });
});

describe('Postcard caps', () => {
  const missions: Array<[string, JuniorTurnResult[]]> = [
    ['mixed', [turn('q1', 'got', "J'aime le bleu."), turn('q2', 'almost', "J'ai un chat."), turn('q3', 'none', "J'ai dix ans.")]],
    ['all got', [turn('q1', 'got', "J'aime le bleu."), turn('q2', 'got', "J'ai dix ans.", { second: "J'ai un chat." })]],
    ['all almost', [turn('q1', 'almost', "J'aime le bleu."), turn('q2', 'almost', "J'ai un chat.")]],
    ['all none', [turn('q1', 'none', "J'aime le bleu."), turn('q2', 'none', "J'ai dix ans.", { second: "J'ai un chat." })]],
  ];

  it.each(missions)('%s: exactly 3 items, at most 4 lines, no numbers or verdicts', (_name, turns) => {
    for (const gold of [false, true]) {
      const p = buildPostcard(turns, { ...reward, gold });
      expect(p.items).toHaveLength(3);
      const lines = postcardLines(p);
      expect(lines.length).toBeLessThanOrEqual(MAX_POSTCARD_LINES);
      for (const line of lines) {
        expect(line).not.toContain('\n');
        expect(line).not.toMatch(/\d|%|\/|score|grade|band|mark|wrong|✗/i);
      }
    }
  });
});
