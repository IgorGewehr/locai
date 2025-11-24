# Consolidação do Onboarding - Revolutionary → Base

## 📋 Resumo

Consolidamos a estrutura de dados do Revolutionary Onboarding para usar **apenas** a coleção `/users/{userId}/onboarding/{tenantId}`, eliminando a duplicação com `/users/{userId}/revolutionary_onboarding/{tenantId}`.

## 🎯 Problema Resolvido

Antes tínhamos **dois** caminhos no Firebase:

1. **`/users/{userId}/onboarding/{tenantId}`** - usado pelo `useOnboarding.ts`
   - Campos básicos: `steps`, `currentStepId`, `completionPercentage`, `isCompleted`

2. **`/users/{userId}/revolutionary_onboarding/{tenantId}`** - usado pelo `useRevolutionaryOnboarding.ts`
   - Campos avançados: `stepInteractions`, `analytics`, `viewMode`, `activeDialog`, `timeSpentSeconds`, etc.

### Problema:
- Duplicação de dados
- O `useRevolutionaryOnboarding.ts` dependia do `useOnboarding.ts` internamente
- Confusão sobre qual coleção usar

## ✅ Solução Implementada

### 1. Estrutura Unificada

Agora **tudo** vai para `/users/{userId}/onboarding/{tenantId}` com campos estendidos:

```typescript
interface OnboardingProgress {
  // Campos básicos (obrigatórios)
  userId: string;
  tenantId: string;
  steps: Record<OnboardingStepId, OnboardingStepStatus>;
  currentStepId: OnboardingStepId | null;
  startedAt: Date;
  completedAt?: Date;
  lastUpdatedAt: Date;
  isCompleted: boolean;
  completionPercentage: number;

  // Campos Revolutionary (opcionais)
  viewMode?: 'compact' | 'expanded' | 'fullscreen';
  activeDialog?: {
    mode: string | null;
    isOpen: boolean;
    data?: any;
  };
  lastInteractionAt?: Date;
  timeSpentSeconds?: number;
  stepInteractions?: Record<string, any>;
  showTooltips?: boolean;
  showVideoTutorials?: boolean;
  isDismissed?: boolean;
  completedSteps?: OnboardingStepId[];
  skippedSteps?: OnboardingStepId[];
  unlockedBadges?: string[];
  analytics?: {
    totalTimeSpentSeconds?: number;
    stepsCompleted?: number;
    stepsSkipped?: number;
    averageTimePerStep?: number;
    completionRate?: number;
    helpViewedCount?: number;
    videoWatchedCount?: number;
    errorsEncountered?: number;
  };
}
```

### 2. Arquivos Modificados

#### `lib/types/onboarding.ts`
- ✅ Adicionados campos Revolutionary ao tipo `OnboardingProgress` (opcionais)

#### `lib/hooks/useOnboarding.ts`
- ✅ Atualizado para criar documentos com campos Revolutionary
- ✅ Carrega campos estendidos quando existem
- ✅ Mantém retrocompatibilidade com documentos antigos

#### `lib/hooks/useRevolutionaryOnboarding.ts`
- ✅ Mudou de `revolutionary_onboarding` para `onboarding`
- ✅ Agora usa o mesmo caminho que o hook base
- ✅ Logs atualizados para indicar caminho `/onboarding/`

### 3. Script de Migração

Criado `scripts/migrate-onboarding-data.ts` para migrar dados existentes.

**Uso:**
```bash
npx tsx scripts/migrate-onboarding-data.ts
```

**O que faz:**
1. Busca todos os documentos em `/revolutionary_onboarding/`
2. Mescla com dados existentes em `/onboarding/` (se houver)
3. Cria novos documentos em `/onboarding/` se não existir
4. **Deleta** os documentos antigos de `/revolutionary_onboarding/`

## 🚀 Impacto

### Para Novos Usuários
- ✅ Nenhuma mudança necessária
- ✅ Tudo funciona automaticamente com a estrutura consolidada

### Para Usuários Existentes
- ⚠️ Execute o script de migração **uma vez**:
  ```bash
  npx tsx scripts/migrate-onboarding-data.ts
  ```
- ✅ Após migração, os dados estarão consolidados em `/onboarding/`
- ✅ Nenhum dado será perdido

### Componentes Afetados

#### ✅ Funcionam Normalmente
- `components/organisms/RevolutionaryOnboarding/RevolutionaryOnboarding.tsx`
- `components/organisms/RevolutionaryOnboarding/SafeRevolutionaryOnboarding.tsx`
- `components/organisms/Onboarding/OnboardingWidget.tsx`

#### 📝 Hooks Atualizados
- `lib/hooks/useOnboarding.ts` - mantém compatibilidade
- `lib/hooks/useRevolutionaryOnboarding.ts` - usa novo caminho

## 🧪 Testes

### Teste Manual Rápido

1. **Criar novo usuário**:
   - Criar conta
   - Verificar que `/users/{userId}/onboarding/{tenantId}` é criado
   - Verificar que campos Revolutionary estão presentes

2. **Usuário existente (após migração)**:
   - Login
   - Verificar que onboarding aparece corretamente
   - Interagir com passos
   - Verificar que métricas são salvas em `/onboarding/`

### Verificar no Firebase Console

```
users/
  {userId}/
    onboarding/
      {tenantId}/
        ✅ userId: string
        ✅ tenantId: string
        ✅ steps: { add_property: "pending", connect_whatsapp: "pending" }
        ✅ currentStepId: "add_property"
        ✅ viewMode: "compact"
        ✅ stepInteractions: { ... }
        ✅ analytics: { ... }
        ✅ ... (outros campos Revolutionary)
```

## 📊 Benefícios

1. **Simplicidade**: Uma única coleção para gerenciar
2. **Performance**: Menos leituras do Firestore
3. **Manutenibilidade**: Código mais limpo e centralizado
4. **Backward Compatible**: Documentos antigos continuam funcionando
5. **Extensível**: Fácil adicionar novos campos no futuro

## 🔄 Rollback (se necessário)

Se precisar reverter:

1. Restaurar arquivos originais:
   ```bash
   git checkout HEAD~1 -- lib/types/onboarding.ts
   git checkout HEAD~1 -- lib/hooks/useOnboarding.ts
   git checkout HEAD~1 -- lib/hooks/useRevolutionaryOnboarding.ts
   ```

2. Dados permanecem em `/onboarding/` e continuam funcionando

## 📝 Notas Importantes

- ✅ **Campos opcionais**: Todos os campos Revolutionary são opcionais para retrocompatibilidade
- ✅ **Sem breaking changes**: Código antigo continua funcionando
- ✅ **Script seguro**: Migração faz merge de dados, não sobrescreve
- ⚠️ **Execute migração apenas uma vez**: Script deleta dados de `revolutionary_onboarding`

## 🎉 Conclusão

A consolidação está completa! Agora:
- ✅ Um único caminho no Firebase: `/users/{userId}/onboarding/{tenantId}`
- ✅ Todos os campos Revolutionary estão disponíveis
- ✅ Revolutionary Onboarding continua sendo o componente visual principal
- ✅ Código mais limpo e manutenível

---

**Última atualização**: 2025-11-23
**Autor**: Claude Code + Igor Gewehr
