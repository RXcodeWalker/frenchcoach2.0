/**
 * End-to-end coverage of the Cambridge 0520 exam flow (`npm run e2e:exam`),
 * driven against a real dev server + the fake scoring service
 * (scripts/e2e/fakeScoringServer.ts — see playwright.config.ts). No
 * credentials of any kind: speech input is faked via
 * e2e/fixtures/fakeSpeechRecognition.js (a fake webkitSpeechRecognition,
 * addInitScript-injected), and the app's guest/offline path (no
 * VITE_SUPABASE_URL configured) is used as-is rather than mocked — verified
 * separately to need no network calls for this flow.
 *
 * Covers Step 1 (extension-prompt-not-repeat on a short answer), Step 2
 * (a further question's answer reaching the Turn-by-Turn panel), Step 5/6
 * (Exam Sim mic-only/read-only/full /40 with subtotals vs Coached's
 * practice-mark banner and history tag), and that Daily Challenge/Duel runs
 * are forced into Exam Sim.
 */
import { test, expect, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AUTHORIZED_EXTENSION_PROMPTS } from '../src/domain/igcse/session/conductEngine';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FAKE_SR_SCRIPT = fs.readFileSync(path.join(__dirname, 'fixtures/fakeSpeechRecognition.js'), 'utf-8');

async function bodyText(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText);
}

async function skipOnboardingIfShown(page: Page) {
  const skip = page.getByRole('button', { name: 'Skip for now' });
  try {
    await skip.first().waitFor({ state: 'visible', timeout: 4000 });
    await skip.first().click({ force: true });
  } catch {
    // already past onboarding
  }
}

async function clickButton(page: Page, name: string | RegExp, timeout = 8000): Promise<boolean> {
  const loc = page.getByRole('button', { name });
  try {
    await loc.first().waitFor({ state: 'visible', timeout });
  } catch {
    return false;
  }
  await loc.first().click({ force: true });
  return true;
}

/**
 * Sets the fake recognizer's next result, then drives one mic start/stop
 * cycle. The mic button is `disabled` while ExamRunner is mid-transition
 * between turns (turnBusy, plus the examiner-pacing leads in
 * examinerPacing.ts — up to ~900ms per action, more when a turn emits
 * several actions, e.g. TRANSITION + READ_MAIN back to back) — waiting for
 * it to become enabled (rather than a fixed sleep) is what makes this
 * reliable regardless of how many actions the previous turn produced. This
 * may be the exam's LAST turn (advancing straight to the review screen,
 * where the mic button no longer exists at all) — waiting for either
 * outcome after submitting, rather than a fixed sleep, is what lets the
 * caller's loop safely re-check for the review heading on its next
 * iteration instead of racing a still-transitioning UI.
 */
async function submitSpokenAnswer(page: Page, text: string) {
  await page.evaluate((t) => {
    (window as unknown as { __fakeSpeechNextAnswer: string }).__fakeSpeechNextAnswer = t;
  }, text);

  await page.waitForFunction(
    () => {
      const btn = document.querySelector('button[aria-label="Start recording"]') as HTMLButtonElement | null;
      return !!btn && !btn.disabled;
    },
    undefined,
    { timeout: 15000 },
  );
  await page.getByRole('button', { name: 'Start recording' }).click({ force: true });
  await page.getByRole('button', { name: 'Stop and submit' }).waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(250); // let the fake recognizer's onresult land
  await page.getByRole('button', { name: 'Stop and submit' }).click({ force: true });

  await page.waitForFunction(
    () => {
      const reviewShown = document.body.innerText.includes('Review Your Transcript');
      const btn = document.querySelector('button[aria-label="Start recording"]') as HTMLButtonElement | null;
      return reviewShown || (!!btn && !btn.disabled);
    },
    undefined,
    { timeout: 15000 },
  );
  await page.waitForTimeout(150);
}

