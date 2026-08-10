const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const raw =
  viteEnv?.VITE_SITE_URL ??
  (typeof process !== 'undefined' ? process.env.VITE_SITE_URL : undefined) ??
  'https://french.beyondthebasics.me';
export const SITE_URL = raw.replace(/\/+$/, '');
