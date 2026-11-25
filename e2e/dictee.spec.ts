/**
 * Dictée (Explore → listen and type), in a real browser. The page has no French
 * voice in CI, so a fake one is installed before the app loads: it records what
 * it is asked to say and "finishes" a moment later. The point of the spec is
 * that the whole loop works against the real app — the tile, the round, the
 * marking, the saved best — and that Dictée never reaches a server.
 */
import { test, expect, type Page } from '@playwright/test';
import { skipOnboardingIfShown } from './helpers/examFlow';

const FAKE_FRENCH_VOICE = `
  window.__spoken = [];
  const voice = { lang: 'fr-FR', name: 'Fake French', localService: true, default: true, voiceURI: 'fake-fr' };
  window.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text; this.lang = ''; this.rate = 1; this.pitch = 1; this.volume = 1; this.voice = null; }
  };
  const synth = window.speechSynthesis;
  synth.getVoices = () => [voice];
  synth.cancel = () => {};
  synth.speak = (u) => {
    window.__spoken.push({ text: u.text, rate: u.rate });
    setTimeout(() => u.onstart && u.onstart({}), 5);
    setTimeout(() => u.onend && u.onend({}), 60);
  };
`;

const spoken = (page: Page) => page.evaluate(() => (window as unknown as { __spoken: { text: string; rate: number }[] }).__spoken);
const lastSpoken = async (page: Page) => (await spoken(page)).at(-1)!.text;

async function openDictee(page: Page) {
  await page.goto('/explore');
  await skipOnboardingIfShown(page);
  await page.goto('/explore');
  await page.getByRole('button', { name: /Dictée/ }).first().click();
  await expect(page.getByTestId('dictee-start')).toBeVisible();
  // The app re-mounts its routes once while it settles after load (the guest identity resolves); a round started
  // in that first second would be thrown away with them. A learner doesn't click that fast; a test does.
  await page.waitForTimeout(2000);
}

test.describe('Dictée', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(FAKE_FRENCH_VOICE);
  });

  test('a round of sentences: hear it, type it, see what slipped, keep the best — and never call a server', async ({ page }) => {
    const apiCalls: string[] = [];
    page.on('request', req => {
      const url = new URL(req.url());
      if (url.pathname.startsWith('/api/') || /supabase|scoring/.test(url.host)) apiCalls.push(req.url());
    });

    await openDictee(page);
    await page.getByRole('button', { name: /Sentences/ }).click();
    await page.getByTestId('dictee-start').click();

    // the first line plays by itself, once
    await expect(page.getByTestId('dictee-progress')).toHaveText('Sentence 1 of 6');
    await expect.poll(async () => (await spoken(page)).length).toBe(1);
    await expect(page.getByTestId('dictee-answer')).toBeFocused();

    // slower plays the same line at a lower rate
    await page.getByTestId('dictee-slow').click();
    await expect.poll(async () => (await spoken(page)).length).toBe(2);
    const [normal, slow] = await spoken(page);
    expect(slow.text).toBe(normal.text);
    expect(slow.rate).toBeLessThan(normal.rate);

    // 1) all the accents left off: a near miss, named as such
    const accented = await lastSpoken(page);
    const bare = accented.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe');
    await page.getByTestId('dictee-answer').fill(bare);
    await page.getByTestId('dictee-answer').press('Enter');
    await expect(page.getByTestId('dictee-correct')).toHaveText(accented);
    await expect(page.getByTestId('dictee-feedback')).toHaveAttribute('data-tone', bare === accented ? 'perfect' : 'close');
    await expect(page.getByTestId('dictee-next')).toBeFocused();
    await page.keyboard.press('Enter');

    // 2) nothing typed that is anything like it: a miss, with a sentence about it
    await expect(page.getByTestId('dictee-progress')).toHaveText('Sentence 2 of 6');
    await page.getByTestId('dictee-answer').fill('xxxx yyyy');
    await page.getByTestId('dictee-check').click();
    await expect(page.getByTestId('dictee-feedback')).toHaveAttribute('data-tone', 'miss');
    await expect(page.getByTestId('dictee-notes')).toBeVisible();
    await page.getByTestId('dictee-next').click();

    // 3–6) right answers, typed in capitals: case is not marked
    for (let n = 3; n <= 6; n++) {
      await expect(page.getByTestId('dictee-progress')).toHaveText(`Sentence ${n} of 6`);
      await expect.poll(async () => (await spoken(page)).length).toBeGreaterThanOrEqual(n);
      const line = await lastSpoken(page);
      await page.getByTestId('dictee-answer').fill(line.toUpperCase());
      await page.getByTestId('dictee-check').click();
      await expect(page.getByTestId('dictee-headline')).toHaveText('Perfect');
      await page.getByTestId('dictee-next').click();
    }

    // the results name the line that was missed, and the best is kept on this device
    await expect(page.getByTestId('dictee-final-score')).toBeVisible();
    await expect(page.getByTestId('dictee-review').getByRole('listitem')).toHaveCount(bare === accented ? 1 : 2);
    const stored = await page.evaluate(() =>
      Object.entries(localStorage).filter(([k]) => k.includes('frenchCoach_dictee')).map(([, v]) => v).join(''),
    );
    expect(stored).toContain('"bests"');
    expect(stored).not.toContain('xxxx'); // what was typed is never stored

    // Drill the lines that slipped, then leave
    if (await page.getByTestId('dictee-drill').count()) {
      await page.getByTestId('dictee-drill').click();
      await expect(page.getByTestId('dictee-progress')).toContainText('of 2');
    }

    expect(apiCalls, 'Dictée must not call any server').toEqual([]);
  });

  test('the letter bar types accents at the cursor, and Escape asks before leaving a round', async ({ page }) => {
    await openDictee(page);
    await page.getByTestId('dictee-start').click();
    const box = page.getByTestId('dictee-answer');
    await expect(box).toBeFocused();
    await box.fill('ft');
    await box.evaluate((el: HTMLInputElement) => el.setSelectionRange(1, 1));
    await page.getByRole('button', { name: 'Type é' }).click();
    await expect(box).toHaveValue('fét');
    await expect(box).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.getByText('Leave this round?')).toBeVisible();
    await page.getByTestId('dictee-stay').click();
    await expect(page.getByTestId('dictee-progress')).toBeVisible();
  });

  test('is in Explore, and the page is usable on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openDictee(page);
    await page.getByTestId('dictee-start').click();
    await expect(page.getByTestId('dictee-check')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
