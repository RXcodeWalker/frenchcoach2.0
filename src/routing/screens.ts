/**
 * Every routed screen, each downloaded on first use (code splitting) — the app
 * used to ship as one 4 MB file, so a learner on a weak connection waited for
 * every game, the admin pages and the marketing pages before seeing anything.
 *
 * `App.tsx` and `PublicRoutes.tsx` render these; the `<Route>` table stays in
 * `App.tsx` (the route-parity test reads it). `SCREEN_PATHS` mirrors it for
 * `preloadScreenFor`, which starts the screen in the URL downloading at boot,
 * alongside the sign-in check, instead of after it. A path missing from
 * `SCREEN_PATHS` still works — its screen just starts downloading on render.
 *
 * Offline: the service worker precaches every chunk once the first screen is
 * up (`main.tsx`), so all of this is on the device after one visit.
 */
import { matchPath } from 'react-router-dom';
import { lazyScreen, type LazyScreen } from './lazyScreen';

// ── Signed-in app ──────────────────────────────────────────────────────────
export const Home = lazyScreen(() => import('../screens/Home'), 'Home');
export const JuniorHome = lazyScreen(() => import('../screens/junior/JuniorHome'), 'JuniorHome');
export const MissionPlayer = lazyScreen(() => import('../screens/junior/MissionPlayer'), 'MissionPlayer');
export const Learn = lazyScreen(() => import('../screens/Learn'), 'Learn');
export const SavedAnswers = lazyScreen(() => import('../screens/learn/SavedAnswers'), 'SavedAnswers');
export const LearnSounds = lazyScreen(() => import('../screens/LearnSounds'), 'LearnSounds');
export const Notebook = lazyScreen(() => import('../screens/Notebook'), 'Notebook');
export const MonthlyCheckScreen = lazyScreen(() => import('../screens/MonthlyCheckScreen'), 'MonthlyCheckScreen');
export const ExamMode = lazyScreen(() => import('../screens/ExamMode'), 'ExamMode');
export const RolePlayDrill = lazyScreen(() => import('../screens/rolePlayDrill/RolePlayDrill'), 'RolePlayDrill');
export const ExamGuide = lazyScreen(() => import('../screens/examGuide/ExamGuide'), 'ExamGuide');
export const Explore = lazyScreen(() => import('../screens/Explore'), 'Explore');
export const Progress = lazyScreen(() => import('../screens/Progress'), 'Progress');
export const Profile = lazyScreen(() => import('../screens/Profile'), 'Profile');
export const Shop = lazyScreen(() => import('../screens/Shop'), 'Shop');
export const About = lazyScreen(() => import('../screens/About'), 'About');
export const StudyGroups = lazyScreen(() => import('../screens/StudyGroups'), 'StudyGroups');
export const Rankings = lazyScreen(() => import('../screens/Rankings'), 'Rankings');
export const DailyChallenge = lazyScreen(() => import('../screens/DailyChallenge'), 'DailyChallenge');
export const League = lazyScreen(() => import('../screens/League'), 'League');
export const DuelDetail = lazyScreen(() => import('../screens/DuelDetail'), 'DuelDetail');
export const WeaknessAnalysis = lazyScreen(() => import('../screens/WeaknessAnalysis'), 'WeaknessAnalysis');
export const SentenceRebuilder = lazyScreen(() => import('../screens/SentenceRebuilder'), 'SentenceRebuilder');
export const Onboarding = lazyScreen(() => import('../screens/Onboarding'), 'Onboarding');
export const OnboardingPlacement = lazyScreen(() => import('../screens/OnboardingPlacement'), 'OnboardingPlacement');
export const AgeBand = lazyScreen(() => import('../screens/AgeBand'), 'AgeBand');
export const InviteCode = lazyScreen(() => import('../screens/InviteCode'), 'InviteCode');
export const RapidFire = lazyScreen(() => import('../screens/RapidFire'), 'RapidFire');
export const SpeedSpeaking = lazyScreen(() => import('../screens/SpeedSpeaking'), 'SpeedSpeaking');
export const FriendChallenges = lazyScreen(() => import('../screens/FriendChallenges'), 'FriendChallenges');
export const FrenchRoadmap = lazyScreen(() => import('../screens/FrenchRoadmap'), 'FrenchRoadmap');
export const FluencyHeatmap = lazyScreen(() => import('../screens/FluencyHeatmap'), 'FluencyHeatmap');
export const ScenarioArchitect = lazyScreen(() => import('../screens/ScenarioArchitect'), 'ScenarioArchitect');
export const ScenarioArchitectSession = lazyScreen(() => import('../screens/ScenarioArchitectSession'), 'ScenarioArchitectSession');
export const RoleplaySession = lazyScreen(() => import('../screens/RoleplaySession'), 'RoleplaySession');
export const WordDrop = lazyScreen(() => import('../screens/WordDrop'), 'WordDrop');
export const QuestionDetective = lazyScreen(() => import('../screens/QuestionDetective'), 'QuestionDetective');
export const MasteryJourney = lazyScreen(() => import('../screens/MasteryJourney'), 'MasteryJourney');
export const BossBattle = lazyScreen(() => import('../screens/BossBattle'), 'BossBattle');
export const EmojiMaster = lazyScreen(() => import('../screens/EmojiMaster'), 'EmojiMaster');
export const MysteryBox = lazyScreen(() => import('../screens/MysteryBox'), 'MysteryBox');
export const SurvivalMode = lazyScreen(() => import('../screens/SurvivalMode'), 'SurvivalMode');
export const AccentAnalyzer = lazyScreen(() => import('../screens/AccentAnalyzer'), 'AccentAnalyzer');
export const ListeningMode = lazyScreen(() => import('../screens/ListeningMode'), 'ListeningMode');
export const SpeakingArena = lazyScreen(() => import('../screens/SpeakingArena'), 'SpeakingArena');
export const Challenges = lazyScreen(() => import('../screens/Challenges'), 'Challenges');
export const DailyNewsFlash = lazyScreen(() => import('../screens/DailyNewsFlash'), 'DailyNewsFlash');
export const ParentView = lazyScreen(() => import('../screens/ParentView'), 'ParentView');
export const Premium = lazyScreen(() => import('../screens/Premium'), 'Premium');
export const FixDrill = lazyScreen(() => import('../screens/FixDrill'), 'FixDrill');
export const Unsubscribe = lazyScreen(() => import('../screens/Unsubscribe'), 'Unsubscribe');
export const JoinClass = lazyScreen(() => import('../screens/JoinClass'), 'JoinClass');
export const TeachLayout = lazyScreen(() => import('../screens/teach/TeachLayout'), 'TeachLayout');
export const TeachHome = lazyScreen(() => import('../screens/teach/TeachHome'), 'TeachHome');
export const TeachClass = lazyScreen(() => import('../screens/teach/TeachClass'), 'TeachClass');
export const TeachStudent = lazyScreen(() => import('../screens/teach/TeachStudent'), 'TeachStudent');
export const TeachAttempt = lazyScreen(() => import('../screens/teach/TeachAttempt'), 'TeachAttempt');
export const NotFound = lazyScreen(() => import('../screens/NotFound'), 'NotFound');

