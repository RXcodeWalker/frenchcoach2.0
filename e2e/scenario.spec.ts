/**
 * Scenario role-play (`/scenario/:id`): one spoken turn must end with the
 * coaching notes showing the AI feedback, not "Checking your answer…" forever.
 *
 * Regression for 2026-10-30: the screen treated "not ready to award XP yet"
 * as "stale" and threw every first result away, so the panel never left its
 * loading state. Speech is faked (fakeSpeechRecognition.js) and the coach
 * backend's `/api/feedback/v3` is answered by `page.route` — no credentials.
 */
import { test, expect } from '@playwright/test';
import { FAKE_SR_SCRIPT, skipOnboardingIfShown } from './helpers/examFlow';

const ANSWER = "Je voudrais un café, s'il vous plaît.";
const IMPROVED = "Bonjour, je voudrais un grand café crème, s'il vous plaît.";

/** A minimal contract-v3 coach reply (shape: src/services/api/__fixtures__/feedback-contract/). */
const FEEDBACK = {
  schemaVersion: 3,
  provider: 'groq',
  transcript: ANSWER,
  transcriptHash: 'e2e-scenario',
  scores: { comm: 7, know: 6.5, acc: 7 },
  cefrLevel: 'A2',
  grammar: { critical: [], polish: [] },
  corrections: [],
  quoteSpans: [],
  vocabulary: [],
  expansion_ideas: [],
  encouragement: 'You ordered politely with « s\'il vous plaît ».',
  strengths: [{ quote: "s'il vous plaît", why: 'You were polite, which fits a café.' }],
  best_moment: 'Your « s\'il vous plaît » is exactly right for a café.',
  biggest_opportunity: 'Add the size or type, e.g. « un grand café crème ».',
  improved_answer: IMPROVED,
  advanced_answer: '',
  wordCount: 7,
};

test.describe('Scenario role play', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(FAKE_SR_SCRIPT);
  });

  test('a spoken turn shows its feedback instead of spinning on "Checking your answer…"', async ({ page }) => {
    let feedbackRequests = 0;
    await page.route('**/api/feedback/v3', async (route) => {
      feedbackRequests += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FEEDBACK) });
    });

    await page.goto('/scenario/cafe');
    await skipOnboardingIfShown(page);
    if (!page.url().includes('/scenario/cafe')) await page.goto('/scenario/cafe');

    await page.getByRole('button', { name: /Start role play/ }).click();

    await page.evaluate((t) => {
      (window as unknown as { __fakeSpeechNextAnswer: string }).__fakeSpeechNextAnswer = t;
    }, ANSWER);
    await page.getByRole('button', { name: 'Record your answer' }).click();
    await page.getByRole('button', { name: 'Stop recording' }).waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForTimeout(250); // let the fake recognizer's result land
    await page.getByRole('button', { name: 'Stop recording' }).click();

    // On a narrow viewport the notes live behind a toggle.
    const notesToggle = page.getByRole('button', { name: 'Show mission and coaching notes' });
    if (await notesToggle.isVisible()) await notesToggle.click();

    await expect(page.getByText(IMPROVED)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Checking your answer…')).toHaveCount(0);
    expect(feedbackRequests).toBe(1);
  });
});
