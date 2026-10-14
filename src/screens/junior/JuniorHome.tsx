/**
 * The Junior home (junior-track §1, §10): a picture map of themes, Léo, and a
 * sticker shelf. Nothing here is a mark, a score, a duel, a league or a ranking.
 * An unfinished mission can be continued for 24 h; once it has expired it is
 * simply not offered — never a "you lost it" message.
 */
import { Link } from 'react-router-dom';
import { Leo } from '../../features/junior/Leo';
import { leoLook } from '../../features/junior/look';
import { JUNIOR_BANK } from '../../data/junior';
import { isMissionResumable } from '../../domain/junior/state';
import { useApp } from '../../context/AppContext';

export function JuniorHome() {
  const { state } = useApp();
  const { junior } = state;
  const look = leoLook(JUNIOR_BANK, junior);
  const resumable = isMissionResumable(junior.activeMission, Date.now()) ? junior.activeMission : null;

  return (
    <main data-testid="junior-home" className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-col items-center gap-2">
        <Leo state="happy" size="lg" accessory={look.accessory} />
        <h1 className="text-title text-ink">Choose a mission</h1>
        {look.background && (
          <p data-testid="junior-background" className="rounded-pill bg-reward-soft px-3 py-1 text-label text-reward-text">
            {look.background.emoji} {look.background.name}
          </p>
        )}
      </div>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {JUNIOR_BANK.themes.map((theme) => {
          const owned = junior.stickers[theme.id] ?? [];
          const continuing = resumable?.themeId === theme.id && resumable.results.length > 0;
          return (
            <li key={theme.id} data-testid="junior-theme" data-theme-id={theme.id} className="rounded-card border border-hairline surface p-4">
              <Link to={`/junior/${theme.id}`} className="flex items-center gap-4" aria-label={`${theme.title.en}${continuing ? ' — continue' : ''}`}>
                <span aria-hidden="true" className="text-5xl">{theme.emoji}</span>
                <span className="flex flex-col">
                  <span lang="fr" className="text-subtitle text-ink">{theme.title.fr}</span>
                  <span className="text-label text-action-text">{continuing ? 'Continue ▶' : 'Play ▶'}</span>
                </span>
              </Link>
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Stickers">
                {theme.stickers.map((s) => (
                  <li key={s.id} data-testid="junior-sticker" data-earned={owned.includes(s.id)} className={`flex h-11 w-11 items-center justify-center rounded-full text-2xl ${owned.includes(s.id) ? 'bg-progress-soft' : 'bg-track'}`}>
                    <span aria-hidden="true" className={owned.includes(s.id) ? '' : 'opacity-30 grayscale'}>{owned.includes(s.id) ? s.emoji : '❔'}</span>
                    <span className="sr-only">{owned.includes(s.id) ? s.name : 'Not yet'}</span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>

      <Link to="/profile" data-testid="junior-grownups" className="self-center text-label text-ink-muted underline">
        Grown-ups: settings
      </Link>
    </main>
  );
}