/**
 * D3/D4 (0520 conduct plan, Batch 3): Exam Sim no longer offers set picking
 * (a single "Start Exam Sim" button instead — the set is chosen for the
 * candidate) and the role-play prep card is a real 10:00 countdown, not a
 * Begin button.
 *
 * These full-exam flows use the "Start now" escape hatch rather than
 * fast-forwarding the real countdown — driving 600 fake-clock ticks through
 * the rest of a multi-turn exam (examinerPacing's own real setTimeout waits,
 * TTS, etc.) is a lot of surface to keep synchronized with a faked clock for
 * no assertion gain here, since D3 conduct itself doesn't change. "Start now"
 * makes the attempt practice-only (D3), which the assertions below now
 * expect. The real 10:00 countdown path (page.clock driving the component's
 * own setInterval, then auto-advancing at 0:00 into a COUNTING attempt) is
 * covered on its own, much shorter, in the dedicated test below.
 */
async function enterExam(page: Page, mode: 'sim' | 'coached') {
  await page.goto('/exam');
  await skipOnboardingIfShown(page);
  await page.waitForSelector('text=Choose an Exam', { timeout: 15000 });

  if (mode === 'coached') {
    await page.getByRole('button', { name: /Coached Practice/ }).click({ force: true });
    await page.locator('.grid button').first().click({ force: true });
  } else {
    await clickButton(page, 'Start Exam Sim');
  }

  await page.waitForTimeout(600);
  await clickButton(page, /Je suis prêt/);
  await page.waitForTimeout(800);
  await clickButton(page, 'Start exam');
  await page.waitForTimeout(800);

  if (mode === 'sim') {
    await clickButton(page, 'Start now');
  } else {
    await clickButton(page, 'Begin');
  }
  await page.waitForTimeout(800);
}

test.describe('Exam Sim prep countdown (D3)', () => {
  test('the real 10:00 countdown runs down and auto-advances at 0:00 — a COUNTING attempt, not "Start now"', async ({ page }) => {
    // Installed before navigation (Playwright's documented pattern) so the
    // fake clock is in place before RolePlayCardPreview's setInterval is ever
    // created — a clock installed after that point can't see, or fast-forward,
    // a timer the real (unfaked) window.setInterval already scheduled. No
    // pauseAt: the clock auto-ticks with real time until explicitly advanced.
    await page.clock.install();
    await page.goto('/exam');
    await skipOnboardingIfShown(page);
    await page.waitForSelector('text=Choose an Exam', { timeout: 15000 });
    await clickButton(page, 'Start Exam Sim');
    await page.waitForTimeout(600);
    await clickButton(page, /Je suis prêt/);
    await page.waitForTimeout(800);
    await clickButton(page, 'Start exam');
    await page.waitForTimeout(800);

    await page.waitForSelector('text=Role play card · preparation', { timeout: 8000 });

    // runFor (not fastForward) is what actually fires the component's
    // setInterval tick-by-tick, rather than jumping straight to the end and
    // firing the interval once — confirmed here by the on-screen countdown
    // itself moving, not just by the eventual auto-advance.
    await page.clock.runFor(30_000);
    await page.waitForSelector('text=9:30', { timeout: 4000 }); // 10:00 - 0:30

    await page.clock.runFor(570_000); // the remaining 9:30, down to 0:00

    // Auto-advanced into the running exam with no "Start now"/Begin click.
    await page.waitForSelector('text=Role play card · preparation', { state: 'detached', timeout: 8000 });
    await expect(page.getByRole('button', { name: 'End exam' })).toBeVisible({ timeout: 8000 });
  });
});

