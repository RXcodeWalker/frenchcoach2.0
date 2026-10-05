/**
 * End-to-end coverage of the opt-in exam pronunciation analysis (exam-
 * pronunciation plan Batch 6): feedback only, never a mark.
 *
 * Runs as its own Playwright project against its own Vite server
 * (playwright.config.ts, `exam-pronunciation`), because the feature is gated
 * to an admin and the app only loads a Supabase session when
 * VITE_SUPABASE_URL is set — which the main `exam` project deliberately
 * leaves unset so it keeps exercising the guest/offline path. This server
 * points that URL at a host that does not exist and answers every call to it
 * here with `page.route`, alongside a stubbed admin session and profile.
 *
 * /api/exam/pronunciation is stubbed too (no Azure, no backend). The browser's
 * fake microphone supplies the real recordings the client normalises, trims
 * and uploads, so the audio path up to the network call is real.
 *
 * Covers: Exam Sim — nothing before the report, one button, the section
 * fills in, the /40 text is identical before and after; the budget-exhausted
 * message with the exam still complete; Coached — a card after the role play,
 * only on a tap, never a number.
 */
import { test, expect, type Page } from '@playwright/test';
import { FAKE_SR_SCRIPT, bodyText, clickButton, enterExam, submitSpokenAnswer } from './helpers/examFlow';

const SUPABASE_HOST = 'e2e-stub.supabase.test';
/** supabase-js stores the session under `sb-<first label of the host>-auth-token`. */
const SESSION_KEY = 'sb-e2e-stub-auth-token';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization,content-type,apikey,x-client-info,accept-profile,content-profile,prefer,range',
  'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
};

/** An admin's Supabase session in localStorage, plus quiet answers for every call to the stub host. */
async function installAdminSession(page: Page) {
  await page.addInitScript((key) => {
    const now = Math.floor(Date.now() / 1000);
    window.localStorage.setItem(
      key,
      JSON.stringify({
        access_token: 'e2e-access-token',
        token_type: 'bearer',
        expires_in: 31_536_000,
        expires_at: now + 31_536_000,
        refresh_token: 'e2e-refresh-token',
        user: {
          id: '00000000-0000-4000-8000-000000000001',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'e2e-admin@example.test',
          app_metadata: { role: 'admin', provider: 'email' },
          user_metadata: {},
          created_at: '2026-01-01T00:00:00Z',
        },
      }),
    );
  }, SESSION_KEY);

  await page.route(`**/${SUPABASE_HOST}/**`, (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    return route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: '[]' });
  });
  await page.route(`**/${SUPABASE_HOST}/rest/v1/profiles**`, (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const profile = { age_band: '13_plus', consent_status: '13_plus_not_required', invite_status: 'redeemed' };
    const single = (route.request().headers()['accept'] ?? '').includes('pgrst.object');
    return route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(single ? profile : [profile]) });
  });
}

/** Every word of these is "mispronounced" in the stubbed evidence: nasal vowels with no r, so the fairness rules report them. */
const STUB_FLAGGED_WORDS = /^(souvent|mon|cousin|chien)$/i;
/** One answer reused for every turn: nasal-vowel words to flag, nothing the examiner needs to react to. */
const ANSWER = 'Je vais souvent au cinéma avec mon cousin et mon chien le week-end.';
/** A recording long enough for the 0.4 s minimum and the silence trim to find something in. */
const HOLD_MS = 1500;

type Part = 'rolePlay' | 'topic1' | 'topic2';
const PART_ORDER: Part[] = ['rolePlay', 'topic1', 'topic2'];

/**
 * Stubs POST/GET /api/exam/pronunciation. `exhaustedFrom` makes that part (and
 * every later one) answer `budget_exhausted`, as the backend does once the
 * monthly cap is reached. Returns the POSTs it received.
 */
