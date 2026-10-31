import type { CSSProperties, ReactNode } from 'react';
import { UserAvatar } from '../../components/ui/UserAvatar';
import type { ShopItem } from '../../types/shop';

interface Props {
  username: string;
  avatar?: string | null;
  frame?: string | null;
  catalogue: ShopItem[];
  /** Shop nameplate colour for the username (rarity-driven, set by the shop). */
  nameStyle?: CSSProperties;
  isYou?: boolean;
  /** Leading slot — the rank on the board. */
  lead?: ReactNode;
  /** Small second line under the name. */
  note?: ReactNode;
  /** Trailing slot — XP, or the row's actions. */
  trail?: ReactNode;
}

/** One person: avatar, name, optional rank, note and trailing value or actions. Rows sit in a divided list. */
export function PersonRow({ username, avatar, frame, catalogue, nameStyle, isYou = false, lead, note, trail }: Props) {
  return (
    <li className={`flex min-h-16 items-center gap-3 px-4 py-3 ${isYou ? 'bg-action-soft' : ''}`} aria-current={isYou ? 'true' : undefined}>
      {lead}
      <UserAvatar
        username={username}
        equipped={{ avatar: avatar ?? null, frame: frame ?? null }}
        catalogue={catalogue}
        size={40}
      />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-label text-ink">
          <span className="truncate" style={nameStyle}>{username}</span>
          {isYou && <span className="shrink-0 rounded-pill bg-action px-2 py-0.5 text-caption font-semibold text-action-ink">You</span>}
        </p>
        {note != null && <p className="text-caption text-ink-subtle">{note}</p>}
      </div>
      {trail}
    </li>
  );
}
