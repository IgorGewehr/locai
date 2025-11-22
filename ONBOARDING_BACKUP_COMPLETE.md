# 📦 Backup Completo do Sistema de Onboarding (3 Passos)

## 🗂️ Arquivos de Backup

Todo o sistema de onboarding com 3 passos (incluindo "Configurar Sistema") foi preservado nos seguintes locais:

### 1. **Tipos e Lógica**
```
lib/
├── types/
│   ├── onboarding.old.ts              ← Backup dos tipos (3 passos)
│   └── ONBOARDING_BACKUP_README.md    ← Instruções básicas
└── hooks/
    └── useOnboarding.old.ts           ← Backup do hook (3 passos)
```

### 2. **Componente Visual**
```
app/dashboard/onboarding/
└── configure.old/
    └── page.old.tsx                   ← Backup da página de configuração
```

---

## 📋 Sistema Atual vs. Sistema Original

### ✅ Sistema Atual (2 passos)

**Arquivos Ativos:**
- `lib/types/onboarding.ts` - Tipos limpos (apenas 2 steps)
- `lib/hooks/useOnboarding.ts` - Hook limpo
- `components/organisms/OnboardingWidget.tsx` - Widget (lê dos tipos)

**Steps:**
1. Adicionar Propriedade (`add_property`)
2. Conectar WhatsApp (`connect_whatsapp`)

**Rotas:**
- `/dashboard/properties/create` - Step 1
- `/dashboard/settings?tab=whatsapp` - Step 2

---

### 📦 Sistema Original (3 passos) - BACKUP

**Arquivos de Backup:**
- `lib/types/onboarding.old.ts`
- `lib/hooks/useOnboarding.old.ts`
- `app/dashboard/onboarding/configure.old/page.old.tsx`

**Steps:**
1. Adicionar Propriedade (`add_property`)
2. **Configurar Sistema** (`configure_system`) ← REMOVIDO
3. Conectar WhatsApp (`connect_whatsapp`)

**Rotas Originais:**
- `/dashboard/properties/create` - Step 1
- `/dashboard/onboarding/configure` - Step 2 (BACKUP)
- `/dashboard/settings?tab=whatsapp` - Step 3

---

## 🔄 Como Restaurar o Sistema Completo (3 Passos)

### Opção 1: Restauração Automática (Recomendado)

```bash
# 1. Restaurar tipos
cd lib/types
cp onboarding.old.ts onboarding.ts

# 2. Restaurar hook
cd ../hooks
cp useOnboarding.old.ts useOnboarding.ts

# 3. Restaurar página de configuração
cd ../../app/dashboard/onboarding
mkdir -p configure
cp configure.old/page.old.tsx configure/page.tsx

# 4. Reiniciar servidor
# Ctrl+C no terminal do servidor e rode novamente:
npm run dev
```

---

### Opção 2: Restauração Manual

#### Passo 1: Atualizar `lib/types/onboarding.ts`

**A. Adicionar tipo:**
```typescript
export type OnboardingStepId = 'add_property' | 'configure_system' | 'connect_whatsapp';
```

**B. Adicionar step no array:**
```typescript
export const DEFAULT_ONBOARDING_STEPS: Omit<OnboardingStep, 'status'>[] = [
  {
    id: 'add_property',
    title: 'Adicionar a primeira propriedade',
    description: 'Cadastre seu primeiro imóvel na plataforma...',
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
    description: 'Configure as informações da sua empresa e personalize a Sofia...',
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
    description: 'Integre sua conta do WhatsApp...',
    icon: 'WhatsApp',
    actionText: 'Conectar WhatsApp',
    actionUrl: '/dashboard/settings?tab=whatsapp',
    order: 3, // ← Mudar de 2 para 3
    isOptional: false,
    estimatedMinutes: 3,
  },
];
```

#### Passo 2: Atualizar `lib/hooks/useOnboarding.ts`

**Adicionar `configure_system` em 2 lugares:**

**A. Na função `loadProgress()` (linha ~101):**
```typescript
const initialSteps: Record<OnboardingStepId, OnboardingStepStatus> = {
  add_property: 'pending',
  configure_system: 'pending', // ← Adicionar
  connect_whatsapp: 'pending',
};
```

**B. Na função `resetOnboarding()` (linha ~282):**
```typescript
const initialSteps: Record<OnboardingStepId, OnboardingStepStatus> = {
  add_property: 'pending',
  configure_system: 'pending', // ← Adicionar
  connect_whatsapp: 'pending',
};
```

#### Passo 3: Restaurar Página Visual

```bash
mkdir -p app/dashboard/onboarding/configure
cp app/dashboard/onboarding/configure.old/page.old.tsx app/dashboard/onboarding/configure/page.tsx
```

---

## 📄 Conteúdo da Página de Configuração (Step 2)

A página `/dashboard/onboarding/configure` contém um wizard com 3 sub-passos:

### Sub-Passo 1: Informações da Empresa
- Nome da empresa
- Telefone
- Email
- Website
- Descrição

### Sub-Passo 2: Agente Sofia (IA)
- Habilitar/Desabilitar Sofia
- Nome da empresa para Sofia
- Tom de comunicação (Formal/Amigável/Casual)
- Mensagem de boas-vindas personalizada

### Sub-Passo 3: Negociação e Descontos
- Habilitar descontos dinâmicos
- Desconto máximo (%)
- Limite para aprovação manual
- Critérios permitidos:
  - Reserva antecipada
  - Estadia longa
  - Baixa temporada
  - Última hora
  - Múltiplos imóveis

---

## ⚠️ Considerações Importantes

### Ao Restaurar:

1. **Usuários Antigos vs. Novos:**
   - Usuários criados com 2 passos terão progresso diferente no Firestore
   - Usuários criados com 3 passos terão o campo `configure_system`
   - Não há conflito, mas é bom estar ciente

2. **Firestore:**
   - Não é necessário migrar dados
   - Usuários antigos podem ter o step `configure_system` pendente
   - Basta completar manualmente se necessário

3. **Reiniciar Servidor:**
   - Sempre reinicie o servidor de desenvolvimento após restaurar
   - Limpe cache do navegador (Cmd+Shift+R / Ctrl+F5)

4. **Testes:**
   - Crie uma nova conta de teste para verificar os 3 passos
   - Teste cada sub-passo da página de configuração

---

## 📊 Comparação de Arquivos

| Arquivo | Versão Atual (2 passos) | Versão Backup (3 passos) |
|---------|------------------------|--------------------------|
| **onboarding.ts** | 87 linhas | ~110 linhas |
| **useOnboarding.ts** | ~360 linhas | ~360 linhas |
| **configure/page.tsx** | ❌ Removido | ✅ 836 linhas |

---

## 🗓️ Histórico de Mudanças

**Data:** 2025-11-22

**Motivo da Remoção:**
- Simplificar onboarding para novos usuários
- Reduzir de 3 para 2 passos essenciais
- Configuração da Sofia pode ser feita depois em Settings

**Passos Removidos:**
1. ~~Configurar Sistema~~ → Movido para `/dashboard/settings`

**Passos Mantidos:**
1. ✅ Adicionar Propriedade (essencial)
2. ✅ Conectar WhatsApp (essencial)

---

## 📞 Suporte

Se precisar de ajuda para restaurar o sistema:

1. Verifique os arquivos `.old.ts` estão intactos
2. Siga as instruções da Opção 1 (Restauração Automática)
3. Reinicie o servidor
4. Teste com uma nova conta

---

**Backup criado e preservado em:** 2025-11-22
**Todos os arquivos originais estão seguros!** ✅
