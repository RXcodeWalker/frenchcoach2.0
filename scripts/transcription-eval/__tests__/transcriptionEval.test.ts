import { describe, expect, it } from 'vitest';
import { fillerRetention, isHallucination, percentile, wordErrorRate } from '../metrics';
import { normaliseTokens } from '../normalise';
import { buildReport, decide, summariseConfig } from '../report';
import type { DecisionRule, Manifest, ResultsFile } from '../types';

describe('normaliseTokens', () => {
  it('ignores case, punctuation and apostrophe/hyphen style', () => {
    expect(normaliseTokens("J’aime le café, peut-être !")).toEqual(['j', 'aime', 'le', 'café', 'peut', 'être']);
    expect(normaliseTokens("j'aime")).toEqual(normaliseTokens("j' aime"));
  });
  it('keeps accents (a vs à are different words)', () => {
    expect(normaliseTokens('a')).not.toEqual(normaliseTokens('à'));
    expect(normaliseTokens('où')).toEqual(['où']);
  });
});

describe('wordErrorRate', () => {
  it('is 0 for identical text modulo punctuation', () => {
    expect(wordErrorRate('Je mange, du pain.', 'je mange du pain').wer).toBe(0);
  });
  it('counts substitution, deletion, insertion', () => {
    expect(wordErrorRate('a b c d', 'a x c').errors).toBe(2); // sub b->x, del d
    expect(wordErrorRate('a b', 'a b c').errors).toBe(1);
  });
  it('treats an accent change as an error', () => {
    expect(wordErrorRate('il va à Paris', 'il va a Paris').errors).toBe(1);
  });
  it('handles empty sides', () => {
    expect(wordErrorRate('', '').wer).toBe(0);
    expect(wordErrorRate('', 'x').wer).toBe(Infinity);
    expect(wordErrorRate('a b', '').wer).toBe(1);
  });
});

describe('percentile', () => {
  it('uses nearest rank', () => {
    const v = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    expect(percentile(v, 50)).toBe(50);
    expect(percentile(v, 95)).toBe(100);
    expect(percentile([7], 95)).toBe(7);
    expect(percentile([], 50)).toBeNaN();
  });
});

describe('fillerRetention', () => {
  it('is null without fillers in the reference', () => {
    expect(fillerRetention('je mange', 'je mange')).toBeNull();
  });
  it('counts the fillers still present', () => {
    expect(fillerRetention('euh je euh mange hum', 'euh je mange')).toBeCloseTo(1 / 3);
    expect(fillerRetention('euh je mange', 'je mange')).toBe(0);
  });
});

describe('isHallucination', () => {
  it('flags any words on a silence clip', () => {
    expect(isHallucination('silence', 'Merci.')).toBe(true);
    expect(isHallucination('silence', '')).toBe(false);
  });
  it('flags known artefacts on speech clips', () => {
    expect(isHallucination('normal', "Sous-titrage Société Radio-Canada")).toBe(true);
    expect(isHallucination('normal', "Merci d'avoir regardé cette vidéo")).toBe(true);
    expect(isHallucination('normal', "j'aime la musique")).toBe(false);
  });
});

const manifest: Manifest = {
  clips: [
    { id: 'a', kind: 'normal', file: 'a.webm', chromeText: 'je mange du pin', reference: 'je mange du pain', accent: true },
    {
      id: 'b',
      kind: 'normal',
      file: 'b.webm',
      chromeText: 'les guitares',
      reference: 'euh la musique non désolé les guitares',
      referenceClean: 'les guitares',
    },
    { id: 's', kind: 'silence', file: 's.webm', chromeText: '', reference: '' },
  ],
};
const rule: DecisionRule = {
  minWerImprovementOverChrome: 0.05,
  maxHallucinations: 0,
  minAccentMarginForLargeV3: 0.1,
  maxP95LatencyMs: 2000,
};
const res = (clipId: string, config: string, text: string, lat = 500) => ({
  clipId,
  config,
  text,
  latenciesMs: [lat],
});

function results(extra: ResultsFile['results']): ResultsFile {
  return { ruleHash: 'x', ranAt: 'now', results: extra };
}

describe('report', () => {
  const good = (config: string, accentText: string, lat: number) => [
    res('a', config, accentText, lat),
    res('b', config, 'euh la musique non désolé les guitares', lat),
    res('s', config, '', lat),
  ];

  it('scores a config on pooled WER, accent WER and clean-reference WER', () => {
    const s = summariseConfig('turbo', manifest, results(good('turbo', 'je mange du pain', 500)));
    expect(s.wer).toBe(0);
    expect(s.accentWer).toBe(0);
    expect(s.cleanWer).toBe(2.5); // 5 extra words over a 2-word clean reference
  });

  it('adopts turbo when large-v3 does not clear the accent margin', () => {
    const r = buildReport(
      manifest,
      results([...good('turbo', 'je mange du pain', 500), ...good('large-v3', 'je mange du pain', 900)]),
      rule,
    );
    expect(r.verdict.adoptWhisper).toBe(true);
    expect(r.verdict.whisperConfig).toBe('turbo');
    expect(r.verdict.useLargeV3).toBe(false);
  });

  it('prefers large-v3 only with the accent margin and a fitting p95', () => {
    const r = buildReport(
      manifest,
      results([...good('turbo', 'je mange du pin', 500), ...good('large-v3', 'je mange du pain', 900)]),
      { ...rule, minAccentMarginForLargeV3: 0.1 },
    );
    expect(r.verdict.whisperConfig).toBe('large-v3');
    const slow = buildReport(
      manifest,
      results([...good('turbo', 'je mange du pin', 500), ...good('large-v3', 'je mange du pain', 9000)]),
      rule,
    );
    expect(slow.verdict.whisperConfig).toBe('turbo');
  });

  it('rejects any Whisper config with a hallucination, falling back to Chrome', () => {
    const bad = [
      res('a', 'turbo', 'je mange du pain'),
      res('b', 'turbo', 'euh la musique non désolé les guitares'),
      res('s', 'turbo', "Sous-titrage Société Radio-Canada"),
    ];
    const r = buildReport(manifest, results(bad), rule);
    expect(r.verdict.adoptWhisper).toBe(false);
    expect(r.verdict.reasons.join(' ')).toMatch(/hallucinated/);
  });

  it('rejects a config that does not beat Chrome by the margin', () => {
    const same = [
      res('a', 'turbo', 'je mange du pin'),
      res('b', 'turbo', 'les guitares'),
      res('s', 'turbo', ''),
    ];
    expect(buildReport(manifest, results(same), rule).verdict.adoptWhisper).toBe(false);
  });

  it('refuses unset thresholds', () => {
    expect(() => decide([], { ...rule, maxP95LatencyMs: null })).toThrow(/unset/);
  });
});
