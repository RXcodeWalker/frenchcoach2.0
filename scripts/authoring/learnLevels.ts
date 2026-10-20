/**
 * Read-only report: the level (A1–B2) every Learn question derives to, per topic,
 * and the questions the describe floor moved up a level.
 *
 *   npm run learn:levels
 */
import { QUESTIONS } from '../../src/data/questions';
import { buildLevelsReport, formatLevelsReport } from '../../src/domain/learn/demand/levelsReport';

console.log(formatLevelsReport(buildLevelsReport(QUESTIONS)));
