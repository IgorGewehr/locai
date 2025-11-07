# Onboarding Widget

Componente de onboarding (primeiros passos) para novos usuários da plataforma Locai.

## 📋 Características

- ✅ **Persistência Automática**: Progresso salvo automaticamente no Firestore
- ✅ **Multi-tenant**: Isolamento completo por tenant
- ✅ **Responsivo**: Design adaptado para mobile, tablet e desktop
- ✅ **Material-UI**: Interface consistente com o resto da aplicação
- ✅ **Navegação Inteligente**: Redireciona para páginas de ação relevantes
- ✅ **Marcação Manual**: Usuário marca como concluído após completar a tarefa
- ✅ **Modo Compacto/Expandido**: Dois modos de visualização
- ✅ **Progress Tracking**: Barra de progresso visual
- ✅ **Passos Opcionais**: Alguns passos podem ser pulados
- ✅ **Celebração de Conclusão**: Feedback visual ao completar

## 🏗️ Arquitetura

### Estrutura de Arquivos

```
lib/
├── types/
│   └── onboarding.ts          # Tipos TypeScript
├── hooks/
│   └── useOnboarding.ts       # Hook de gerenciamento de estado
components/
└── organisms/
    └── Onboarding/
        ├── OnboardingWidget.tsx  # Componente principal
        ├── index.ts              # Exportações
        └── README.md             # Documentação
```

### Fluxo de Dados

```
User → OnboardingWidget → useOnboarding → Firestore
                              ↓
                    localStorage (dismissed state)
```

## 🎯 Passos do Onboarding

Cada passo possui três botões de ação:
- **Botão Principal** (ex: "Adicionar Propriedade"): Navega para a página da tarefa
- **Botão "Concluído"**: Marca o passo como completado após realizar a tarefa
- **Botão "Pular"** (apenas passos opcionais): Pula o passo

### Fluxo Recomendado:
1. Clique no botão principal para ir à página da tarefa
2. Complete a tarefa na página (ex: adicione uma propriedade)
3. Retorne ao dashboard e clique em "Concluído" no passo correspondente

### Lista de Passos:

1. **Adicionar Propriedade** (Obrigatório)
   - Redireciona para `/dashboard/properties/create`
   - Tempo estimado: 5 minutos
   - Marque como concluído após cadastrar seu primeiro imóvel

2. **Conectar WhatsApp** (Opcional)
   - Redireciona para `/dashboard/settings?tab=whatsapp`
   - Tempo estimado: 3 minutos
   - Marque como concluído após conectar sua conta WhatsApp

3. **Testar Sofia IA** (Opcional)
   - Redireciona para `/dashboard/metricas`
   - Tempo estimado: 5 minutos
   - Marque como concluído após testar uma conversa com a Sofia

4. **Ver Mini-Site** (Obrigatório)
   - Redireciona para `/dashboard/mini-site`
   - Tempo estimado: 2 minutos
   - Marque como concluído após visualizar e configurar seu mini-site

## 🚀 Uso

### Modo Compacto (Dashboard)

```tsx
import { OnboardingWidget } from '@/components/organisms/Onboarding';

export default function DashboardPage() {
  return (
    <Box>
      {/* Aparece automaticamente para novos usuários */}
      <OnboardingWidget variant="compact" />

      {/* Resto do dashboard */}
    </Box>
  );
}
```

### Modo Expandido (Página Dedicada)

```tsx
import { OnboardingWidget } from '@/components/organisms/Onboarding';

export default function OnboardingPage() {
  return (
    <Container maxWidth="lg">
      <OnboardingWidget variant="full" />
    </Container>
  );
}
```

### Hook Personalizado

```tsx
import { useOnboarding } from '@/lib/hooks/useOnboarding';

export default function CustomComponent() {
  const {
    progress,
    loading,
    steps,
    currentStep,
    completeStep,
    skipStep,
    shouldShowOnboarding,
  } = useOnboarding();

  if (!shouldShowOnboarding) return null;

  return (
    <Box>
      <Typography>Passo atual: {currentStep?.title}</Typography>
      <Button onClick={() => completeStep(currentStep!.id)}>
        Completar
      </Button>
    </Box>
  );
}
```

## 📊 Estrutura de Dados Firestore

### Localização
```
users/{userId}/onboarding/{tenantId}
```

### Schema
```typescript
{
  userId: string;
  tenantId: string;
  steps: {
    add_property: 'pending' | 'in_progress' | 'completed' | 'skipped';
    connect_whatsapp: 'pending' | 'in_progress' | 'completed' | 'skipped';
    test_demo: 'pending' | 'in_progress' | 'completed' | 'skipped';
    share_minisite: 'pending' | 'in_progress' | 'completed' | 'skipped';
  };
  currentStepId: OnboardingStepId | null;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  lastUpdatedAt: Timestamp;
  isCompleted: boolean;
  completionPercentage: number;
  metadata?: {
    skippedSteps?: OnboardingStepId[];
    timeSpentMinutes?: number;
  };
}
```

