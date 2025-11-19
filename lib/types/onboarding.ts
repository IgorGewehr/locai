/**
 * Onboarding Types
 * Types for the first-time user onboarding flow
 */

export type OnboardingStepId = 'add_property' | 'configure_system' | 'connect_whatsapp';

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
    id: 'configure_system',
    title: 'Configurar sua empresa e IA',
    description: 'Configure as informações da sua empresa e personalize a Sofia para atender seus clientes do seu jeito.',
    icon: 'Settings',
    actionText: 'Configurar Sistema',
    actionUrl: '/dashboard/onboarding/configure',
    order: 2,
    isOptional: false,
    estimatedMinutes: 7,
  },
  {
    id: 'connect_whatsapp',
    title: 'Conectar o WhatsApp',
    description: 'Integre sua conta do WhatsApp para automatizar o atendimento aos seus clientes interessados.',
    icon: 'WhatsApp',
    actionText: 'Conectar WhatsApp',
    actionUrl: '/dashboard/settings?tab=whatsapp',
    order: 3,
    isOptional: false,
    estimatedMinutes: 3,
  },
];
