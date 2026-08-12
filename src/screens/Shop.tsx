// Placeholder — the real Shop UI is rebuilt in Phase 4 (Shop plan §15).
// The old storefront (16 SKUs, fake countdown, purchaseItem/PURCHASE_ITEM
// dispatch) was removed in Phase 2 because it wrote to the local gem
// ledger the new server economy (gem_events, shopService.ts) replaces.
// This screen stays behind FEATURE_FLAGS.shop = 'coming-soon', so it is
// unreachable in production; the export is kept only so App.tsx's route
// keeps compiling until Phase 4 lands.
export function Shop() {
  return null;
}
