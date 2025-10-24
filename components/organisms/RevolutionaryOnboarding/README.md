# Revolutionary Onboarding System

Advanced onboarding system with embedded dialogs, interactive guidance, and comprehensive analytics.

## Overview

The Revolutionary Onboarding system is designed to provide an intuitive, professional, and mobile-optimized first-time user experience. It guides users through 4 essential setup steps with embedded dialogs, real-time feedback, and gamification elements.

## Architecture

### Core Components

1. **RevolutionaryOnboarding.tsx** - Main container component
2. **OnboardingStepCard.tsx** - Individual step card with animations
3. **useRevolutionaryOnboarding.ts** - State management hook
4. **revolutionary-onboarding.ts** - Type definitions

### Features

- ✅ **Embedded Dialogs** - Complete tasks without leaving the onboarding flow
- ✅ **Smooth Animations** - Framer Motion-powered transitions
- ✅ **Responsive Design** - Optimized for mobile and desktop
- ✅ **Progress Tracking** - Real-time completion percentage
- ✅ **Analytics** - Track time spent, actions taken, help viewed
- ✅ **Badge System** - Gamification with achievement badges
- ✅ **Sidebar References** - Guide users to features after completion
- ✅ **Multiple View Modes** - Compact, expanded, and fullscreen
- ✅ **Auto-save** - Progress persisted to Firestore every 30 seconds
- ✅ **Error Recovery** - Graceful error handling with recovery options

## Usage

### Basic Usage

```tsx
import { RevolutionaryOnboarding } from '@/components/organisms/RevolutionaryOnboarding';

export default function Dashboard() {
  return (
    <div>
      <RevolutionaryOnboarding variant="compact" />
      {/* Rest of your dashboard */}
    </div>
  );
}
```

### Props

#### RevolutionaryOnboarding

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'compact' \| 'expanded' \| 'fullscreen'` | `'compact'` | Initial display mode |

#### OnboardingStepCard

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `step` | `RevolutionaryOnboardingStep` | Yes | Step data |
| `isActive` | `boolean` | Yes | Whether this is the current step |
| `isCompleted` | `boolean` | Yes | Whether the step is completed |
| `isSkipped` | `boolean` | Yes | Whether the step was skipped |
| `onAction` | `() => void` | Yes | Action button handler |
| `onComplete` | `() => void` | Yes | Complete button handler |
| `onSkip` | `() => void` | No | Skip button handler (optional steps) |
| `onShowTips` | `() => void` | No | Show tips handler |
| `onWatchVideo` | `() => void` | No | Watch video handler |
| `compact` | `boolean` | No | Compact display mode |
| `loading` | `boolean` | No | Loading state |

## Hook API

### useRevolutionaryOnboarding

```tsx
const {
  // State
  state,
  loading,
  error,

  // Steps
  steps,
  currentStep,
  nextStep,
  previousStep,

  // Dialog management
  openDialog,
  closeDialog,

  // Step actions
  startStep,
  completeStep,
  skipStep,
  goToStep,
  goToNextStep,
  goToPreviousStep,

  // View mode
  setViewMode,
  toggleFullscreen,

  // UI preferences
  toggleTooltips,
  toggleVideoTutorials,

  // Badge system
  unlockBadge,

  // Analytics
  trackAction,

  // Lifecycle
  resetOnboarding,
  dismissOnboarding,
  reopenOnboarding,

  // Computed
  shouldShow,
  completionPercentage,
  isFullyCompleted,
  canGoBack,
  canGoForward,
} = useRevolutionaryOnboarding();
```

## Data Structure

### Firestore Collections

```
users/{userId}/revolutionary_onboarding/{tenantId}
  - currentStepId: string
  - viewMode: 'compact' | 'expanded' | 'fullscreen'
  - activeDialog: { mode, isOpen, data }
  - timeSpentSeconds: number
  - stepInteractions: Record<stepId, InteractionData>
  - showTooltips: boolean
  - showVideoTutorials: boolean
  - isDismissed: boolean
  - completedSteps: string[]
  - skippedSteps: string[]
  - unlockedBadges: string[]
  - analytics: Analytics
  - startedAt: Timestamp
  - lastInteractionAt: Timestamp