// Dev-only screens: the DEV guard keeps their chunks out of production builds entirely.
export const CoachBeliefDebug = import.meta.env.DEV
  ? lazyScreen(() => import('../screens/CoachBeliefDebug'), 'CoachBeliefDebug')
  : () => null;
export const JuniorPlaytest = import.meta.env.DEV
  ? lazyScreen(() => import('../screens/JuniorPlaytest'), 'JuniorPlaytest')
  : () => null;

// ── Admin (admin accounts only — never preloaded for anyone else) ───────────
export const AdminLayout = lazyScreen(() => import('../layouts/AdminLayout'), 'AdminLayout');
export const AdminDashboard = lazyScreen(() => import('../screens/admin/AdminDashboard'), 'AdminDashboard');
export const InviteCodeList = lazyScreen(() => import('../screens/admin/InviteCodeList'), 'InviteCodeList');
export const QuestionList = lazyScreen(() => import('../screens/admin/questions/QuestionList'), 'QuestionList');
export const QuestionForm = lazyScreen(() => import('../screens/admin/questions/QuestionForm'), 'QuestionForm');
export const ScenarioList = lazyScreen(() => import('../screens/admin/scenarios/ScenarioList'), 'ScenarioList');
export const ScenarioForm = lazyScreen(() => import('../screens/admin/scenarios/ScenarioForm'), 'ScenarioForm');
export const VersionHistory = lazyScreen(() => import('../screens/admin/VersionHistory'), 'VersionHistory');

