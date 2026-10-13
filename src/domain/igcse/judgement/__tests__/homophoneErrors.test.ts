import { describe, expect, it, vi } from 'vitest';
import { QOL_7_9 } from '../../canonical';
import { markSpokenText } from '../../stt/project/spokenText';
import { classifyQolError, resolveQolHomophones, settleQolHomophones, splitQolErrors } from '../homophoneErrors';
import type { ConversationTurn, QolError, QualityOfLanguageAssessment, SpeakingTranscript } from '../types';
import { PRACTICE_TRANSCRIPT } from './fixtures';

/** A spoken turn as the projection hands it over: marked text + spans. */
function spoken(turnId: string, primary: string, secondary: string | null): ConversationTurn {
  const marked = markSpokenText(primary, secondary);
  return { turnId, questionPrompt: 'Q?', candidateResponse: marked.text, inputMode: 'speech', ambiguousSpans: marked.spans };
}

function transcriptWith(...turns: ConversationTurn[]): SpeakingTranscript {
  return {
    ...PRACTICE_TRANSCRIPT,
    topicConversations: [
      { conversationId: 'topic1', turns },
      PRACTICE_TRANSCRIPT.topicConversations[1],
    ],
  };
}

const err = (turnId: string, quote: string, correction: string): QolError => ({
  source: 'topic1',
  turnId,
  quote,
  kind: 'grammar',
  correction,
});

const verdict = (t: SpeakingTranscript, e: QolError) => classifyQolError(e, t).verdict;

describe('classifyQolError — Category A (never penalised on a spoken answer)', () => {
  // A hand-authored spoken turn the respeller did not touch (unknown verb).
  const t = transcriptWith(
    { turnId: 'a', questionPrompt: 'Q?', candidateResponse: 'Mon frère il bavardent beaucoup.', inputMode: 'speech' },
    { turnId: 'b', questionPrompt: 'Q?', candidateResponse: 'Hier je suis allé au cinéma.', inputMode: 'speech' },
    { turnId: 'c', questionPrompt: 'Q?', candidateResponse: 'Mes amis ils aiment le sport.', inputMode: 'speech' },
    { turnId: 'typed', questionPrompt: 'Q?', candidateResponse: 'Mon frère il bavardent beaucoup.', inputMode: 'text' },
  );

  it('an inconsistent "il bavardent" is inaudible', () => {
    expect(verdict(t, err('a', 'il bavardent', 'il bavarde'))).toBe('inaudible');
    expect(verdict(t, err('a', 'il bavardent', 'ils bavardent'))).toBe('inaudible');
  });

  it('a silent agreement ending is inaudible', () => {
    expect(verdict(t, err('b', 'je suis allé', 'je suis allée'))).toBe('inaudible');
  });

  it('a liaison makes il/ils audible before a vowel, so it counts', () => {
    expect(verdict(t, err('c', 'ils aiment', 'il aime'))).toBe('counted');
    // Even quoted alone, the answer's next word ("aiment") carries the liaison.
    expect(verdict(t, err('c', 'ils', 'il'))).toBe('counted');
  });

  it('a typed answer keeps every spelling error', () => {
    expect(verdict(t, err('typed', 'il bavardent', 'il bavarde'))).toBe('counted');
  });
});

describe('classifyQolError — Category B (benefit of the doubt only where unconfirmed)', () => {
  it('recognisers disagreed on the word: ambiguousNear', () => {
    const t = transcriptWith(spoken('q', "J'ai en chien", "J'ai un chien"));
    expect(classifyQolError(err('q', 'en chien', 'un chien'), t)).toEqual({ verdict: 'ambiguousNear', nearPairIds: ['un~en'] });
  });

  it('both recognisers agreed on the wrong word: it counts', () => {
    const t = transcriptWith(spoken('q', "J'ai en chien", "j'ai en chien"));
    expect(verdict(t, err('q', 'en chien', 'un chien'))).toBe('counted');
  });

  it('only one recogniser read the answer: ambiguousNear', () => {
    const t = transcriptWith(spoken('q', 'Je mange de pain', null));
    expect(classifyQolError(err('q', 'de pain', 'du pain'), t)).toEqual({ verdict: 'ambiguousNear', nearPairIds: ['du~de'] });
  });

  it('the correction must be the pair the other recogniser heard', () => {
    const t = transcriptWith(spoken('q', 'Je mange de pain', 'Je mange des pain'));
    expect(verdict(t, err('q', 'de pain', 'des pain'))).toBe('ambiguousNear');
    expect(verdict(t, err('q', 'de pain', 'du pain'))).toBe('counted');
  });

  it('a Category B word outside every span counts, even when another word was disputed', () => {
    const t = transcriptWith(spoken('q', "J'ai en chien et le chat", "J'ai un chien et le chat"));
    expect(verdict(t, err('q', 'le chat', 'les chats'))).toBe('counted');
  });

  it('a clearly different word (the primary recogniser wins) counts', () => {
    const t = transcriptWith(spoken('q', "J'ai un chat noir", "J'ai un chien noir"));
    expect(t.topicConversations[0].turns[0].ambiguousSpans?.[0].kind).toBe('different');
    expect(verdict(t, err('q', 'un chat noir', 'une chatte noire'))).toBe('counted');
  });

  it('a mix of Category A and an uncertain Category B word is ambiguousNear', () => {
    const t = transcriptWith(spoken('q', 'Ils sont un chien', 'Ils ont un chien'));
    expect(verdict(t, err('q', 'Ils sont un chien', 'Il ont un chien'))).toBe('counted'); // "il ont" is not "ils ont"
    expect(verdict(t, err('q', 'sont un chien', 'ont un chien'))).toBe('ambiguousNear');
  });

  it('a quote that occurs twice is excused if one occurrence is uncertain', () => {
    const t = transcriptWith(spoken('q', 'Le chat et le chien', 'Le chat et les chien'));
    expect(verdict(t, err('q', 'le', 'les'))).toBe('ambiguousNear');
  });
});