```

### Step Interaction Data

```typescript
{
  stepId: string;
  startedAt?: Date;
  completedAt?: Date;
  attempts: number;
  timeSpentSeconds: number;
  actions: StepAction[];
  errors?: string[];
}
```

### Analytics Data

```typescript
{
  totalTimeSpentSeconds: number;
  stepsCompleted: number;
  stepsSkipped: number;
  averageTimePerStep: number;
  completionRate: number;
  helpViewedCount: number;
  videoWatchedCount: number;
  errorsEncountered: number;
}
```

## The 4 Steps

### Step 1: Add Property
- **Embedded Dialog**: Property import/creation
- **Tips**: How to get Airbnb hasData, URL, iCal link
- **Badge**: "First Property"
- **Sidebar Reference**: Dashboard > Propriedades

### Step 2: Connect WhatsApp
- **Embedded Dialog**: QR Code scanner
- **Tips**: How to connect WhatsApp on phone
- **Badge**: "WhatsApp Connected"
- **Sidebar Reference**: Dashboard > Configurações > WhatsApp
- **Optional**: Can be skipped

### Step 3: Create First Reservation
- **Embedded Dialog**: Quick reservation form
- **Tips**: Auto-select recently created property
- **Badge**: "First Reservation"
- **Sidebar Reference**: Dashboard > Reservas
- **Optional**: Can be skipped

### Step 4: Share Mini-Site
- **Embedded Dialog**: Mini-site preview and sharing
- **Tips**: Customization options
- **Badge**: "Mini-Site Active"
- **Sidebar Reference**: Dashboard > Mini-Site

## View Modes

### Compact Mode
- Minimal UI with progress bar
- Shows current step only
- Quick action button
- Can expand to full view

### Expanded Mode
- All steps visible
- Individual step cards
- Complete guidance for each step
- Fullscreen toggle available

### Fullscreen Mode
- Full-screen dialog
- Immersive experience
- No distractions
- Perfect for focused onboarding

## Animations

All animations are powered by Framer Motion:

- **Card entrance**: Fade + slide up
- **Step completion**: Scale + bounce
- **Progress bar**: Smooth gradient animation
- **Icon hover**: Rotate wiggle effect
- **Active step**: Pulsing glow effect
- **Dialog transitions**: Scale + fade

## Accessibility

- ARIA labels on all interactive elements
- Keyboard navigation support
- Screen reader friendly
- High contrast mode compatible
- Focus management

## Responsive Breakpoints

- **Mobile** (xs-sm): Single column, compact UI
- **Tablet** (md): Two column layout available
- **Desktop** (lg-xl): Full feature set, optimal spacing

## Analytics & Tracking

Every user action is tracked:

- Step start/complete/skip
- Time spent per step
- Help viewed count
- Video watched count
- Errors encountered
- Dialog open/close

## Performance

- Lazy loading of dialog components
- Memoized computations
- Debounced auto-save (30s)
- Optimized re-renders
- Code splitting ready

## Future Enhancements

Planned for Phase 2-10:
- Gesture controls (swipe)
- Video tutorials
- Help center integration
- Email reminders
- Push notifications
- Tour overlay
- Confetti celebration
- Badge showcase
- Success metrics dashboard

## Testing

```bash
# Test onboarding flow
npm run test:onboarding

# Test accessibility
npm run test:a11y

# Test mobile
npm run test:mobile
```

## Examples

### Programmatic Control

```tsx
function CustomOnboarding() {
  const onboarding = useRevolutionaryOnboarding();

  // Skip to specific step
  const skipToWhatsApp = () => {
    onboarding.goToStep('connect_whatsapp');
  };

  // Complete multiple steps
  const bulkComplete = async () => {
    await onboarding.completeStep('add_property');
    await onboarding.completeStep('connect_whatsapp');
  };

  // Track custom action
  const trackCustom = async () => {
    await onboarding.trackAction('add_property', {
      type: 'help_viewed',
      timestamp: new Date(),
      metadata: { source: 'custom_button' },
    });
  };

  return <RevolutionaryOnboarding />;
}
```

### With Custom Dialog

```tsx
function OnboardingWithCustomDialog() {
  const onboarding = useRevolutionaryOnboarding();

  useEffect(() => {
    if (onboarding.state?.activeDialog.mode === 'property_import') {
      // Your custom dialog logic
    }
  }, [onboarding.state?.activeDialog]);

  return <RevolutionaryOnboarding />;
}
```

## Troubleshooting

### Onboarding not showing
- Check `shouldShow` computed property
- Verify user is authenticated
- Check if `isDismissed` is false
- Ensure tenant is loaded

### Progress not saving
- Check Firestore permissions
- Verify network connection
- Check browser console for errors
- Ensure user has write access

### Animations stuttering
- Check browser performance
- Disable hardware acceleration if needed
- Reduce motion in accessibility settings
- Update to latest Framer Motion

## License

MIT - Locai Platform

## Support

For issues or questions:
- Check logs in `/lib/utils/logger.ts`
- Review Firestore data structure
- Contact dev team
