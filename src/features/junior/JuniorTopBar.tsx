/**
 * The Junior top bar: the same 56px card as `TopContextBar` (Design System v2) —
 * title and subtitle on the left, an optional back button — but with no streak or
 * XP pills. Junior writes no XP, streak or mark (ADR 0012), so the bar has nothing
 * to count, and it reads no app state, so it works on a fresh account too.
 */
import { ChevronLeft } from 'lucide-react';

interface Props {
  title: string;
  subtitle?: string;
  /** French text in the title (a theme name), so a screen reader pronounces it right. */
  titleLang?: 'fr';
  onBack?: () => void;
  backLabel?: string;
  backTestId?: string;
  /** Extra controls on the right (the sound toggle, say). */
  actions?: React.ReactNode;
}

export function JuniorTopBar({ title, subtitle, titleLang, onBack, backLabel = 'Back', backTestId, actions }: Props) {
  return (
    <div className="sticky top-0 z-40 w-full bg-bg px-3 pt-3">
      <div className="flex h-14 items-center justify-between gap-3 rounded-card border border-hairline bg-surface px-3">
        <div className="flex min-w-0 items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label={backLabel}
              data-testid={backTestId}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-hairline-strong text-ink-muted
                transition-[background-color,color,transform] duration-state ease-smooth hover:bg-track hover:text-ink active:scale-[.97]"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
          )}
          <div className={`flex min-w-0 flex-col ${onBack ? 'pl-2' : 'pl-1'}`}>
            <h1 lang={titleLang} className="truncate text-[14px] font-semibold leading-[1.3] text-ink">{title}</h1>
            {subtitle && <p className="truncate text-[13px] font-normal leading-[1.3] text-ink-subtle">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
