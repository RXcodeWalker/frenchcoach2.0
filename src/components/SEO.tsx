import { useEffect } from 'react';
import { SITE_URL } from '../config/site';
import { PAGE_SEO } from '../config/seo';

const MANAGED_ATTR = 'data-seo-managed';

const DEFAULT_TITLE = 'FrenchCoach';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    el.setAttribute(MANAGED_ATTR, 'true');
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    el.setAttribute(MANAGED_ATTR, 'true');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function clearManagedJsonLd() {
  document.head
    .querySelectorAll(`script[type="application/ld+json"][${MANAGED_ATTR}]`)
    .forEach((el) => el.remove());
}

function appendJsonLd(blocks: Record<string, unknown>[]) {
  for (const block of blocks) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute(MANAGED_ATTR, 'true');
    script.textContent = JSON.stringify(block);
    document.head.appendChild(script);
  }
}

interface SeoProps {
  /** Path-only route key, e.g. "/about". Looked up in PAGE_SEO. */
  route: string;
}

// Fail-closed: a route with no PAGE_SEO entry gets noindex and a default
// title rather than throwing or silently becoming indexable.
export function Seo({ route }: SeoProps) {
  const entry = PAGE_SEO[route];

  useEffect(() => {
    document.title = entry?.title ?? DEFAULT_TITLE;

    upsertMeta('name', 'description', entry?.description ?? '');
    upsertMeta('name', 'robots', entry?.robots ?? 'noindex, nofollow');
    upsertCanonical(`${SITE_URL}${entry?.canonicalPath ?? route}`);

    if (entry) {
      upsertMeta('property', 'og:title', entry.title);
      upsertMeta('property', 'og:description', entry.description);
      upsertMeta('property', 'og:url', `${SITE_URL}${entry.canonicalPath}`);
      upsertMeta('name', 'twitter:title', entry.title);
      upsertMeta('name', 'twitter:description', entry.description);
    }

    clearManagedJsonLd();
    if (entry?.jsonLd?.length) {
      appendJsonLd(entry.jsonLd);
    }

    return () => {
      clearManagedJsonLd();
    };
  }, [route, entry]);

  return null;
}
