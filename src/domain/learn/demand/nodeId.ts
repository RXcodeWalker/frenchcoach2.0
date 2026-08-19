import type { CognitiveDemand } from './types';

/** `demand:*` belief-node id for a CognitiveDemand — docs §10. */
export function demandNodeId(cognitiveDemand: CognitiveDemand): string {
  return `demand:${cognitiveDemand}`;
}