test.describe('Exam Sim (spoken)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(FAKE_SR_SCRIPT);
  });

  test('extension prompt on a short answer, no keyboard, read-only review, further question in Turn-by-Turn, /40 with subtotals, no time-frame/filler chips', async ({ page }) => {
    await enterExam(page, 'sim');

    // Mic-only: no textarea anywhere in the running screen.
    expect(await page.locator('textarea').count()).toBe(0);

    let shortAnswerSubmitted = false;
    let extensionAsserted = false;

    // exam-conduct §7/§9 (D13): a role-play advance can now also emit an
    // in-role TRANSITION, but that's an extra EXAMINER action, not an extra
    // candidate turn — this loop counts turns, so the cap is unchanged by D13.
    for (let i = 0; i < 45; i++) {
      const before = await bodyText(page);
      if (before.includes('Review Your Transcript')) break;

      const inTopic = /TOPIC CONVERSATION/.test(before);
      let answer: string;
      if (inTopic && !shortAnswerSubmitted) {
        answer = "L'été.";
      } else if (inTopic) {
        answer = 'Je fais beaucoup de choses avec mes amis le week-end, comme le sport et le cinéma.';
      } else {
        answer = "Bonjour, je voudrais un billet pour Paris, s'il vous plaît, à quatorze heures.";
      }

      await submitSpokenAnswer(page, answer);

      if (inTopic && !shortAnswerSubmitted) {
        shortAnswerSubmitted = true;
        const after = await bodyText(page);
        const gotExtension = AUTHORIZED_EXTENSION_PROMPTS.some((p) => after.includes(p));
        // The one-word answer must be extended, never repeated verbatim as a
        // fresh "QUESTION" re-read and never bounced to the alternative.
        expect(gotExtension, `expected an extension prompt after "L'été.", got:\n${after.slice(-800)}`).toBe(true);
        extensionAsserted = true;
      }
    }

    expect(extensionAsserted).toBe(true);

    // Reached review — read-only (Exam Sim), never editable.
    await page.waitForSelector('text=Review Your Transcript', { timeout: 10000 });
    expect(await page.locator('textarea').count()).toBe(0);
    expect(await bodyText(page)).toContain('marked exactly as recorded');

    await clickButton(page, 'Submit for marking');

    // Scoring against the fake server, then results.
    await page.waitForSelector('text=Practice Session Complete', { timeout: 20000 });
    const results = await bodyText(page);
    expect(results).toContain('/40');
    // D3 (Batch 3): entering via "Start now" makes this attempt practice-only.
    expect(results.toLowerCase()).toContain('practice mark');
    expect(results).toContain('You started before the preparation time was over');

    // Subtotal labels (Step 6): /2 per role-play task, /10 subtotal, /15 per criterion.
    expect(results).toMatch(/2\/2/);
    expect(results).toMatch(/\/10/);
    expect(results).toMatch(/15\/15/);

    // Step 6: no time-frame/filler mis-teaching in the Turn-by-Turn panel.
    await clickButton(page, 'Turn-by-Turn Breakdown');
    const withTurns = await bodyText(page);
    expect(withTurns.toLowerCase()).not.toContain('time frame');
    expect(withTurns.toLowerCase()).not.toContain('filler density');
    // Step 2: the further question's answer is projected into the panel.
    expect(withTurns).toMatch(/further1|further2/i);
  });
});