// ── Public (signed out) and marketing ───────────────────────────────────────
export const Landing = lazyScreen(() => import('../screens/Landing'), 'Landing');
export const AboutPublic = lazyScreen(() => import('../screens/AboutPublic'), 'AboutPublic');
export const Auth = lazyScreen(() => import('../screens/Auth'), 'Auth');
export const AuthCallback = lazyScreen(() => import('../screens/AuthCallback'), 'AuthCallback');
export const ResetPassword = lazyScreen(() => import('../screens/ResetPassword'), 'ResetPassword');
export const GuardianConsent = lazyScreen(() => import('../screens/GuardianConsent'), 'GuardianConsent');
export const IgcseFrenchSpeaking = lazyScreen(() => import('../screens/IgcseFrenchSpeaking'), 'IgcseFrenchSpeaking');
export const FrenchRoleplayPractice = lazyScreen(() => import('../screens/FrenchRoleplayPractice'), 'FrenchRoleplayPractice');
export const Story = lazyScreen(() => import('../screens/Story'), 'Story');
export const PrivacyPolicy = lazyScreen(() => import('../screens/PrivacyPolicy'), 'PrivacyPolicy');
export const TermsOfService = lazyScreen(() => import('../screens/TermsOfService'), 'TermsOfService');

type AnyScreen = Pick<LazyScreen<never>, 'preload'>;

/**
 * Path → the screens that can render there. Both trees are listed where they
 * differ (`/` is Home signed in, Landing signed out; `/about` likewise) —
 * boot can't know yet which one the sign-in check will pick, and downloading
 * both is cheaper than waiting for it. Junior is `/junior`, never `/`.
 */
