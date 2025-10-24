/**
 * Revolutionary Onboarding Types
 * Extended types for the new embedded onboarding experience
 */

import { OnboardingStepId, OnboardingStepStatus } from './onboarding';

export type OnboardingDialogMode =
  | 'property_import'
  | 'property_create'
  | 'reservation_create'
  | 'whatsapp_connect'
  | null;

export type OnboardingViewMode = 'compact' | 'expanded' | 'fullscreen';

export interface OnboardingDialogState {
  mode: OnboardingDialogMode;
  isOpen: boolean;
  data?: any;
}

export interface RevolutionaryOnboardingStep {
  id: OnboardingStepId;
  title: string;
  description: string;
  icon: string;
  status: OnboardingStepStatus;
  order: number;
  isOptional?: boolean;
  estimatedMinutes?: number;

  // Revolutionary features
  hasEmbeddedDialog: boolean;
  dialogMode?: OnboardingDialogMode;
  guidanceText?: string;
  tips?: OnboardingTip[];
  videoUrl?: string;
  completionBadge?: OnboardingBadge;
  sidebarReference?: SidebarReference;
}

export interface OnboardingTip {
  id: string;
  title: string;
  description: string;
  icon?: string;
  imageUrl?: string;
  gifUrl?: string;
  type: 'info' | 'warning' | 'success' | 'tip';
}

export interface OnboardingBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  unlockedAt?: Date;
}

export interface SidebarReference {
  title: string;
  description: string;
  path: string;
  icon: string;
}

export interface RevolutionaryOnboardingState {
  // Current state
  currentStepId: OnboardingStepId | null;
  viewMode: OnboardingViewMode;
  activeDialog: OnboardingDialogState;

  // Progress tracking
  startedAt: Date;
  lastInteractionAt: Date;
  timeSpentSeconds: number;

  // User interactions
  stepInteractions: Record<OnboardingStepId, StepInteractionData>;

  // UI state
  showTooltips: boolean;
  showVideoTutorials: boolean;
  isDismissed: boolean;

  // Completion data
  completedSteps: OnboardingStepId[];
  skippedSteps: OnboardingStepId[];
  unlockedBadges: string[];

  // Analytics
  analytics: OnboardingAnalytics;
}

export interface StepInteractionData {
  stepId: OnboardingStepId;
  startedAt?: Date;
  completedAt?: Date;
  attempts: number;
  timeSpentSeconds: number;
  actions: StepAction[];
  errors?: string[];
}

export interface StepAction {
  type: 'open' | 'close' | 'skip' | 'complete' | 'error' | 'help_viewed' | 'video_watched';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface OnboardingAnalytics {
  totalTimeSpentSeconds: number;
  stepsCompleted: number;
  stepsSkipped: number;
  averageTimePerStep: number;
  completionRate: number;
  helpViewedCount: number;
  videoWatchedCount: number;
  errorsEncountered: number;
}

export interface UseRevolutionaryOnboardingResult {
  // State
  state: RevolutionaryOnboardingState | null;
  loading: boolean;
  error: string | null;

  // Steps
  steps: RevolutionaryOnboardingStep[];
  currentStep: RevolutionaryOnboardingStep | null;
  nextStep: RevolutionaryOnboardingStep | null;
  previousStep: RevolutionaryOnboardingStep | null;

  // Dialog management
  openDialog: (mode: OnboardingDialogMode, data?: any) => void;
  closeDialog: () => void;

  // Step actions
  startStep: (stepId: OnboardingStepId) => Promise<void>;
  completeStep: (stepId: OnboardingStepId, data?: any) => Promise<void>;
  skipStep: (stepId: OnboardingStepId, reason?: string) => Promise<void>;
  goToStep: (stepId: OnboardingStepId) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;

  // View mode
  setViewMode: (mode: OnboardingViewMode) => void;
  toggleFullscreen: () => void;

  // UI preferences
  toggleTooltips: () => void;
  toggleVideoTutorials: () => void;

  // Badge system
  unlockBadge: (badgeId: string) => Promise<void>;

  // Analytics
  trackAction: (stepId: OnboardingStepId, action: StepAction) => Promise<void>;

  // Lifecycle
  resetOnboarding: () => Promise<void>;
  dismissOnboarding: () => void;
  reopenOnboarding: () => void;

