import { describe, it, expect } from 'vitest';
import { SHOP_CATALOGUE_IDS } from '../shopCatalogue';

/**
 * Id set literally transcribed from
 * backend/supabase/migrations/20260811106000_phase1_shop_items_seed.sql —
 * the server-side price list (Shop plan §14.6). If that migration's ids
 * change, this list and shopCatalogue.ts must be updated together; this
 * test exists so a silent drift between the two fails CI instead of surfacing
 * as an item with no copy or an unpurchasable id.
 */
const SERVER_SEED_IDS = [
  'streak_freeze',
  'focus_token',
  'streak_repair',
  'avatar_croissant',
  'avatar_renard',
  'avatar_examinateur',
  'avatar_micro',
  'avatar_plume',
  'avatar_phenix',
  'avatar_hibou',
  'avatar_couronne',
  'frame_ardoise',
  'frame_emeraude',
  'frame_amethyste',
  'frame_or',
  'nameplate_encre',
  'nameplate_cobalt',
  'nameplate_aurore',
  'nameplate_tricolore',
].sort();

describe('shopCatalogue id parity', () => {
  it('has exactly 19 launch items (Shop plan §6)', () => {
    expect(SHOP_CATALOGUE_IDS.length).toBe(19);
  });

  it('matches the server seed id set exactly', () => {
    expect(SHOP_CATALOGUE_IDS).toEqual(SERVER_SEED_IDS);
  });
});
