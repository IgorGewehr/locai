/**
 * Onboarding Types
 * Types for the first-time user onboarding flow
 */

export type OnboardingStepId = 'add_property' | 'connect_whatsapp' | 'test_demo' | 'share_minisite';

export type OnboardingStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface OnboardingStep {
  id: OnboardingStepId;
  title: string;
  description: string;
  icon: string; // Material-UI icon name
  status: OnboardingStepStatus;
  actionText: string;
  actionUrl?: string;
  order: number;
  isOptional?: boolean;
  estimatedMinutes?: number;
}

export interface OnboardingProgress {
  userId: string;
  tenantId: string;
  steps: Record<OnboardingStepId, OnboardingStepStatus>;
  currentStepId: OnboardingStepId | null;
  startedAt: Date;
  completedAt?: Date;
  lastUpdatedAt: Date;
  isCompleted: boolean;
  completionPercentage: number;
  metadata?: {
    skippedSteps?: OnboardingStepId[];
    timeSpentMinutes?: number;
  };
}

export interface OnboardingStepAction {
  stepId: OnboardingStepId;
  action: 'start' | 'complete' | 'skip';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface UseOnboardingResult {
  progress: OnboardingProgress | null;
  loading: boolean;
  error: string | null;
  steps: OnboardingStep[];
  currentStep: OnboardingStep | null;
  nextStep: OnboardingStep | null;
  completedSteps: OnboardingStep[];
  startStep: (stepId: OnboardingStepId) => Promise<void>;
  completeStep: (stepId: OnboardingStepId) => Promise<void>;
  skipStep: (stepId: OnboardingStepId) => Promise<void>;
  resetOnboarding: () => Promise<void>;
  dismissOnboarding: () => void;
  shouldShowOnboarding: boolean;
}

export const DEFAULT_ONBOARDING_STEPS: Omit<OnboardingStep, 'status'>[] = [
  {
    id: 'add_property',
    title: 'Adicionar a primeira propriedade',
    description: 'Cadastre seu primeiro imóvel na plataforma para começar a gerenciar locações de forma automatizada.',
    icon: 'Home',
    actionText: 'Adicionar Propriedade',
    actionUrl: '/dashboard/properties/create',
    order: 1,
    isOptional: false,
    estimatedMinutes: 5,
  },
  {
    id: 'connect_whatsapp',
    title: 'Conectar o WhatsApp',
    description: 'Integre sua conta do WhatsApp para automatizar o atendimento aos seus clientes interessados.',
    icon: 'WhatsApp',
    actionText: 'Conectar WhatsApp',
    actionUrl: '/dashboard/settings?tab=whatsapp',
    order: 2,
    isOptional: true,
    estimatedMinutes: 3,
  },
  {
    id: 'test_demo',
    title: 'Testar a Sofia IA',
    description: 'Experimente uma conversa com a Sofia, nossa assistente de IA especializada em atendimento imobiliário.',
    icon: 'SmartToy',
    actionText: 'Testar Sofia IA',
    actionUrl: '/dashboard/metricas',
    order: 3,
    isOptional: true,
    estimatedMinutes: 5,
  },
  {
    id: 'share_minisite',
    title: 'Parabéns! Agora é só compartilhar',
    description: 'Tudo configurado! Compartilhe seus imóveis através do mini-site e deixe o Locai trabalhar para você automaticamente.',
    icon: 'Share',
    actionText: 'Ver Mini-Site',
    actionUrl: '/dashboard/mini-site',
    order: 4,
    isOptional: false,
    estimatedMinutes: 2,
  },
];
