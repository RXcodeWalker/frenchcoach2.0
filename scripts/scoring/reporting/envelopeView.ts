/**
 * C2: moved to src/domain/igcse/envelope/envelopeView.ts so the frontend
 * (ExamResults.tsx) can import the same pure view-model builder the CLI
 * reports and the scoring service response use. Re-exported here so
 * scripts/scoring's existing CLI reporting callers (batchScore, inspectAttempt,
 * renderAttemptHtml/Terminal, reviewArtifact) don't need their import paths
 * touched.
 */
export * from '../../../src/domain/igcse/envelope/envelopeView';
