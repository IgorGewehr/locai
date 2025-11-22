# Backup do Sistema de Onboarding com 3 Passos

## 📦 Arquivos de Backup

Os arquivos originais com o passo "Configurar Sistema" (configure_system) foram salvos com a extensão `.old.ts`:

1. **`onboarding.old.ts`** - Tipos e definições originais com 3 passos
2. **`../hooks/useOnboarding.old.ts`** - Hook original com lógica para 3 passos

## 🔄 Como Restaurar o Passo 2 (Configure System)

Para restaurar o sistema de onboarding com 3 passos, siga os passos abaixo:

### Opção 1: Restaurar os backups (mais rápido)

```bash
# Na pasta lib/types/
cp onboarding.old.ts onboarding.ts

# Na pasta lib/hooks/
cp useOnboarding.old.ts useOnboarding.ts
```

### Opção 2: Modificar manualmente os arquivos atuais

#### 1. Atualizar `onboarding.ts` (lib/types/onboarding.ts)

**Alterar o tipo OnboardingStepId:**
```typescript
export type OnboardingStepId = 'add_property' | 'configure_system' | 'connect_whatsapp';
```

**Adicionar o step no array DEFAULT_ONBOARDING_STEPS:**
```typescript
export const DEFAULT_ONBOARDING_STEPS: Omit<OnboardingStep, 'status'>[] = [
  {
    id: 'add_property',
    title: 'Adicionar a primeira propriedade',
    // ... (mantém igual)
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
    order: 3, // ← Alterar de 2 para 3
    // ... (mantém o resto igual)
  },
];
```

#### 2. Atualizar `useOnboarding.ts` (lib/hooks/useOnboarding.ts)

**Adicionar configure_system nos initialSteps:**
```typescript
const initialSteps: Record<OnboardingStepId, OnboardingStepStatus> = {
  add_property: 'pending',
  configure_system: 'pending', // ← Adicionar esta linha
  connect_whatsapp: 'pending',
};
```

Isso deve ser feito em **2 lugares**:
- Na função `loadProgress()` (quando cria novo progresso)
- Na função `resetOnboarding()`

## 📋 Resumo das Mudanças

### Versão Atual (2 passos)
1. Adicionar propriedade
2. Conectar WhatsApp

### Versão Original (3 passos - no backup)
1. Adicionar propriedade
2. **Configurar Sistema** ← Removido temporariamente
3. Conectar WhatsApp

## ⚠️ Importante

- Os backups `.old.ts` **NÃO são importados/compilados** pelo TypeScript
- Eles são apenas para referência futura
- Ao restaurar, certifique-se de reiniciar o servidor de desenvolvimento
- Novos usuários criados com 2 passos terão progresso diferente dos criados com 3 passos

## 🗓️ Data do Backup

Criado em: 2025-11-22
Motivo: Remover temporariamente o passo "Configurar Sistema" do onboarding
