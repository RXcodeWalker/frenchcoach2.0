/**
 * Version of the sound-alike tables and the respeller (`classes.ts`,
 * `nearPairs.ts`, `lexicon.ts`, `respell.ts`). Wired into marking (stage 6): any
 * change to a list or a rule changes marks: bump this, and update the hash in
 * `stt/__tests__/homophones.version-pin.test.ts` in the same commit.
 */
export const HOMOPHONE_TABLE_VERSION = 'homophone-table-v1';