async function stubPronunciationApi(page: Page, opts: { exhaustedFrom?: Part } = {}) {
  const posts: Array<{ part: string; turnKey: string }> = [];
  await page.route('**/api/exam/pronunciation**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    if (request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ turns: [] }) });
    }
    const body = (request.postDataBuffer() ?? Buffer.alloc(0)).toString('latin1');
    const field = (name: string) => new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r]*)\\r\\n`).exec(body)?.[1] ?? '';
    const part = field('part');
    posts.push({ part, turnKey: field('turn_key') });

    if (opts.exhaustedFrom && PART_ORDER.indexOf(part as Part) >= PART_ORDER.indexOf(opts.exhaustedFrom)) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS,
        body: JSON.stringify({ status: 'budget_exhausted', turn: null }),
      });
    }
    // Form fields arrive as UTF-8 bytes; the body was read as latin1.
    const transcript = Buffer.from(field('exam_transcript'), 'latin1').toString('utf8');
    const words = transcript
      .split(/\s+/)
      .filter(Boolean)
      .map((token, i) => {
        const word = token.replace(/[^\p{L}'-]/gu, '');
        const flagged = STUB_FLAGGED_WORDS.test(word);
        return {
          word,
          accuracyScore: flagged ? 10 : 92,
          errorType: flagged ? 'mispronounced' : 'correct',
          offsetMs: 300 + i * 500,
          durationMs: 400,
          nearChunkBoundary: false,
          phonemeScores: [flagged ? 10 : 92],
          examWord: word,
          recognizersAgree: true,
          suppressed: [],
        };
      });
    const turn = {
      sessionId: field('session_id'),
      part,
      turnKey: field('turn_key'),
      assessorVersion: 'exam-pronunciation-v1',
      fairnessVersion: field('fairness_version'),
      examTranscript: transcript,
      referenceText: words.map((w) => w.word).join(' '),
      words,
      couldNotAssess: false,
      couldNotAssessReason: null,
      singleRecognizer: false,
      snrDb: 25,
      azureConfidence: 0.9,
      chunkCount: 1,
      chunksFailed: 0,
      rawS: Number(field('raw_s')) || null,
      trimmedS: 2,
      pauseStats: { pausesOver2s: 1, longestPauseS: 2.5 },
      clippedRatio: 0,
      createdAt: null,
    };
    return route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ status: 'done', turn }) });
  });
  return posts;
}

/** Drives a whole spoken Exam Sim attempt (via "Start now") to the results screen. */
async function runSpokenExamToResults(page: Page) {
  await enterExam(page, 'sim');
  for (let i = 0; i < 50; i++) {
    if ((await bodyText(page)).includes('Review Your Transcript')) break;
    await submitSpokenAnswer(page, ANSWER, HOLD_MS);
  }
  await page.waitForSelector('text=Review Your Transcript', { timeout: 10000 });
  await clickButton(page, 'Submit for marking');
  await page.waitForSelector('text=Practice Session Complete', { timeout: 30000 });
  // let the examiner report settle so only the pronunciation section can change afterwards
  await expect(page.getByTestId('exam-feedback').getByText('What you did well').first()).toBeVisible({ timeout: 20000 });
}

/** The marks as the candidate sees them: the /40 total and the criteria card. */
async function marksSnapshot(page: Page): Promise<{ total: string; card: string }> {
  const total = /(\d+)\s*\/40/.exec(await bodyText(page))?.[0] ?? '';
  const card = await page
    .getByText('Marks — Unvalidated Estimate')
    .locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]')
    .innerText();
  return { total, card };
}

test.describe('Exam pronunciation (opt-in, feedback only)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(FAKE_SR_SCRIPT);
    await installAdminSession(page);
  });

  test('Exam Sim: the report gets one button, nothing is sent before it, the section fills in, and the marks do not move', async ({ page }) => {
    test.setTimeout(420_000);
    const posts = await stubPronunciationApi(page);
    await runSpokenExamToResults(page);

    const section = page.getByTestId('exam-pronunciation');
    await expect(section).toBeVisible();
    // after the marks and the examiner report, never inside either
    await expect(page.getByTestId('exam-feedback').locator('xpath=following::*[@data-testid="exam-pronunciation"]')).toHaveCount(1);
    const button = section.getByRole('button', { name: 'Analyse my pronunciation' });
    await expect(button).toBeVisible();
    expect(posts).toHaveLength(0); // nothing analysed automatically
    const before = await marksSnapshot(page);
    expect(before.total).toMatch(/\d+\s*\/40/);

    await button.click();
    await expect(page.getByTestId('pronunciation-part-topic2')).toBeVisible({ timeout: 90_000 });
    expect(new Set(posts.map((p) => p.part))).toEqual(new Set(PART_ORDER));

    // words, a pattern, a fluency note and the practice link — and no number
    const topic1 = page.getByTestId('pronunciation-part-topic1');
    await expect(topic1.getByRole('button', { name: 'souvent' }).first()).toBeVisible();
    await expect(page.getByTestId('pronunciation-patterns').getByText('Nasal vowels')).toBeVisible();
    await expect(page.getByTestId('pronunciation-fluency')).toContainText('more than 2 seconds');
    await expect(section.getByRole('link', { name: /Accent Analyzer/ })).toHaveAttribute('href', '/accent-analyzer');
    expect(await section.innerText()).not.toMatch(/\d+\s*\/\s*\d+/);

    // tap a word: the recording is still in this tab, so "You" is offered
    await topic1.getByRole('button', { name: 'souvent' }).first().click();
    await expect(page.getByTestId('pronunciation-word-panel').getByRole('button', { name: /You/ })).toBeVisible();

    expect(await marksSnapshot(page)).toEqual(before); // the /40 text is identical before and after
  });

  test('Exam Sim: when the monthly allowance is spent the section says so, and the exam is still complete', async ({ page }) => {
    test.setTimeout(420_000);
    await stubPronunciationApi(page, { exhaustedFrom: 'topic1' });
    await runSpokenExamToResults(page);
    const before = await marksSnapshot(page);

    const section = page.getByTestId('exam-pronunciation');
    await section.getByRole('button', { name: 'Analyse my pronunciation' }).click();
    await expect(section.getByText('Pronunciation analysis is unavailable until next month.')).toBeVisible({ timeout: 90_000 });
    // the part analysed before the allowance ran out is kept
    await expect(page.getByTestId('pronunciation-part-rolePlay')).toBeVisible();
    await expect(section.getByRole('button', { name: 'Analyse my pronunciation' })).toHaveCount(0);

    expect(await marksSnapshot(page)).toEqual(before);
    await expect(page.getByText('Practice Session Complete')).toBeVisible();
  });

  test('Coached: a card appears when the role play ends, and nothing is sent until it is tapped', async ({ page }) => {
    test.setTimeout(300_000);
    const posts = await stubPronunciationApi(page);
    await enterExam(page, 'coached');

    const card = page.getByTestId('pronunciation-card-rolePlay');
    for (let i = 0; i < 12; i++) {
      if ((await bodyText(page)).includes('TOPIC CONVERSATION')) break;
      await expect(card).toHaveCount(0); // never mid-part, never per answer
      await submitSpokenAnswer(page, ANSWER, HOLD_MS);
    }
    await page.waitForSelector('text=TOPIC CONVERSATION', { timeout: 15000 });

    await expect(card).toBeVisible({ timeout: 10000 });
    await expect(card.getByText('Role play done')).toBeVisible();
    expect(posts).toHaveLength(0); // opt-in: nothing analysed automatically

    await card.getByRole('button', { name: 'Analyse my pronunciation' }).click();
    await expect(card.getByText(/Worth another listen/)).toBeVisible({ timeout: 60_000 });
    expect(posts.length).toBeGreaterThan(0);
    expect(posts.every((p) => p.part === 'rolePlay')).toBe(true);
    const text = await card.innerText();
    expect(text).not.toMatch(/\d/); // never a number
    expect(text).toContain('Nasal vowels');
    // the exam carries on, and no later part has a card yet
    await expect(page.getByTestId('pronunciation-card-topic1')).toHaveCount(0);
  });
});
