// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { AnswerTranscription, WordRetakeResult } from '../../../features/learn/answerTranscription';
import { TranscriptConfirmPanel } from '../TranscriptConfirmPanel';

vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ consentStatus: 'unknown' }) }));
const recorder = vi.hoisted(() => ({
  start: vi.fn(async () => {}),
  stop: vi.fn(async () => ({ blob: new Blob(['x']), url: 'blob:x', waveSnapshot: [] })),
}));
vi.mock('../../../features/recording/useAudioBlobRecorder', () => ({
  useAudioBlobRecorder: () => ({
    isRecording: false,
    waveData: [],
    micLevel: { attach: () => {}, detach: () => {}, subscribe: () => () => {}, read: () => 0 },
    start: recorder.start,
    stop: recorder.stop,
  }),
}));
vi.mock('../../../features/recording/LevelBars', () => ({ LevelBars: () => null }));

afterEach(cleanup);

const whisper = (primaryText: string, secondaryText: string): AnswerTranscription => ({
  primaryText,
  secondaryText,
  source: 'whisper',
  fallbackReason: null,
});

const liveOnly = (primaryText: string, fallbackReason: AnswerTranscription['fallbackReason'] = 'asr-failed'): AnswerTranscription => ({
  primaryText,
  secondaryText: '',
  source: 'live-captions',
  fallbackReason,
});

function setup(
  transcription: AnswerTranscription | null,
  checking = false,
  transcribeWord?: (audio: Blob) => Promise<WordRetakeResult>,
) {
  const onConfirm = vi.fn();
  const onRerecord = vi.fn();
  render(
    <TranscriptConfirmPanel
      checking={checking}
      transcription={transcription}
      onConfirm={onConfirm}
      onRerecord={onRerecord}
      transcribeWord={transcribeWord}
    />,
  );
  return { onConfirm, onRerecord };
}