  // Computed
  shouldShow: boolean;
  completionPercentage: number;
  isFullyCompleted: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

export const REVOLUTIONARY_ONBOARDING_STEPS: Omit<RevolutionaryOnboardingStep, 'status'>[] = [
  {
    id: 'add_property',
    title: 'Adicionar Primeira Propriedade',
    description: 'Importe do Airbnb ou crie manualmente sua primeira propriedade',
    icon: 'Home',
    order: 1,
    isOptional: false,
    estimatedMinutes: 5,
    hasEmbeddedDialog: true,
    dialogMode: 'property_import',
    guidanceText: 'Você pode importar diretamente do Airbnb usando o hasData ou criar manualmente. Vamos te guiar!',
    tips: [
      {
        id: 'airbnb_hasdata',
        title: 'Como pegar o hasData do Airbnb',
        description: 'Abra o console do navegador (F12), digite "window.hasData" e copie o resultado',
        type: 'tip',
        icon: 'Code',
      },
      {
        id: 'airbnb_url',
        title: 'URL da Propriedade',
        description: 'Cole a URL completa da sua propriedade no Airbnb',
        type: 'info',
        icon: 'Link',
      },
    ],
    completionBadge: {
      id: 'first_property',
      title: 'Primeira Propriedade',
      description: 'Você adicionou sua primeira propriedade!',
      icon: 'Home',
      color: '#10b981',
    },
    sidebarReference: {
      title: 'Propriedades',
      description: 'Acesse todas as suas propriedades pela barra lateral em "Propriedades"',
      path: '/dashboard/properties',
      icon: 'Home',
    },
  },
  {
    id: 'connect_whatsapp',
    title: 'Conectar WhatsApp',
    description: 'Conecte seu WhatsApp para atendimento automatizado com Sofia IA',
    icon: 'WhatsApp',
    order: 2,
    isOptional: true,
    estimatedMinutes: 3,
    hasEmbeddedDialog: true,
    dialogMode: 'whatsapp_connect',
    guidanceText: 'Escaneie o QR Code com seu celular para conectar o WhatsApp',
    tips: [
      {
        id: 'whatsapp_steps',
        title: 'Como Conectar',
        description: '1. Abra WhatsApp\n2. Toque em ⋮\n3. Dispositivos Conectados\n4. Conectar Dispositivo\n5. Escaneie o QR',
        type: 'info',
        icon: 'PhoneAndroid',
      },
    ],
    completionBadge: {
      id: 'whatsapp_connected',
      title: 'WhatsApp Conectado',
      description: 'Seu WhatsApp está conectado e pronto para automatizar!',
      icon: 'WhatsApp',
      color: '#25D366',
    },
    sidebarReference: {
      title: 'Configurações do WhatsApp',
      description: 'Gerencie sua conexão do WhatsApp em "Configurações > WhatsApp"',
      path: '/dashboard/settings?tab=whatsapp',
      icon: 'Settings',
    },
  },
  {
    id: 'test_demo',
    title: 'Criar Primeira Reserva',
    description: 'Teste o sistema criando uma reserva de demonstração',
    icon: 'EventAvailable',
    order: 3,
    isOptional: true,
    estimatedMinutes: 5,
    hasEmbeddedDialog: true,
    dialogMode: 'reservation_create',
    guidanceText: 'Crie uma reserva de teste para ver como funciona o sistema',
    tips: [
      {
        id: 'reservation_auto_select',
        title: 'Propriedade Pré-selecionada',
        description: 'A propriedade que você criou já está selecionada automaticamente',
        type: 'success',
        icon: 'CheckCircle',
      },
    ],
    completionBadge: {
      id: 'first_reservation',
      title: 'Primeira Reserva',
      description: 'Você criou sua primeira reserva!',
      icon: 'EventAvailable',
      color: '#6366f1',
    },
    sidebarReference: {
      title: 'Reservas',
      description: 'Gerencie todas as reservas pela barra lateral em "Reservas"',
      path: '/dashboard/reservations',
      icon: 'EventAvailable',
    },
  },
];

export const DEFAULT_REVOLUTIONARY_STATE: Omit<RevolutionaryOnboardingState, 'startedAt' | 'lastInteractionAt'> = {
  currentStepId: 'add_property',
  viewMode: 'compact',
  activeDialog: {
    mode: null,
    isOpen: false,
  },
  timeSpentSeconds: 0,
  stepInteractions: {
    add_property: { stepId: 'add_property', attempts: 0, timeSpentSeconds: 0, actions: [] },
    connect_whatsapp: { stepId: 'connect_whatsapp', attempts: 0, timeSpentSeconds: 0, actions: [] },
    test_demo: { stepId: 'test_demo', attempts: 0, timeSpentSeconds: 0, actions: [] },
  },
  showTooltips: true,
  showVideoTutorials: true,
  isDismissed: false,
  completedSteps: [],
  skippedSteps: [],
  unlockedBadges: [],
  analytics: {
    totalTimeSpentSeconds: 0,
    stepsCompleted: 0,
    stepsSkipped: 0,
    averageTimePerStep: 0,
    completionRate: 0,
    helpViewedCount: 0,
    videoWatchedCount: 0,
    errorsEncountered: 0,
  },
};
