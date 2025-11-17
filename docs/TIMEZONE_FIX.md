# 🕐 Correção de Timezone do Heatmap

**Data:** 17 de Janeiro de 2025
**Problema:** Heatmap exibindo horários com diferença de 3 horas

---

## 🐛 Problema Identificado

### Sintoma
- Conversas às 10h da manhã apareciam às 13h no heatmap
- Diferença de exatamente 3 horas

### Causa Raiz
O código estava usando métodos JavaScript que retornam horário **local do servidor**:

```typescript
// ANTES (incorreto)
const dayOfWeek = messageDate.getDay();    // Horário local do servidor
const hour = messageDate.getHours();       // Horário local do servidor
```

**Problema:** O servidor provavelmente está em UTC (0), mas os dados do Firebase estão em horário de Brasília (UTC-3).

Quando uma mensagem é criada às **10h em Brasília**:
1. Firebase armazena como **13:00 UTC**
2. Servidor lê como **13h** (pensa que é horário local)
3. Heatmap exibe **13h** (errado!)

---

## ✅ Solução Implementada

### Conversão para Timezone de Brasília

```typescript
// DEPOIS (correto)
// Convert to Brasília timezone (GMT-3 / UTC-3)
const brasiliaOffset = -3; // UTC-3
const utcHour = messageDate.getUTCHours();  // Hora em UTC
const utcDay = messageDate.getUTCDay();     // Dia em UTC

// Calculate Brasília hour
let hour = utcHour + brasiliaOffset;  // UTC + (-3) = Brasília
let dayOfWeek = utcDay;

// Handle day boundary crossing
if (hour < 0) {
  hour += 24;
  dayOfWeek = (dayOfWeek - 1 + 7) % 7;
} else if (hour >= 24) {
  hour -= 24;
  dayOfWeek = (dayOfWeek + 1) % 7;
}
```

### Como Funciona

**Exemplo 1: 10h em Brasília**
```
Firestore: 2025-01-17T13:00:00Z (UTC)
utcHour = 13
hour = 13 + (-3) = 10 ✅
Heatmap exibe: 10h (correto!)
```

**Exemplo 2: 23h em Brasília**
```
Firestore: 2025-01-18T02:00:00Z (UTC, dia seguinte)
utcHour = 2 (dia 18)
utcDay = 6 (Sábado, dia 18)

hour = 2 + (-3) = -1 (negativo!)
hour += 24 = 23 ✅
dayOfWeek = (6 - 1 + 7) % 7 = 5 (Sexta, dia 17) ✅

Heatmap exibe: Sexta 23h (correto!)
```

**Exemplo 3: 1h em Brasília**
```
Firestore: 2025-01-17T04:00:00Z (UTC)
utcHour = 4
hour = 4 + (-3) = 1 ✅
Heatmap exibe: 1h (correto!)
```

---

## 🧪 Validação

### Teste Manual

Para validar a correção:

1. **Criar mensagem às 10h de Brasília**
   ```bash
   # Verificar timestamp no Firebase
   # Deve ser algo como: 2025-01-17T13:00:00Z (13h UTC)
   ```

2. **Verificar heatmap**
   ```bash
   # Acessar: http://localhost:3000/dashboard
   # Procurar célula do dia/hora correspondente
   # Deve mostrar atividade às 10h (não 13h)
   ```

3. **Testar bordas (horários críticos)**
   - 0h Brasília → 3h UTC (deve exibir 0h)
   - 23h Brasília → 2h UTC do dia seguinte (deve exibir 23h do dia anterior)
   - 12h Brasília → 15h UTC (deve exibir 12h)

---

## 📋 Arquivo Modificado

**Arquivo:** `app/api/metrics/analytics/route.ts`

**Função:** `generateHeatmapFromMessages()` (linhas 455-550)

**Mudança:** Linhas 491-510

**Tipo:** Bug fix (timezone correction)

---

## 🌍 Considerações de Timezone

### Brasília (America/Sao_Paulo)