describe('TranscriptConfirmPanel', () => {
  it('shows a status while the recording is being double-checked, with nothing to confirm', () => {
    setup(null, true);
    expect(screen.getByRole('status').textContent).toMatch(/double-checking/i);
    expect(screen.queryByText('Use this')).toBeNull();
  });

  it('underlines the words the two recognisers disagreed on', () => {
    setup(whisper('Ils ont un chien.', 'ils sont en chien'));
    const words = screen.getAllByTestId('uncertain-word');
    expect(words.map((w) => w.textContent)).toEqual(['ont un']);
    expect(screen.getByTestId('heard-text').textContent).toBe('Ils ont un chien.');
  });

  it('underlines nothing when the recognisers agree', () => {
    setup(whisper('Ils ont un chien.', 'ils ont un chien'));
    expect(screen.queryAllByTestId('uncertain-word')).toHaveLength(0);
  });

  it('does not underline spellings that sound the same', () => {
    setup(whisper('Mes frères mangent beaucoup.', 'mes frères mange beaucoup'));
    expect(screen.queryAllByTestId('uncertain-word')).toHaveLength(0);
  });

  it('offers the other reading or saying just that word again — never a whole-answer re-record', () => {
    const { onRerecord } = setup(whisper('Ils ont un chien.', 'ils sont en chien'), false, vi.fn());
    expect(screen.queryByTestId('word-choice')).toBeNull();
    fireEvent.click(screen.getByTestId('uncertain-word'));
    const choice = screen.getByTestId('word-choice');
    expect(choice.textContent).toMatch(/sound alike/i);
    expect(screen.getByText('Use “sont en”')).toBeTruthy();
    expect(choice.textContent).not.toMatch(/re-record/i);
    fireEvent.click(screen.getByText('Say this word again'));
    expect(screen.getByTestId('word-retake').textContent).toMatch(/rest of your answer stays/i);
    expect(onRerecord).not.toHaveBeenCalled();
  });

  it('replaces only the re-said word and keeps the rest of the answer', async () => {
    const transcribeWord = vi.fn(async () => ({ ok: true as const, text: 'sont en' }));
    const { onConfirm, onRerecord } = setup(whisper('Ils ont un chien.', 'ils sont en chien'), false, transcribeWord);
    fireEvent.click(screen.getByTestId('uncertain-word'));
    fireEvent.click(screen.getByText('Say this word again'));
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Tap and say the word'));
    });
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Stop and check'));
    });
    expect(transcribeWord).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('heard-text').textContent).toBe('Ils sont en chien.');
    fireEvent.click(screen.getByText('Use this'));
    expect(onConfirm).toHaveBeenCalledWith({ text: 'Ils sont en chien.', edited: true, source: 'whisper' });
    expect(onRerecord).not.toHaveBeenCalled();
  });

  it('keeps the answer when the re-said word could not be heard', async () => {
    const transcribeWord = vi.fn(async () => ({ ok: false as const, reason: 'asr-failed' as const }));
    setup(whisper('Ils ont un chien.', 'ils sont en chien'), false, transcribeWord);
    fireEvent.click(screen.getByTestId('uncertain-word'));
    fireEvent.click(screen.getByText('Say this word again'));
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Tap and say the word'));
    });
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Stop and check'));
    });
    expect(screen.getByText(/couldn’t catch that/i)).toBeTruthy();
    expect(screen.getByTestId('heard-text').textContent).toBe('Ils ont un chien.');
  });

  it('asks "Are you sure?" before throwing the whole answer away', () => {
    const { onRerecord } = setup(whisper('Ils ont un chien.', 'ils sont en chien'));
    fireEvent.click(screen.getByText('Re-record answer'));
    expect(screen.getByText('Are you sure you want to re-record?')).toBeTruthy();
    fireEvent.click(screen.getByText('Keep this answer'));
    expect(onRerecord).not.toHaveBeenCalled();
    expect(screen.getByTestId('heard-text').textContent).toBe('Ils ont un chien.');

    fireEvent.click(screen.getByText('Re-record answer'));
    fireEvent.click(screen.getByText('Yes, re-record'));
    expect(onRerecord).toHaveBeenCalledTimes(1);
  });

  it('swaps to the other reading, keeps it underlined so it can be undone, and confirms the swapped text as edited', () => {
    const { onConfirm } = setup(whisper('Ils ont un chien.', 'ils sont en chien'));
    fireEvent.click(screen.getByTestId('uncertain-word'));
    fireEvent.click(screen.getByText('Use “sont en”'));
    expect(screen.getByTestId('heard-text').textContent).toBe('Ils sont en chien.');
    expect(screen.getByTestId('uncertain-word').textContent).toBe('sont en');

    fireEvent.click(screen.getByText('Use this'));
    expect(onConfirm).toHaveBeenCalledWith({ text: 'Ils sont en chien.', edited: true, source: 'whisper' });
  });

  it('can undo a swap', () => {
    const { onConfirm } = setup(whisper('Ils ont un chien.', 'ils sont en chien'));
    fireEvent.click(screen.getByTestId('uncertain-word'));
    fireEvent.click(screen.getByText('Use “sont en”'));
    fireEvent.click(screen.getByTestId('uncertain-word'));
    fireEvent.click(screen.getByText('Use “ont un”'));
    fireEvent.click(screen.getByText('Use this'));
    expect(onConfirm).toHaveBeenCalledWith({ text: 'Ils ont un chien.', edited: false, source: 'whisper' });
  });

  it('confirms the primary transcript unedited when nothing was tapped', () => {
    const { onConfirm } = setup(whisper('Ils ont un chien.', 'ils sont en chien'));
    fireEvent.click(screen.getByText('Use this'));
    expect(onConfirm).toHaveBeenCalledWith({ text: 'Ils ont un chien.', edited: false, source: 'whisper' });
  });

  it('shows and confirms the context-consistent spelling, not an edit by the student', () => {
    const { onConfirm } = setup(whisper("J'ai un frère. Ils mange du pain.", "j'ai un frère il mange du pain"));
    expect(screen.getByTestId('heard-text').textContent).toBe("J'ai un frère. Il mange du pain.");
    fireEvent.click(screen.getByText('Use this'));
    expect(onConfirm).toHaveBeenCalledWith({ text: "J'ai un frère. Il mange du pain.", edited: false, source: 'whisper' });
  });

  it('has no free-text field', () => {
    setup(whisper('Ils ont un chien.', 'ils sont en chien'));
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  describe('when Whisper was not available', () => {
    it('shows the live captions as they were, underlining nothing, with a note', () => {
      const { onConfirm } = setup(liveOnly('ils sont un chien'));
      expect(screen.getByTestId('heard-text').textContent).toBe('ils sont un chien');
      expect(screen.queryAllByTestId('uncertain-word')).toHaveLength(0);
      expect(screen.getByTestId('live-captions-note')).toBeTruthy();
      fireEvent.click(screen.getByText('Use this'));
      expect(onConfirm).toHaveBeenCalledWith({ text: 'ils sont un chien', edited: false, source: 'live-captions' });
    });

    it('shows no note when there was simply no audio to check', () => {
      setup(liveOnly('bonjour', 'no-audio'));
      expect(screen.queryByTestId('live-captions-note')).toBeNull();
    });
  });

  it('says so when nothing was transcribed', () => {
    setup(liveOnly(''));
    expect(screen.getByText('Nothing was transcribed.')).toBeTruthy();
  });

  it('does not underline a same-sound reading the sentence already settles', () => {
    const heard =
      "Un professeur que j'admire, c'est mon professeur de sciences. Il est très passionnant quand il donne des leçons. En plus, il toujours m'encourage à étudier et à travailler dur. Enfin, grâce à lui, j'ai obtenu de bonnes notes dans sa matière.";
    const other = heard.replace("m'encourage", 'mon courage').replace('obtenu de bonnes', 'obtenu des bonnes');
    const { onConfirm } = setup(whisper(heard, other));
    expect(screen.queryAllByTestId('uncertain-word')).toHaveLength(0);
    expect(screen.queryByText(/weren’t sure/i)).toBeNull();
    expect(screen.getByTestId('heard-text').textContent).toContain("m'encourage");
    expect(screen.getByTestId('heard-text').textContent).toContain('de bonnes notes');
    fireEvent.click(screen.getByText('Use this'));
    expect(onConfirm).toHaveBeenCalledWith({ text: expect.stringContaining("m'encourage"), edited: false, source: 'whisper' });
  });

  it('fills in the fitting reading when the other recogniser was the one who had it', () => {
    const { onConfirm } = setup(whisper('il mon courage à étudier et j\'ai des bonnes notes', "il m'encourage à étudier et j'ai de bonnes notes"));
    expect(screen.queryAllByTestId('uncertain-word')).toHaveLength(0);
    expect(screen.getByTestId('heard-text').textContent).toBe("il m'encourage à étudier et j'ai de bonnes notes");
    fireEvent.click(screen.getByText('Use this'));
    expect(onConfirm).toHaveBeenCalledWith({
      text: "il m'encourage à étudier et j'ai de bonnes notes",
      edited: false,
      source: 'whisper',
    });
  });
});
