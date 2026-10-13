/**
 * Exam answers marked from batch ASR (Whisper) with a live-captions fallback
 * (`npm run e2e:exam`, project "exam"). The live captions are the fake
 * recognizer (e2e/fixtures/fakeSpeechRecognition.js); /api/transcribe is
 * answered by page.route, so the real client path runs without a backend:
 * the background transcriber, the review screen, scoring against the fake
 * scoring service, and the results notice.
 *
 *  1. online: the review screen shows Whisper's text, not the live captions;
 *  2. network off after the first answers are read: later answers fall back, the review
 *     screen and (after scoring) the results page say they were marked from
 *     live captions.
 */
import { test, expect, type Page } from '@playwright/test';
import {
  FAKE_SR_SCRIPT,
  bodyText,
  clickButton,
  enterExam,
  submitSpokenAnswer,
} from './helpers/examFlow';

const LIVE_ANSWER = "Bonjour, je voudrais un billet pour Paris, s'il vous plaît, à quatorze heures.";

/** Answers /api/transcribe with a numbered Whisper reading; records what the client sent. */
async function mockWhisper(page: Page) {
  const sent: { purpose: string | null; prompt: string | null }[] = [];
  const network = { offline: false };
  let n = 0;
  await page.route('**/api/transcribe', async (route) => {
    // Playwright answers intercepted requests even under context.setOffline, so "network off" is
    // modelled here too: the request fails the way a dropped connection does.
    if (network.offline) {
      await route.abort('internetdisconnected');
      return;
    }
    n += 1;
    const body = route.request().postData() ?? '';
    const field = (name: string) => new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r]*)`).exec(body)?.[1] ?? null;
    sent.push({ purpose: field('purpose'), prompt: field('prompt') });
    const text = `Lecture Whisper numéro ${n} avec assez de mots pour une vraie réponse`;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        text,
        language: 'fr',
        source: 'groq-whisper',
        model: 'whisper-large-v3',
        segments: [{ start: 0, end: 2, text, avgLogprob: -0.2, noSpeechProb: 0.01, compressionRatio: 1.2 }],
        words: [],
      }),
    });
  });
  return { sent, network };
}

/** Drives answers until the review screen appears; calls `afterTurn(i)` after each submitted answer. */
async function answerUntilReview(page: Page, afterTurn?: (i: number) => Promise<void>) {
  for (let i = 0; i < 45; i++) {
    if ((await bodyText(page)).includes('Review Your Transcript')) break;
    await submitSpokenAnswer(page, LIVE_ANSWER);
    await afterTurn?.(i);
  }
  await page.waitForSelector('text=Review Your Transcript', { timeout: 60_000 });
}

test.describe('Exam Sim — answers marked from Whisper, live captions as fallback', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(FAKE_SR_SCRIPT);
  });

  test('review shows Whisper\'s text (with the question as context), not the live captions', async ({ page }) => {
    const { sent } = await mockWhisper(page);
    await enterExam(page, 'sim');
    await answerUntilReview(page);

    const review = await bodyText(page);
    expect(review).toContain('Lecture Whisper numéro 1');
    expect(review).not.toContain('à quatorze heures');
    await expect(page.getByTestId('live-captions-notice')).toHaveCount(0);

    expect(sent.length).toBeGreaterThan(3);
    expect(sent.every((s) => s.purpose === 'exam_turn')).toBe(true);
    expect(sent.every((s) => (s.prompt ?? '').length > 0)).toBe(true);

    await clickButton(page, 'Submit for marking');
    await page.waitForSelector('text=Practice Session Complete', { timeout: 30_000 });
    await expect(page.getByTestId('live-captions-notice')).toHaveCount(0);
  });

  test('with the network off, later answers fall back to live captions and both screens say so', async ({ page, context }) => {
    const { sent, network } = await mockWhisper(page);
    await enterExam(page, 'sim');

    // A turn's recording is handed to Whisper once the examiner has finished speaking the next
    // line (headless Chromium has no speech synthesis, so that happens when the next recording
    // starts) — by the end of the second turn the first answer has been read, so go offline then.
    let wentOffline = false;
    await answerUntilReview(page, async (i) => {
      if (!wentOffline && i === 1) {
        await expect.poll(() => sent.length, { timeout: 10_000 }).toBeGreaterThanOrEqual(1);
        network.offline = true;
        await context.setOffline(true);
        wentOffline = true;
      }
    });
    expect(wentOffline).toBe(true);

    const review = await bodyText(page);
    expect(review).toContain('Lecture Whisper numéro 1'); // answered while online
    expect(review).toContain(LIVE_ANSWER); // the rest were read from the live captions
    const notice = page.getByTestId('live-captions-notice');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText(/answers will be marked from live captions/);
    expect(await page.getByTestId('live-captions-chip').count()).toBeGreaterThan(3);

    // Back online so the (fake) scoring service can be reached.
    network.offline = false;
    await context.setOffline(false);
    await clickButton(page, 'Submit for marking');
    await page.waitForSelector('text=Practice Session Complete', { timeout: 30_000 });
    await expect(page.getByTestId('live-captions-notice')).toContainText(/answers were marked from live captions/);
  });
});
