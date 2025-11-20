/**
 * Onboarding Page - Company Information Collection
 *
 * Post-signup quiz to collect company information
 * Users are redirected here after creating their account
 * Route: /onboarding
 */

import OnboardingQuiz from '@/components/organisms/OnboardingQuiz';

export const metadata = {
  title: 'Configurar Conta - Locai',
  description: 'Configure sua conta e personalize sua experiência no Locai',
};

export default function OnboardingPage() {
  return <OnboardingQuiz />;
}
