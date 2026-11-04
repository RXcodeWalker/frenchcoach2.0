import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, ExternalLink, Share2, Users } from 'lucide-react';
import { fadeUp } from '../../components/motion/variants';
import { Button } from '../../components/ui/Button';
import {
  buildParentLink,
  createParentLink,
  listParentLinks,
  ParentLinkError,
  revokeParentLink,
  type ParentLink,
} from './parentLinkService';

const MAX_LINKS = 5;

const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

function errorText(err: unknown): string {
  if (err instanceof ParentLinkError) {
    if (err.code === 'too_many_links') return `You can have up to ${MAX_LINKS} parent links. Turn one off first.`;
    if (err.code === 'not_available') return 'Parent view isn’t available yet. Try again later.';
    if (err.code === 'network_error') return 'You’re offline. Try again when you’re connected.';
  }
  return 'Something went wrong. Try again.';
}

/**
 * Profile → Parent view. The learner makes a private read-only link for a
 * parent, sees when each link was last opened, and can turn any link off.
 * The raw link exists only right after it is made (only its hash is stored),
 * so it is shown once, with copy and share.
 */
export function ParentLinksCard() {
  const [links, setLinks] = useState<ParentLink[] | null>(null);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<{ id: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    listParentLinks()
      .then(l => { if (live) setLinks(l); })
      .catch(err => { if (live) { setLinks([]); setError(errorText(err)); } });
    return () => { live = false; };
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const created = await createParentLink(label);
      setLinks(l => [created, ...(l ?? [])]);
      setFresh({ id: created.id, url: buildParentLink(created.token) });
      setLabel('');
      setCopied(false);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(id: string) {
    setBusy(true);
    setError(null);
    try {
      await revokeParentLink(id);
      setLinks(l => (l ?? []).filter(x => x.id !== id));
      if (fresh?.id === id) setFresh(null);
      setConfirmId(null);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    if (!fresh) return;
    void navigator.clipboard?.writeText(fresh.url).then(() => setCopied(true)).catch(() => setCopied(false));
  }

  async function share() {
    if (!fresh) return;
    try {
      await navigator.share({ title: 'My French progress', text: 'Here’s how my French speaking practice is going:', url: fresh.url });
    } catch {
      // Dismissed or unsupported — the copy button is still there.
    }
  }

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const atLimit = (links?.length ?? 0) >= MAX_LINKS;

  return (
    <motion.section variants={fadeUp} aria-labelledby="profile-parent" className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-[clamp(20px,3cqw,24px)]" data-testid="profile-parent-view">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-info-soft text-info-text" aria-hidden="true">
          <Users size={18} />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="profile-parent" className="text-section text-ink">Parent view</h2>
          <p className="text-body-s text-ink-muted [text-wrap:pretty]">
            Share a private page with a parent showing how often you practise, your scores and what to work on. It never shows your recordings
            or what you said. You can turn a link off at any time.
          </p>
        </div>
      </div>

      {fresh && (
        <div className="flex flex-col gap-2 rounded-control border border-hairline bg-surface-recessed p-4" data-testid="parent-link-fresh">
          <p className="text-label text-ink">Your link is ready: send it to your parent now</p>
          <p className="text-[13px] text-ink-subtle">For safety it is only shown once. If you lose it, make a new one.</p>
          <input
            readOnly
            value={fresh.url}
            aria-label="Parent link"
            onFocus={e => e.currentTarget.select()}
            className="h-10 w-full min-w-0 rounded-control border border-hairline-strong bg-surface px-3 font-numeral text-[13px] text-ink"
          />
          <div className="flex flex-wrap gap-2">
            {canShare && (
              <Button size="sm" onClick={() => void share()}>
                <Share2 size={16} aria-hidden="true" /><span>Share</span>
              </Button>
            )}
            <Button size="sm" variant={canShare ? 'secondary' : 'primary'} onClick={copy}>
              {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              <span>{copied ? 'Copied' : 'Copy link'}</span>
            </Button>
            <a
              href={fresh.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-1.5 rounded-control px-3.5 text-[13px] text-ink-muted hover:bg-track hover:text-ink"
            >
              <ExternalLink size={16} aria-hidden="true" /> See what they’ll see
            </a>
          </div>
        </div>
      )}

      {links && links.length > 0 && (
        <ul className="flex flex-col" aria-label="Your parent links">
          {links.map(l => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-hairline py-3">
              <span className="flex min-w-0 flex-col">
                <span className="text-[14px] font-semibold text-ink">{l.label || 'Parent link'}</span>
                <span className="text-[13px] text-ink-subtle">
                  Made {fmt(l.createdAt)} · {l.lastViewedAt ? `Last opened ${fmt(l.lastViewedAt)} (${l.viewCount} view${l.viewCount === 1 ? '' : 's'})` : 'Not opened yet'}
                </span>
              </span>
              {confirmId === l.id ? (
                <span className="flex gap-2">
                  <Button size="sm" variant="quiet" onClick={() => setConfirmId(null)} disabled={busy}>Keep</Button>
                  <Button size="sm" variant="destructive" onClick={() => void handleRevoke(l.id)} disabled={busy}>Turn off</Button>
                </span>
              ) : (
                <Button size="sm" variant="quiet" onClick={() => setConfirmId(l.id)}>Turn off</Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!atLimit && (
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-0 flex-[1_1_200px] flex-col gap-1">
            <span className="text-[13px] text-ink-subtle">Who is it for? (optional)</span>
            <input
              value={label}
              onChange={e => setLabel(e.target.value.slice(0, 40))}
              placeholder="e.g. Mum"
              maxLength={40}
              className="h-10 w-full rounded-control border border-hairline-strong bg-surface px-3 text-[14px] text-ink placeholder:text-ink-subtle"
            />
          </label>
          <Button type="submit" size="sm" variant={fresh ? 'secondary' : 'primary'} loading={busy} disabled={busy || links === null}>
            Make a parent link
          </Button>
        </form>
      )}

      {error && <p className="text-[13px] text-correction-text" role="alert">{error}</p>}
    </motion.section>
  );
}