## 🎨 Personalização

### Adicionar Novo Passo

1. Edite `lib/types/onboarding.ts`:
```typescript
export type OnboardingStepId =
  | 'add_property'
  | 'connect_whatsapp'
  | 'test_demo'
  | 'share_minisite'
  | 'new_step'; // Adicione aqui

export const DEFAULT_ONBOARDING_STEPS = [
  // ... passos existentes
  {
    id: 'new_step',
    title: 'Novo Passo',
    description: 'Descrição do novo passo',
    icon: 'Settings',
    actionText: 'Executar Ação',
    actionUrl: '/dashboard/nova-rota',
    order: 5,
    isOptional: true,
    estimatedMinutes: 3,
  },
];
```

2. Adicione o ícone em `OnboardingWidget.tsx`:
```typescript
import { Settings } from '@mui/icons-material';

const ICON_MAP: Record<string, any> = {
  // ... ícones existentes
  Settings,
};
```

### Modificar Comportamento

```typescript
// Resetar onboarding (útil para testes)
const { resetOnboarding } = useOnboarding();
await resetOnboarding();

// Dispensar temporariamente
const { dismissOnboarding } = useOnboarding();
dismissOnboarding(); // Esconde apenas na sessão atual

// Pular passo programaticamente
const { skipStep } = useOnboarding();
await skipStep('connect_whatsapp');
```

## 🔍 Debugging

### Logs Estruturados

O componente usa o sistema de logging profissional do projeto:

```typescript
import { logger } from '@/lib/utils/logger';

// Busque logs no console com prefixo [Onboarding]
logger.info('✅ [Onboarding] Progresso carregado', { ... });
logger.error('❌ [Onboarding] Erro ao carregar progresso', error);
```

### Console do Navegador

```javascript
// Ver estado atual do onboarding
localStorage.getItem('onboarding_dismissed');

// Limpar estado (para testes)
localStorage.clear();
```

### Firestore Console

Acesse: `Firebase Console → Firestore → users → {userId} → onboarding → {tenantId}`

## 🧪 Testes

### Testar Onboarding

1. Crie um novo usuário ou limpe o progresso:
```typescript
const { resetOnboarding } = useOnboarding();
await resetOnboarding();
```

2. Recarregue a página do dashboard

3. O widget deve aparecer automaticamente

### Testar Persistência

1. Complete alguns passos
2. Recarregue a página
3. O progresso deve ser mantido

### Testar Multi-tenant

1. Entre com usuário que pertence a múltiplos tenants
2. Mude de tenant
3. Cada tenant deve ter seu próprio progresso

## 🎯 Boas Práticas

### Performance

- ✅ Componente renderiza apenas quando `shouldShowOnboarding === true`
- ✅ Firestore listeners são limpos automaticamente
- ✅ Estado local evita re-renders desnecessários
- ✅ Modo compacto reduz impacto visual

### UX

- ✅ Usuário pode dispensar o onboarding a qualquer momento
- ✅ Passos opcionais não bloqueiam progresso
- ✅ Feedback visual claro do progresso
- ✅ Celebração ao completar

### Segurança

- ✅ Validação de tenant em todas operações
- ✅ Regras Firestore protegem dados do usuário
- ✅ Não expõe informações sensíveis
- ✅ Logs estruturados para auditoria

## 📝 To-Do (Futuras Melhorias)

- [ ] Adicionar analytics de conclusão
- [ ] Tutorial em vídeo inline
- [ ] Tooltips interativos
- [ ] Gamificação (badges, pontos)
- [ ] A/B testing de diferentes fluxos
- [ ] Recomendações personalizadas baseadas em IA
- [ ] Export de métricas de onboarding para admins

## 🆘 Troubleshooting

### Widget não aparece

1. Verifique se o usuário está autenticado
2. Verifique se o tenant está carregado
3. Verifique no Firestore se `isCompleted === false`
4. Verifique localStorage para `onboarding_dismissed`

### Progresso não persiste

1. Verifique regras de segurança do Firestore
2. Verifique logs de erro no console
3. Verifique conexão com Firebase

### Redirecionamento não funciona

1. Verifique se as rotas existem
2. Verifique permissões de acesso
3. Verifique logs do Next.js router

### Passo não marca como concluído automaticamente

**Isso é esperado!** O comportamento correto é:
1. Usuário clica no botão de ação → navega para a página
2. Usuário completa a tarefa
3. Usuário retorna e clica em "Concluído" manualmente
4. Ou a página de destino pode chamar `completeStep()` programaticamente quando detectar que a tarefa foi concluída

## 📚 Referências

- [Material-UI Documentation](https://mui.com/)
- [Firebase Firestore](https://firebase.google.com/docs/firestore)
- [Next.js App Router](https://nextjs.org/docs/app)
- [CLAUDE.md do Projeto](../../../CLAUDE.md)
