/**
 * Create Account Page - Simple Signup Form
 *
 * Basic account creation with name, email, and password
 * After signup, redirects to /onboarding for company info
 * Route: /create-account
 */

import SimpleSignup from '@/components/organisms/SimpleSignup';

export const metadata = {
  title: 'Criar Conta - AlugaZap',
  description: 'Crie sua conta e ganhe 7 dias grátis para testar todas as funcionalidades do AlugaZap',
};

export default function CreateAccountPage() {
  return <SimpleSignup />;
}