export const SCREEN_PATHS: ReadonlyArray<readonly [string, readonly AnyScreen[]]> = [
  ['/', [Home, Landing]],
  ['/junior', [JuniorHome]],
  ['/junior/:themeId', [MissionPlayer]],
  ['/learn', [Learn]],
  ['/learn/saved', [SavedAnswers]],
  ['/learn/sounds', [LearnSounds]],
  ['/learn/sounds/check', [MonthlyCheckScreen]],
  ['/notebook', [Notebook]],
  ['/exam', [ExamMode]],
  ['/exam/role-play', [RolePlayDrill]],
  ['/exam/guide', [ExamGuide]],
  ['/explore', [Explore]],
  ['/progress', [Progress]],
  ['/profile', [Profile]],
  ['/shop', [Shop]],
  ['/about', [About, AboutPublic]],
  ['/study-groups', [StudyGroups]],
  ['/rankings', [Rankings]],
  ['/daily-challenge', [DailyChallenge]],
  ['/league', [League]],
  ['/duel/:duelId', [DuelDetail]],
  ['/weakness-analysis', [WeaknessAnalysis]],
  ['/sentence-rebuilder', [SentenceRebuilder]],
  ['/onboarding', [Onboarding]],
  ['/onboarding/placement', [OnboardingPlacement]],
  ['/age-band', [AgeBand]],
  ['/invite-code', [InviteCode]],
  ['/rapid-fire', [RapidFire]],
  ['/speed-speaking', [SpeedSpeaking]],
  ['/friend-challenges', [FriendChallenges]],
  ['/roadmap', [FrenchRoadmap]],
  ['/fluency-heatmap', [FluencyHeatmap]],
  ['/scenario/:scenarioId', [RoleplaySession]],
  ['/scenario-architect', [ScenarioArchitect]],
  ['/scenario-architect/session', [ScenarioArchitectSession]],
  ['/word-drop', [WordDrop]],
  ['/question-detective', [QuestionDetective]],
  ['/mastery', [MasteryJourney]],
  ['/boss-battle', [BossBattle]],
  ['/emoji-master', [EmojiMaster]],
  ['/mystery-box', [MysteryBox]],
  ['/survival', [SurvivalMode]],
  ['/accent-analyzer', [AccentAnalyzer]],
  ['/listening-mode', [ListeningMode]],
  ['/speaking-arena', [SpeakingArena]],
  ['/challenges', [Challenges]],
  ['/daily-news', [DailyNewsFlash]],
  ['/igcse-french-speaking', [IgcseFrenchSpeaking]],
  ['/french-roleplay-practice', [FrenchRoleplayPractice]],
  ['/story', [Story]],
  ['/privacy', [PrivacyPolicy]],
  ['/terms', [TermsOfService]],
  ['/login', [Auth]],
  ['/auth/callback', [AuthCallback]],
  ['/reset-password', [ResetPassword]],
  ['/guardian-consent', [GuardianConsent]],
  ['/parent', [ParentView]],
  ['/premium', [Premium]],
  ['/fix/:skillId', [FixDrill]],
  ['/unsubscribe', [Unsubscribe]],
  ['/join', [JoinClass]],
  ['/join/:code', [JoinClass]],
  ['/teach', [TeachLayout, TeachHome]],
  ['/teach/class/:classId', [TeachLayout, TeachClass]],
  ['/teach/class/:classId/student/:studentId', [TeachLayout, TeachStudent]],
  ['/teach/class/:classId/attempt/:attemptId', [TeachLayout, TeachAttempt]],
  ['/admin', [AdminLayout, AdminDashboard]],
  ['/admin/questions', [AdminLayout, QuestionList]],
  ['/admin/questions/new', [AdminLayout, QuestionForm]],
  ['/admin/questions/:id/edit', [AdminLayout, QuestionForm]],
  ['/admin/questions/:id/history', [AdminLayout, VersionHistory]],
  ['/admin/scenarios', [AdminLayout, ScenarioList]],
  ['/admin/scenarios/new', [AdminLayout, ScenarioForm]],
  ['/admin/scenarios/:id/edit', [AdminLayout, ScenarioForm]],
  ['/admin/scenarios/:id/history', [AdminLayout, VersionHistory]],
  ['/admin/invite-codes', [AdminLayout, InviteCodeList]],
];

/** The screens for a path (empty for an unknown one). */
export function screensFor(pathname: string): readonly AnyScreen[] {
  for (const [pattern, screens] of SCREEN_PATHS) {
    if (matchPath({ path: pattern, end: true }, pathname)) return screens;
  }
  return [];
}

/** Starts downloading the screen(s) for a path. Resolves when they are here (or failed — render will retry). */
export function preloadScreenFor(pathname: string): Promise<void> {
  return Promise.all(screensFor(pathname).map((s) => s.preload())).then(() => undefined);
}

/**
 * The tabs a learner moves between all the time. Fetched once the first screen
 * is up and the browser is idle, so a tab tap is instant even before the
 * service worker has finished saving everything else.
 */
export const CORE_SCREENS: readonly AnyScreen[] = [Home, Learn, Explore, Progress, Profile, ExamMode];

export function prefetchCoreScreens(): Promise<void> {
  return Promise.all(CORE_SCREENS.map((s) => s.preload())).then(() => undefined);
}