- **Horário Padrão:** UTC-3 (usado na maior parte do ano)
- **Horário de Verão:** UTC-2 (quando ativo, de Outubro a Fevereiro)
  - **Nota:** Em 2019, o Brasil **aboliu o horário de verão**
  - Portanto, usar fixo UTC-3 está correto

### Por Que Não Usar Biblioteca?

**Opções consideradas:**
1. ❌ `date-fns-tz`: Adiciona 50KB+ ao bundle
2. ❌ `moment-timezone`: Biblioteca pesada (500KB+)
3. ✅ **Cálculo manual:** 10 linhas de código, zero dependencies

**Decisão:** Implementação manual é mais eficiente para um único timezone fixo.

---

## 🔄 Impacto

### O Que Muda

- ✅ Heatmap agora exibe horários corretos (Brasília/UTC-3)
- ✅ Dados de atividade refletem horário real do Brasil
- ✅ Analytics de horário de pico corretos

### O Que NÃO Muda

- ❌ Timestamps no Firestore (continuam em UTC, como esperado)
- ❌ Outros componentes (não afetados)
- ❌ Performance (impacto zero)

---

## 📊 Exemplo Visual

### Antes da Correção ❌

```
Heatmap:
Seg | ... | [13h: 5 conv] | [14h: 3 conv] | ...
    |     |   ↑ ERRADO     |   ↑ ERRADO    |
```

**Problema:** Usuário enviou mensagem às 10h, mas aparece às 13h.

### Depois da Correção ✅

```
Heatmap:
Seg | ... | [10h: 5 conv] | [11h: 3 conv] | ...
    |     |   ↑ CORRETO   |   ↑ CORRETO   |
```

**Solução:** Horários refletem timezone de Brasília (UTC-3).

---

## 🚀 Deploy

### Checklist

- [x] Código corrigido
- [x] Type-check passa
- [x] Zero dependencies adicionadas
- [x] Documentação atualizada
- [ ] Testar em produção
- [ ] Monitorar logs após deploy

### Rollback

Caso necessário reverter:

```diff
- // Convert to Brasília timezone (GMT-3 / UTC-3)
- const brasiliaOffset = -3;
- const utcHour = messageDate.getUTCHours();
- const utcDay = messageDate.getUTCDay();
- ...
+ const dayOfWeek = messageDate.getDay();
+ const hour = messageDate.getHours();
```

**Nota:** Rollback NÃO recomendado, pois manteria o bug.

---

## 💡 Melhorias Futuras

### Timezone Configurável (Opcional)

Se no futuro houver clientes em outros timezones:

```typescript
// lib/config/timezone.ts
export const TENANT_TIMEZONES = {
  'tenant1': -3,  // Brasília (UTC-3)
  'tenant2': -5,  // Nova York (UTC-5)
  'tenant3': 0,   // Londres (UTC+0)
};

// Uso na API:
const offset = TENANT_TIMEZONES[tenantId] || -3; // Default Brasília
```

**Nota:** Por enquanto, não necessário (todos os clientes no Brasil).

---

## 📝 Notas Técnicas

### Por Que UTC no Firebase?

Firebase armazena timestamps em UTC por padrão:
- ✅ Consistência global
- ✅ Facilita comparações
- ✅ Independente de timezone local

### Responsabilidade de Conversão

- **Firebase:** Armazena em UTC
- **Servidor:** Converte para timezone do negócio
- **Frontend:** Exibe já convertido

**Camadas:**
```
[Firebase: UTC] → [API: UTC-3] → [Frontend: Display]
```

---

## ✅ Conclusão

**Status:** ✅ Bug corrigido

O heatmap agora exibe corretamente os horários em **horário de Brasília (UTC-3)**, refletindo o timezone real dos usuários e negócios brasileiros.

**Impacto:**
- Zero breaking changes
- Zero dependencies adicionadas
- Performance mantida
- Precisão dos dados aumentada

---

**Autor:** Claude Code
**Reviewed:** [Pendente]
**Deployed:** [Pendente]
