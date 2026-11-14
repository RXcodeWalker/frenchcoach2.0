/**
 * The Junior home (junior-track §1, §10): Léo, the next mission, a picture map of
 * themes and a sticker shelf, on the Design System v2 tokens. Nothing here is a
 * mark, a score, a duel, a league or a ranking, and there are no numbers.
 * An unfinished mission can be continued for 24 h; once it has expired it is
 * simply not offered — never a "you lost it" message.
 */
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Lock, Search } from 'lucide-react';
import { PageShell } from '../../components/layout/PageShell';
import { enter } from '../../components/motion/variants';
import { JuniorArt, ThemeScene } from '../../features/junior/art/JuniorArt';
import { themeHue } from '../../features/junior/art/pictures';
import { JuniorTopBar } from '../../features/junior/JuniorTopBar';
import { Leo } from '../../features/junior/Leo';
import { leoLook } from '../../features/junior/look';
import { PRIMARY_LINK_CLASS } from '../../features/junior/linkButton';
import { JUNIOR_BANK } from '../../data/junior';
import { isMissionResumable } from '../../domain/junior/state';
import { useApp } from '../../context/AppContext';

export function JuniorHome() {
  const { state } = useApp();
  const { junior } = state;
  const look = leoLook(JUNIOR_BANK, junior);
  const resumable = isMissionResumable(junior.activeMission, Date.now()) ? junior.activeMission : null;
  const isContinuing = (themeId: string) => resumable?.themeId === themeId && resumable.results.length > 0;
  const isComplete = (themeId: string) => {
    const theme = JUNIOR_BANK.themes.find((t) => t.id === themeId);
    return !!theme && theme.stickers.every((s) => (junior.stickers[themeId] ?? []).includes(s.id));
  };

  // Up next: the mission being continued, else the first theme whose sticker set is not complete, else the first.
  const upNext =
    JUNIOR_BANK.themes.find((t) => isContinuing(t.id)) ??
    JUNIOR_BANK.themes.find((t) => !isComplete(t.id)) ??
    JUNIOR_BANK.themes[0];
  const upNextContinuing = isContinuing(upNext.id);

  const heroHue = themeHue(upNext.id);

  return (
    <>
      <JuniorTopBar title="Junior" subtitle="Missions with Léo" />
      <main data-testid="junior-home">
        <PageShell maxWidth="md" gap={24}>
          <motion.section
            variants={enter}
            aria-label="Up next"
            style={{ '--h': heroHue } as CSSProperties}
            className="junior-plate relative flex flex-col items-center gap-4 overflow-hidden rounded-card border border-hairline p-6 text-center text-ink sm:flex-row sm:gap-6 sm:text-left"
          >
            {/* soft shapes behind Léo: static, decorative */}
            <span aria-hidden="true" className="junior-plate-back absolute -left-10 -top-10 h-36 w-36 rounded-full" />
            <span aria-hidden="true" className="junior-plate-back absolute -bottom-12 right-6 h-28 w-28 rounded-full" />
            <span aria-hidden="true" className="junior-plate-back absolute right-24 top-5 h-8 w-8 rounded-full" />
            <div className="relative shrink-0">
              <span aria-hidden="true" className="absolute inset-3 rounded-full bg-surface" />
              <Leo state="happy" size="lg" accessory={look.accessory} />
            </div>
            <div className="relative flex min-w-0 flex-1 flex-col items-center gap-3 sm:items-start">
              <div className="flex flex-col gap-1">
                <p className="text-eyebrow uppercase text-action-text">{upNextContinuing ? 'Pick up where you left off' : 'Up next'}</p>
                <h2 lang="fr" className="text-h2 text-ink">{upNext.title.fr}</h2>
                <p className="text-body-base text-ink-muted">{upNext.title.en}</p>
              </div>
              <Link to={`/junior/${upNext.id}`} className={PRIMARY_LINK_CLASS}>
                {upNextContinuing ? 'Continue mission' : 'Start mission'} <ChevronRight size={18} aria-hidden="true" />
              </Link>
              {look.background && (
                <p data-testid="junior-background" className="flex items-center gap-2 rounded-pill bg-surface py-1 pl-1 pr-3 text-label text-ink-muted">
                  <JuniorArt picture={look.background.emoji} size={24} variant="badge" />
                  {look.background.name}
                </p>
              )}
            </div>
          </motion.section>

          <motion.div variants={enter} className="flex flex-col gap-3">
            <h2 className="text-subtitle text-ink">All missions</h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {JUNIOR_BANK.themes.map((theme) => {
                const owned = junior.stickers[theme.id] ?? [];
                const continuing = isContinuing(theme.id);
                const complete = isComplete(theme.id);
                return (
                  <li
                    key={theme.id}
                    data-testid="junior-theme"
                    data-theme-id={theme.id}
                    className="group relative flex flex-col overflow-hidden rounded-card border border-hairline bg-surface transition-colors duration-state ease-smooth hover:border-hairline-strong focus-within:border-action"
                  >
                    <div style={{ '--h': themeHue(theme.id) } as CSSProperties} className="junior-plate relative flex h-28 items-center justify-between overflow-hidden px-5">
                      <span aria-hidden="true" className="junior-plate-back absolute -right-8 -top-10 h-32 w-32 rounded-full" />
                      <span aria-hidden="true" className="junior-plate-back absolute bottom-3 right-20 h-6 w-6 rounded-full" />
                      <ThemeScene themeId={theme.id} fallback={theme.emoji} />
                      <span className="relative flex items-center gap-0.5 rounded-pill bg-surface px-3 py-1.5 text-label text-action-text">
                        {continuing ? 'Continue' : complete ? 'Play again' : 'Play'}
                        <ChevronRight size={16} aria-hidden="true" />
                      </span>
                    </div>
                    <div className="flex flex-col gap-3 p-4">
                      <div className="flex min-w-0 flex-col">
                        <Link
                          to={`/junior/${theme.id}`}
                          aria-label={`${theme.title.en}${continuing ? ' — continue' : ''}`}
                          className="text-title text-ink after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
                        >
                          <span lang="fr">{theme.title.fr}</span>
                        </Link>
                        <span className="text-body-s text-ink-muted">{theme.title.en}</span>
                      </div>
                      <ul className="flex flex-wrap gap-2" aria-label="Stickers">
                        {theme.stickers.map((s) => {
                          const got = owned.includes(s.id);
                          return (
                            <li key={s.id} data-testid="junior-sticker" data-earned={got} className="flex h-10 w-10 items-center justify-center">
                              {got ? (
                                <JuniorArt picture={s.emoji} size={40} variant="badge" />
                              ) : (
                                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-surface-recessed">
                                  <Lock size={14} className="text-ink-subtle" aria-hidden="true" />
                                </span>
                              )}
                              <span className="sr-only">{got ? s.name : 'Not yet'}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </li>
                );
              })}
            </ul>
          </motion.div>

          <motion.div variants={enter}>
            <Link
              to="/question-detective"
              data-testid="junior-question-detective"
              className="flex items-center gap-3 rounded-card border border-hairline bg-surface p-4 transition-colors duration-state ease-smooth hover:border-hairline-strong hover:bg-track"
            >
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-action-soft text-action-text">
                <Search size={20} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-subtitle text-ink">Question words</span>
                <span className="text-body-s text-ink-muted">Find out what each question word asks for</span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-ink-subtle" aria-hidden="true" />
            </Link>
          </motion.div>

          <motion.div variants={enter} className="flex justify-center">
            <Link
              to="/profile"
              data-testid="junior-grownups"
              className="inline-flex h-11 items-center rounded-control px-4 text-label text-ink-muted transition-colors duration-state ease-smooth hover:bg-track hover:text-ink"
            >
              Grown-ups: settings
            </Link>
          </motion.div>
        </PageShell>
      </main>
    </>
  );
}
