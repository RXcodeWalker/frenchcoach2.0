import { Routes, Route } from 'react-router-dom';
import { Auth } from './screens/Auth';
import { Landing } from './screens/Landing';
import { AboutPublic } from './screens/AboutPublic';
import { IgcseFrenchSpeaking } from './screens/IgcseFrenchSpeaking';
import { FrenchRoleplayPractice } from './screens/FrenchRoleplayPractice';
import { Story } from './screens/Story';
import { PrivacyPolicy } from './screens/PrivacyPolicy';
import { TermsOfService } from './screens/TermsOfService';
import { GuardianConsent } from './screens/GuardianConsent';
import { AuthCallback } from './screens/AuthCallback';
import { ResetPassword } from './screens/ResetPassword';

// Rendered by AppShell's early return for a logged-out, non-guest visitor
// (App.tsx). AppShell's auth check is itself an early return, so this tree
// and the gated <AppProvider> tree are mutually exclusive per render — never
// both mounted at once. The public paths render through MarketingLayout
// here with no AppProvider/AuthContext dependency, so they stay reachable
// and crawlable pre-auth. Every other path — including unknown ones —
// preserves existing behavior and shows the auth screen, same as today.
export function PublicRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/about" element={<AboutPublic />} />
      <Route path="/igcse-french-speaking" element={<IgcseFrenchSpeaking />} />
      <Route path="/french-roleplay-practice" element={<FrenchRoleplayPractice />} />
      <Route path="/story" element={<Story />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/guardian-consent" element={<GuardianConsent />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="*" element={<Auth />} />
    </Routes>
  );
}
