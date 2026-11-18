import { SITE_URL } from '../config/site';

// JSON-LD builders for the four schema types decided in the SEO plan.
// Deliberately excludes aggregateRating, review, and offers — none of that
// is established anywhere in the repo, so none of it is asserted here.

export interface OrganizationSchema {
  '@context': 'https://schema.org';
  '@type': 'Organization';
  name: string;
  url: string;
  logo?: string;
}

export function buildOrganizationSchema(opts: {
  name: string;
  logoPath?: string;
}): OrganizationSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: opts.name,
    url: SITE_URL,
    ...(opts.logoPath ? { logo: `${SITE_URL}${opts.logoPath}` } : {}),
  };
}

export interface WebSiteSchema {
  '@context': 'https://schema.org';
  '@type': 'WebSite';
  name: string;
  url: string;
}

// No SearchAction — the site has no site search.
export function buildWebSiteSchema(opts: { name: string }): WebSiteSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: opts.name,
    url: SITE_URL,
  };
}

export interface SoftwareApplicationSchema {
  '@context': 'https://schema.org';
  '@type': 'SoftwareApplication';
  name: string;
  applicationCategory: 'EducationalApplication';
  operatingSystem: 'Web';
  url: string;
}

export function buildSoftwareApplicationSchema(opts: {
  name: string;
}): SoftwareApplicationSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: opts.name,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    url: SITE_URL,
  };
}

export interface BreadcrumbListItem {
  name: string;
  path: string;
}

export interface BreadcrumbListSchema {
  '@context': 'https://schema.org';
  '@type': 'BreadcrumbList';
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    item: string;
  }>;
}

// Items must mirror the breadcrumb trail actually rendered on the page.
export function buildBreadcrumbListSchema(items: BreadcrumbListItem[]): BreadcrumbListSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQPageSchema {
  '@context': 'https://schema.org';
  '@type': 'FAQPage';
  mainEntity: Array<{
    '@type': 'Question';
    name: string;
    acceptedAnswer: { '@type': 'Answer'; text: string };
  }>;
}

// Scope strictly to Q&A visibly rendered on the page — no invented questions.
export function buildFAQPageSchema(items: FAQItem[]): FAQPageSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

export interface LearningResourceSchema {
  '@context': 'https://schema.org';
  '@type': 'LearningResource';
  name: string;
  description: string;
  url: string;
  inLanguage: 'en';
  teaches: string;
  educationalLevel: string;
  learningResourceType: string;
  isAccessibleForFree: true;
}

// For a page that is itself free study material (model answers, worked
// examples). No author, date or rating is asserted: none is established.
export function buildLearningResourceSchema(opts: {
  name: string;
  description: string;
  path: string;
  teaches: string;
  learningResourceType: string;
}): LearningResourceSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: opts.name,
    description: opts.description,
    url: `${SITE_URL}${opts.path}`,
    inLanguage: 'en',
    teaches: opts.teaches,
    educationalLevel: 'IGCSE',
    learningResourceType: opts.learningResourceType,
    isAccessibleForFree: true,
  };
}

export interface ItemListSchema {
  '@context': 'https://schema.org';
  '@type': 'ItemList';
  itemListElement: Array<{ '@type': 'ListItem'; position: number; name: string; url: string }>;
}

// Items must be links the page itself renders.
export function buildItemListSchema(items: { name: string; path: string }[]): ItemListSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: `${SITE_URL}${item.path}`,
    })),
  };
}
