import { SITE_LINK_GROUPS } from '../../components/marketing/siteLinks';

// The landing page's index of everything else on the site, grouped by what the
// visitor wants to do. Rendered inside the "The exam" section; reads the same
// list as the footer (siteLinks.ts), so the two never disagree.
export function GuideLinks() {
  return (
    <div className="mt-14 pt-10 border-t mk-hairline">
      <h3 className="font-display text-2xl mb-2">Free guides, before you start</h3>
      <p className="text-[15px] leading-relaxed mb-8 max-w-2xl" style={{ color: 'var(--mk-ink-muted)' }}>
        Everything is free to read, with no account. Pick where you are.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {SITE_LINK_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: 'var(--mk-accent)' }}>
              {group.title}
            </p>
            <ul className="space-y-3">
              {group.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="mk-focus block rounded-xl border mk-hairline p-4" style={{ background: 'var(--mk-surface)' }}>
                    <span className="block text-base font-semibold mk-link">{link.label}</span>
                    <span className="block text-sm mt-1" style={{ color: 'var(--mk-ink-muted)' }}>{link.hint}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