test.describe('Coached Practice (typed + edited)', () => {
  test('typed answer, an edit in review, /40 with the practice banner, and a "practice" tag in history', async ({ page }) => {
    await enterExam(page, 'coached');

    async function submitTyped(text: string) {
      const box = page.locator('textarea').first();
      await box.waitFor({ state: 'visible', timeout: 8000 });
      await box.fill(text);
      await box.press('Enter');
      await page.waitForTimeout(500);
    }

    // Role play (up to 6 turns — rp3 is two-part), then topic1+topic2 with
    // typed, developed answers (avoids extension detours here — that conduct
    // path is already asserted in the Exam Sim test above). D5 (Batch 3):
    // Coached now always asks both authored further questions per topic,
    // never time-gated, so this loop budgets 4 extra turns (2 topics x 2
    // further questions) beyond the pre-D5 cap.
    for (let i = 0; i < 50; i++) {
      const current = await bodyText(page);
      if (current.includes('Review Your Transcript')) break;
      const answer = /TOPIC CONVERSATION/.test(current)
        ? "Le week-end dernier, j'ai fait du sport avec mes amis et nous sommes allés au cinéma ensemble."
        : "Un aller simple pour Paris, s'il vous plaît, à quatorze heures.";
      await submitTyped(answer);
    }

    await page.waitForSelector('text=Review Your Transcript', { timeout: 10000 });
    // Coached is editable — make one real edit (userCorrected: true).
    const firstBox = page.locator('textarea').first();
    await firstBox.fill('Un aller simple pour Paris, s’il vous plaît (corrigé).');

    await clickButton(page, 'Confirm & Finish');

    await page.waitForSelector('text=Practice Session Complete', { timeout: 20000 });
    const results = await bodyText(page);
    expect(results).toContain('/40');
    expect(results.toLowerCase()).toContain('practice mark');
    expect(results.toLowerCase()).toContain('doesn');
    expect(results.toLowerCase()).toContain('coached practice');

    // D5 (Batch 3): Coached always asks both authored further questions per
    // topic (not time-based) — their answers must still reach the panel.
    await clickButton(page, 'Turn-by-Turn Breakdown');
    const withTurns = await bodyText(page);
    expect(withTurns).toMatch(/further1|further2/i);

    // History tag: navigate to the Progress screen's History tab directly.
    // domcontentloaded, not the default 'load' — a lingering background poll
    // (e.g. the scoring keepalive) can keep the network idle/load event from
    // firing for a while after navigation, long after the SPA has rendered.
    await page.goto('/progress?tab=history', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const historyText = await bodyText(page);
    expect(historyText.toLowerCase()).toContain('practice');
  });
});

test.describe('Daily Challenge / Duel force Exam Sim', () => {
  /**
   * dailyChallengeService.ts/duelsService.ts gate on `supabaseConfigured`
   * (no Supabase project in this sandbox), so their own Start buttons can't
   * be driven end-to-end here without a real or stubbed Supabase project —
   * that full lifecycle (assignment fetch, start RPC, submit RPC) is NOT
   * exercised by this test; see the report for that limitation.
   *
   * What IS exercised, live: ExamMode.tsx has two mount-time effects
   * (isDailyChallengeRun / isDuelRun, ~line 305) that fire whenever
   * location.state carries the same {dailyChallengeDate, questionSetId,
   * sessionId} / {duelId, questionSetId, sessionId} shape those two screens'
   * onClick handlers navigate with — regardless of whether the question set
   * id actually resolves — and jump straight to 'intro', skipping ExamSelect
   * (the mode picker) entirely. `coached` is then resolveCoachedMode(...,
   * true) => forced false. We reproduce that exact navigation shape with
   * React Router's own history mechanism (pushState with the {usr,...}
   * shape createBrowserHistory reads) plus a reload so ExamMode mounts fresh
   * with that state already in place — the same as a real
   * `navigate('/exam', {state})` followed by a fresh page load, not an
   * ExamMode-internal hack.
   */
  async function loadExamWithState(page: Page, state: Record<string, unknown>) {
    await page.goto('/exam');
    await skipOnboardingIfShown(page);
    await page.waitForSelector('text=Choose an Exam', { timeout: 15000 });
    await page.evaluate((s) => {
      window.history.replaceState({ usr: s, key: 'e2e', idx: 0 }, '', '/exam');
    }, state);
    await page.reload();
  }

  test('Daily Challenge navigation state skips ExamSelect and forces Exam Sim', async ({ page }) => {
    await loadExamWithState(page, {
      dailyChallengeDate: '2026-01-01',
      questionSetId: 'e2e-fake-daily-set',
      sessionId: 'e2e-daily-session',
    });

    // ExamSelect (the mode picker) must never appear for this run.
    await expect(page.getByText('Choose an Exam')).toHaveCount(0);
    await page.waitForSelector('text=EXAM SIM', { timeout: 10000 });
    const text = await bodyText(page);
    expect(text).toContain('EXAM SIM');
    expect(text).not.toContain('COACHED PRACTICE');
  });

  test('Duel navigation state skips ExamSelect and forces Exam Sim', async ({ page }) => {
    await loadExamWithState(page, {
      duelId: 'e2e-fake-duel',
      questionSetId: 'e2e-fake-duel-set',
      sessionId: 'e2e-duel-session',
    });

    await expect(page.getByText('Choose an Exam')).toHaveCount(0);
    await page.waitForSelector('text=EXAM SIM', { timeout: 10000 });
    const text = await bodyText(page);
    expect(text).toContain('EXAM SIM');
    expect(text).not.toContain('COACHED PRACTICE');
  });
});