describe('classifyQolError — always counted', () => {
  const t = transcriptWith(spoken('q', 'Je mange de pain', null));

  it('a different number of words', () => {
    expect(verdict(t, err('q', 'mange de pain', 'mange du bon pain'))).toBe('counted');
  });

  it('an identical correction', () => {
    expect(verdict(t, err('q', 'de pain', 'de pain'))).toBe('counted');
  });

  it('an unknown turn', () => {
    expect(verdict(t, err('nope', 'de pain', 'du pain'))).toBe('counted');
  });

  it('a Category B difference whose quote cannot be placed in the answer', () => {
    expect(verdict(t, err('q', 'ange de', 'ange du'))).toBe('counted');
  });
});

function qol(mark: number, errors: QolError[]): QualityOfLanguageAssessment {
  return {
    mark,
    band: { min: 7, max: 9, label: 'Satisfactory' },
    bestFitPlacement: mark === 9 ? 'convincingly' : mark === 8 ? 'adequately' : 'just',
    descriptorsApplied: [QOL_7_9[0]],
    justification: 'j',
    evidenceSpans: [{ source: 'topic1', quote: 'chien' }],
    errors,
    errorFrequency: errors.length ? 'some errors' : 'no errors',
  };
}

describe('resolving the QoL reply', () => {
  const t = transcriptWith(spoken('q', "J'ai en chien et il bavardent", "J'ai un chien et il bavardent"));
  const near = err('q', 'en chien', 'un chien');
  const realError = err('q', 'il bavardent', 'il bavarde avec');

  it('splits excused errors out of the counted list', () => {
    const split = splitQolErrors([near, realError], t);
    expect(split.counted).toEqual([realError]);
    expect(split.excused).toEqual([{ ...near, reason: 'ambiguousNear', nearPairIds: ['un~en'] }]);
  });

  it('nothing excused: no re-ask, the first reply stands untouched', async () => {
    const reAsk = vi.fn();
    const first = qol(8, [realError]);
    const r = await resolveQolHomophones(first, t, reAsk);
    expect(reAsk).not.toHaveBeenCalled();
    expect(r).toEqual({ qualityOfLanguage: first, excusedErrors: [], reAsk: 'not-needed', excusedInReAsk: 0, firstMark: 8 });
  });

  it('something excused: asks once with the excused errors, and keeps the re-run’s mark', async () => {
    const reAsk = vi.fn().mockResolvedValue(qol(9, [realError]));
    const r = await resolveQolHomophones(qol(7, [near, realError]), t, reAsk);
    expect(reAsk).toHaveBeenCalledTimes(1);
    expect(reAsk.mock.calls[0][0]).toEqual([{ ...near, reason: 'ambiguousNear', nearPairIds: ['un~en'] }]);
    expect(r.reAsk).toBe('applied');
    expect(r.qualityOfLanguage.mark).toBe(9);
    expect(r.qualityOfLanguage.errors).toEqual([realError]);
    expect(r.firstMark).toBe(7);
    expect(r.excusedInReAsk).toBe(0);
  });

  it('a re-run that lists the excused error again: moved out again, counted as unresolved', async () => {
    const r = await resolveQolHomophones(qol(7, [near]), t, async () => qol(7, [near, realError]));
    expect(r.qualityOfLanguage.errors).toEqual([realError]);
    expect(r.excusedErrors).toHaveLength(1);
    expect(r.excusedInReAsk).toBe(1);
  });

  it('a failed re-ask keeps the first mark, without the excused errors, and reports the failure', async () => {
    const onFailure = vi.fn();
    const r = await resolveQolHomophones(qol(7, [near, realError]), t, async () => {
      throw new Error('provider down');
    }, onFailure);
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ reAsk: 'failed', firstMark: 7, excusedInReAsk: 0 });
    expect(r.qualityOfLanguage.mark).toBe(7);
    expect(r.qualityOfLanguage.errors).toEqual([realError]);
  });

  it('settleQolHomophones is the same decision without the call', () => {
    expect(settleQolHomophones(qol(7, [near]), t, qol(9, [])).qualityOfLanguage.mark).toBe(9);
    expect(settleQolHomophones(qol(7, [near]), t, 'failed').reAsk).toBe('failed');
  });
});
