# 🎯 Onboarding - Feature Flag para Step de Configuração do Sistema

## 📋 Resumo

O componente de onboarding agora possui uma **feature flag** que permite ocultar/exibir temporariamente o **Step 2** (Configuração da Sofia e Sistema) sem perder nenhum código ou design.

## 🚀 Como Usar

### Para Ocultar o Step 2 (Configuração):

1. Abra o arquivo: `lib/types/onboarding.ts`
2. Localize a constante: `ENABLE_SYSTEM_CONFIGURATION_STEP`
3. Configure como `false`:

```typescript
export const ENABLE_SYSTEM_CONFIGURATION_STEP = false;
```

**Resultado:** O onboarding mostrará apenas 2 steps:
- ✅ Step 1: Adicionar a primeira propriedade
- ✅ Step 2: Conectar o WhatsApp (antigo Step 3)

---

### Para Reativar o Step 2 (Configuração):

1. Abra o arquivo: `lib/types/onboarding.ts`
2. Localize a constante: `ENABLE_SYSTEM_CONFIGURATION_STEP`
3. Configure como `true`:

```typescript
export const ENABLE_SYSTEM_CONFIGURATION_STEP = true;
```

**Resultado:** O onboarding mostrará os 3 steps completos:
- ✅ Step 1: Adicionar a primeira propriedade
- ✅ Step 2: Configurar sua empresa e IA
- ✅ Step 3: Conectar o WhatsApp

---

## 🎨 O Que Foi Preservado

Todo o código e design do Step 2 está 100% intacto:

1. **UI/UX Completo:** Design, cores, animações, ícones
2. **Lógica de Negócio:** Validações, fluxo, persistência
3. **Página de Configuração:** `/dashboard/onboarding/configure`
4. **Tipos TypeScript:** Todos os tipos permanecem definidos
5. **Hook useOnboarding:** Funciona perfeitamente com 2 ou 3 steps

---

## 🔧 Como Funciona Tecnicamente

### 1. **Feature Flag** (`lib/types/onboarding.ts:71`)

```typescript
export const ENABLE_SYSTEM_CONFIGURATION_STEP = false;
```

### 2. **Filtragem Automática** (`lib/types/onboarding.ts:107`)

```typescript
export const DEFAULT_ONBOARDING_STEPS = [
  { id: 'add_property', ... },
  { id: 'configure_system', ... },  // ← Este step é filtrado quando flag = false
  { id: 'connect_whatsapp', ... },
].filter(step => ENABLE_SYSTEM_CONFIGURATION_STEP || step.id !== 'configure_system');
```

### 3. **Inicialização Dinâmica** (`lib/hooks/useOnboarding.ts:101-109`)

```typescript
const initialSteps: Record<string, OnboardingStepStatus> = {
  add_property: 'pending',
  connect_whatsapp: 'pending',
};

// Adiciona configure_system apenas se habilitado
if (ENABLE_SYSTEM_CONFIGURATION_STEP) {
  initialSteps.configure_system = 'pending';
}
```

### 4. **Numeração Dinâmica** (`OnboardingWidget.tsx:421`)

```typescript
Configure sua conta em {steps.length} passos simples
// Mostra "2 passos" quando flag = false
// Mostra "3 passos" quando flag = true
```

---

## ✅ Checklist de Teste

Quando reativar o step, teste o seguinte:

- [ ] O widget de onboarding mostra "3 passos simples"
- [ ] O Step 2 aparece com título "Configurar sua empresa e IA"
- [ ] O botão "Configurar Sistema" navega para `/dashboard/onboarding/configure`
- [ ] A página de configuração funciona corretamente
- [ ] O progresso é salvo no Firestore com `configure_system: 'pending'`
- [ ] Após completar o Step 2, o Step 3 (WhatsApp) torna-se o passo atual
- [ ] A barra de progresso calcula 33%, 66%, 100% corretamente

---

## 📊 Estado Atual

**Status:** `ENABLE_SYSTEM_CONFIGURATION_STEP = false` ✅

O onboarding está configurado para mostrar apenas:
1. Adicionar propriedade
2. Conectar WhatsApp

---

## 🎓 Vantagens desta Abordagem

1. **Zero Perda de Código:** Tudo está preservado
2. **Fácil Reativação:** Apenas 1 linha para mudar
3. **Type-Safe:** TypeScript garante consistência
4. **Persistência Inteligente:** Firestore adapta-se automaticamente
5. **UX Consistente:** Interface adapta-se perfeitamente

---

## 📝 Localização dos Arquivos Modificados

```
lib/types/onboarding.ts                          ← Feature flag e definição dos steps
lib/hooks/useOnboarding.ts                       ← Lógica de inicialização dinâmica
components/organisms/Onboarding/OnboardingWidget.tsx  ← Numeração dinâmica no header
```

---

## 🆘 Suporte

Se encontrar algum problema ao reativar o step:

1. Verifique se `ENABLE_SYSTEM_CONFIGURATION_STEP = true`
2. Limpe o cache do navegador (Ctrl+Shift+R / Cmd+Shift+R)
3. Reinicie o servidor de desenvolvimento (`npm run dev`)
4. Verifique os logs do console para erros

---

**Última atualização:** 2025-01-20
**Autor:** Igor Gewehr + Claude Code
**Status:** ✅ Pronto para produção
