/**
 * Shop catalogue presentation (Shop plan §14.6, §6): name, icon, copy, and
 * requirement label, keyed by id. Ownership model — server = economic truth
 * (shop_items owns id/price/kind/max_owned/requirement, seeded in
 * backend/supabase/migrations/20260811106000_phase1_shop_items_seed.sql),
 * client = presentation/cache. This module owns copy only; it must never be
 * treated as a price or requirement source — those come from
 * shopService.getCatalogue() (a live shop_items read). A unit test
 * (shopCatalogue.test.ts) asserts SHOP_CATALOGUE_IDS matches the server
 * seed's id set exactly, so drift fails CI.
 */

export interface ShopCatalogueEntry {
  id: string;
  name: string;
  icon: string;
  description: string;
  requirementLabel: string | null;
}

export const SHOP_CATALOGUE: Record<string, ShopCatalogueEntry> = {
  // ── Gear ───────────────────────────────────────────────────────────────
  streak_freeze: {
    id: 'streak_freeze',
    name: 'Streak Freeze',
    icon: '❄️',
    description: 'Covers one missed day so your streak survives.',
    requirementLabel: null,
  },
  focus_token: {
    id: 'focus_token',
    name: 'Focus Token',
    icon: '🎯',
    description: "Override the coach's Today's Focus for one session.",
    requirementLabel: null,
  },
  streak_repair: {
    id: 'streak_repair',
    name: 'Streak Repair',
    icon: '🧵',
    description: 'Restore a streak lost less than 48 hours ago.',
    requirementLabel: null,
  },

  // ── Identity — avatars ────────────────────────────────────────────────
  avatar_croissant: {
    id: 'avatar_croissant',
    name: 'Le Croissant',
    icon: '🥐',
    description: 'Starter avatar.',
    requirementLabel: null,
  },
  avatar_renard: {
    id: 'avatar_renard',
    name: 'Le Renard',
    icon: '🦊',
    description: 'Signals a 3-day streak.',
    requirementLabel: '3-day streak',
  },
  avatar_examinateur: {
    id: 'avatar_examinateur',
    name: "L'Examinateur",
    icon: '📖',
    description: 'Signals a completed exam.',
    requirementLabel: 'Completed an exam',
  },
  avatar_micro: {
    id: 'avatar_micro',
    name: 'Le Micro',
    icon: '🎙️',
    description: 'Signals 5 completed roleplays.',
    requirementLabel: '5 roleplays',
  },
  avatar_plume: {
    id: 'avatar_plume',
    name: 'La Plume',
    icon: '🖋️',
    description: 'Signals a grammar skill at mastery ≥0.8.',
    requirementLabel: 'Grammar mastery ≥0.8',
  },
  avatar_phenix: {
    id: 'avatar_phenix',
    name: 'Le Phénix',
    icon: '🔥',
    description: 'Signals a fixed recurring grammar problem.',
    requirementLabel: 'Fixed a recurring grammar problem',
  },
  avatar_hibou: {
    id: 'avatar_hibou',
    name: 'Le Hibou',
    icon: '🦉',
    description: 'Signals average mastery ≥0.6.',
    requirementLabel: 'Average mastery ≥0.6',
  },
  avatar_couronne: {
    id: 'avatar_couronne',
    name: 'La Couronne',
    icon: '👑',
    description: 'Signals 7000 XP earned.',
    requirementLabel: '7000 XP',
  },

  // ── Identity — frames ─────────────────────────────────────────────────
  frame_ardoise: {
    id: 'frame_ardoise',
    name: 'Ardoise',
    icon: '',
    description: 'Starter frame.',
    requirementLabel: null,
  },
  frame_emeraude: {
    id: 'frame_emeraude',
    name: 'Émeraude',
    icon: '',
    description: 'Signals a 7-day streak.',
    requirementLabel: '7-day streak',
  },
  frame_amethyste: {
    id: 'frame_amethyste',
    name: 'Améthyste',
    icon: '',
    description: 'Signals 1500 XP earned.',
    requirementLabel: '1500 XP',
  },
  frame_or: {
    id: 'frame_or',
    name: 'Or',
    icon: '',
    description: 'Signals an IGCSE mock completed.',
    requirementLabel: 'Completed an IGCSE mock',
  },

  // ── Identity — nameplates ─────────────────────────────────────────────
  nameplate_encre: {
    id: 'nameplate_encre',
    name: 'Encre',
    icon: '',
    description: 'Starter nameplate.',
    requirementLabel: null,
  },
  nameplate_cobalt: {
    id: 'nameplate_cobalt',
    name: 'Cobalt',
    icon: '',
    description: 'Signals any score ≥8.',
    requirementLabel: 'Any score ≥8',
  },
  nameplate_aurore: {
    id: 'nameplate_aurore',
    name: 'Aurore',
    icon: '',
    description: 'Signals a perfect 10.',
    requirementLabel: 'A perfect 10',
  },
  nameplate_tricolore: {
    id: 'nameplate_tricolore',
    name: 'Tricolore',
    icon: '',
    description: 'Signals 5 completed interventions.',
    requirementLabel: '5 interventions',
  },
};

export const SHOP_CATALOGUE_IDS = Object.keys(SHOP_CATALOGUE).sort();
