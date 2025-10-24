/**
 * Create Account Page - Quiz Style Signup
 *
 * Conversational account creation flow with 7 days free trial
 * Route: /create-account
 */

import QuizSignup from '@/components/organisms/QuizSignup';

export const metadata = {
  title: 'Criar Conta - Locai',
  description: 'Crie sua conta e ganhe 7 dias grátis para testar todas as funcionalidades do Locai',
};

export default function CreateAccountPage() {
  return <QuizSignup />;
}
