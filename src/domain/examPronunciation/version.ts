/**
 * Version of the exam-pronunciation fairness rules (exam-pronunciation plan,
 * Batch 5). Sent with every analysed turn and stored on its evidence row
 * (`exam_pronunciation_evidence.fairness_version`), so a row interpreted under
 * older thresholds is never mistaken for the current ones.
 *
 * FAIRNESS_CONFIG_HASH pins sha256(JSON.stringify(FAIRNESS_CONFIG)):
 * __tests__/version.test.ts fails on any threshold change until this version
 * is bumped and the hash updated in the same commit. Every threshold is
 * UNVALIDATED until the Batch 7 calibration passes.
 *
 * Independent of every scoring version: pronunciation evidence is feedback
 * only and cannot change a mark (plan §3c).
 */
export const EXAM_PRONUNCIATION_VERSION = 'exam-pronunciation-fairness-v1';

export const FAIRNESS_CONFIG_HASH = 'd467401eac94ccabe82576ff43adebcceeb63c4ed6bd4f97302abed17329f567';
