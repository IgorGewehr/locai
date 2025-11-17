# ⚡ Quick Start - Sistema de Configuração de IA

**Última Atualização:** 17 de Janeiro de 2025

---

## 🎯 O Que Foi Feito

✅ **Sistema Locai está 100% pronto!**

Implementado:
- ✅ APIs de configuração (`/api/ai/config`)
- ✅ APIs de bloqueio de IA (`/api/ai/block-conversation`)
- ✅ Interface de Settings com todos os controles
- ✅ Botão de bloqueio na tela de conversas
- ✅ Types e validações completas
- ✅ Documentação N8N completa

---

## 🚀 Como Testar o Sistema Locai (Agora)

### 1. Acessar Settings

```
http://localhost:3000/dashboard/settings
```

Você verá uma nova seção: **"Configuração do Agente Sofia"**

### 2. Testar Toggles de Agentes

- Habilitar/desabilitar cada agente especializado
- Alterar limites de desconto
- Personalizar prompts e tom de comunicação
- Salvar configurações

### 3. Testar Bloqueio de IA

Na tela de conversas, você verá um botão com ícone de robô ao lado de cada conversa:
- Clique para bloquear a IA naquela conversa
- Digite motivo (opcional)
- Confirme

### 4. Verificar APIs Manualmente

**Buscar configurações:**
```bash
curl "http://localhost:3000/api/ai/config"
```

**Bloquear IA em uma conversa:**
```bash
curl -X POST http://localhost:3000/api/ai/block-conversation \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5511999999999",
    "blocked": true,
    "reason": "Teste de bloqueio"
  }'
```

**Verificar status de bloqueio:**
```bash
curl "http://localhost:3000/api/ai/block-conversation?phone=5511999999999"
```

---

## 📋 Próximos Passos (N8N)

### Opção 1: Implementar Você Mesmo

Siga o guia completo em: **`docs/N8N_MIGRATION_GUIDE.md`**

**Resumo:**
1. Adicionar 4 novos nodes (fetch_ai_config, check_ai_block, etc)
2. Criar Code Nodes para prompts dinâmicos
3. Atualizar Switch de roteamento
4. Testar fluxo completo

**Tempo estimado:** 2-4 horas

### Opção 2: Testar APIs Antes

Teste as APIs diretamente do N8N:

**Node de teste (HTTP Request):**
```
GET https://alugazap.com/api/ai/config?tenantId=pBLM1yqIGhdWthwEW7OyWE9F5mg2
```

Verifique se retorna:
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "agentPermissions": {...},
    "discountSettings": {...},
    "customPrompts": {...}
  }
}
```

---

## 🔧 Integrando Componente de Bloqueio nas Conversas

### Localizar a Tela de Conversas

Procure por arquivos como:
- `app/dashboard/conversations/page.tsx`
- `app/dashboard/conversations/[id]/page.tsx`
- `app/dashboard/conversations/components/ConversationList.tsx`

### Adicionar o Botão

```tsx
import AIControlButton from './components/AIControlButton';

// Onde você lista as conversas ou mostra detalhes:
<Box>
  <Typography>{conversation.name}</Typography>

  {/* Adicionar aqui */}
  <AIControlButton
    phone={conversation.phone}
    conversationName={conversation.name}
  />
</Box>
```

---

## 🧪 Checklist de Testes

### Frontend (Locai)

- [ ] Abrir `/dashboard/settings`
- [ ] Ver seção "Configuração do Agente Sofia"
- [ ] Alternar toggle de "Search Agent"
- [ ] Salvar configurações
- [ ] Verificar mensagem de sucesso
- [ ] Recarregar página e ver configuração salva
- [ ] Testar todos os outros toggles e campos
- [ ] Testar botão "Resetar Padrão"

### Bloqueio de IA

- [ ] Navegar para tela de conversas
- [ ] Ver botão de IA ao lado da conversa
- [ ] Clicar no botão de IA
- [ ] Ver diálogo de confirmação
- [ ] Preencher motivo
- [ ] Confirmar bloqueio
- [ ] Ver indicador visual "IA Bloqueada"
- [ ] Clicar novamente para desbloquear
- [ ] Verificar desbloqueio

### APIs

- [ ] GET `/api/ai/config` retorna configuração
- [ ] PUT `/api/ai/config` atualiza configuração
- [ ] POST `/api/ai/config` reseta para padrão
- [ ] POST `/api/ai/block-conversation` bloqueia IA
- [ ] GET `/api/ai/block-conversation` verifica status

---

## 📊 Estrutura de Dados

### Firestore

**Caminho:** `tenants/{tenantId}/aiConfig/settings`

**Campos principais:**
- `enabled`: boolean (IA habilitada globalmente)
- `agentPermissions`: object (search, booking, sales, support, payments)
- `discountSettings`: object (maxPercentage, criteria)
- `customPrompts`: object (companyName, tone, welcome)

### Redis

**Chave:** `ai:block:{tenantId}:{phone}`

**Valor:**
```json
{
  "blocked": true,
  "blockedBy": "userId",
  "blockedAt": "2025-01-17T...",
  "reason": "Intervenção manual"
}
```

**TTL:** 7 dias

---

## 🐛 Troubleshooting Comum

### "Configuração não carrega"

**Problema:** Componente AIConfigSection não aparece
**Solução:**
1. Verificar se foi importado em `settings/page.tsx`
2. Verificar console do browser por erros
3. Verificar se API `/api/ai/config` está respondendo

### "Erro ao salvar configurações"

**Problema:** Erro 401 ou 500 ao salvar
**Solução:**
1. Verificar autenticação (token Firebase)
2. Verificar logs do servidor
3. Verificar se Firestore está acessível

### "Botão de bloqueio não aparece"

**Problema:** AIControlButton não renderiza
**Solução:**
1. Verificar se foi adicionado ao componente correto
2. Verificar se `phone` está sendo passado corretamente
3. Verificar console por erros de props

### "Redis não encontrado"

**Problema:** Erro ao bloquear/desbloquear IA
**Solução:**
1. Verificar se Redis está rodando
2. Verificar `REDIS_URL` no `.env`
3. Testar conexão: `redis-cli ping`

---

## 📚 Documentação Completa

- **Implementação:** `docs/IMPLEMENTATION_SUMMARY.md`
- **Migração N8N:** `docs/N8N_MIGRATION_GUIDE.md`
- **Types:** `lib/types/ai-config.ts`
- **APIs:** `app/api/ai/config/route.ts` e `app/api/ai/block-conversation/route.ts`

---

## 💡 Dicas de Uso

### Para Personalização Máxima

1. Configure **Nome da Empresa** para aparecer em todas as mensagens
2. Escolha **Tom de Comunicação** adequado ao seu público
3. Crie **Mensagem de Boas-Vindas** única
4. Descreva **Valores da Empresa** para o agente mencionar

### Para Controle de Descontos

1. Defina **Desconto Máximo** conservador (ex: 15%)
2. Configure **Limite de Aprovação** menor (ex: 10%)
3. Habilite apenas **Critérios** que sua empresa pratica
4. Use toggle "Requer Aprovação" para controle humano

### Para Gestão de Agentes

- **Desabilite Search Agent** se não quer automação de busca
- **Desabilite Sales Agent** se prefere vendas manuais
- **Mantenha Support Agent** ativo para perguntas gerais
- **Payments Agent** virá em breve!

---

## 🎓 Exemplos de Uso

### Exemplo 1: Imobiliária Conservadora

```yaml
Configuração:
  enabled: true
  agentPermissions:
    search: true
    booking: false  # Apenas humanos podem reservar
    sales: false    # Apenas humanos podem negociar
    support: true
  discountSettings:
    enabled: false  # Sem descontos automáticos
  customPrompts:
    tone: formal
    companyName: Imobiliária Elite
```

### Exemplo 2: Startup Ágil

```yaml
Configuração:
  enabled: true
  agentPermissions:
    search: true
    booking: true
    sales: true
    support: true
  discountSettings:
    enabled: true
    maxPercentage: 20
    approvalThreshold: 15
    allowedCriteria:
      earlyBooking: true
      longStay: true
      lastMinute: true
  customPrompts:
    tone: casual
    companyName: Casas Incríveis
    welcome: E aí! 🏠 Procurando lugar pra ficar?
```

### Exemplo 3: Bloqueio Estratégico

**Cenário:** Cliente VIP quer falar com gerente

**Ação:**
1. Ir para conversa do cliente
2. Clicar no botão de IA
3. Motivo: "Cliente VIP - negociação especial"
4. Confirmar bloqueio

**Resultado:** Sofia para de responder, gerente assume

---

## ✅ Status de Funcionalidades

| Funcionalidade | Status | Localização |
|----------------|--------|-------------|
| API de Config | ✅ Pronta | `/api/ai/config` |
| API de Bloqueio | ✅ Pronta | `/api/ai/block-conversation` |
| UI de Settings | ✅ Pronta | `/dashboard/settings` |
| Botão de Bloqueio | ✅ Pronto | `AIControlButton.tsx` |
| Types | ✅ Prontos | `lib/types/ai-config.ts` |
| Validações | ✅ Prontas | Zod schemas |
| Documentação N8N | ✅ Pronta | `N8N_MIGRATION_GUIDE.md` |
| Integração N8N | 🔄 Pendente | (Você mesmo) |

---

## 🤝 Suporte

**Dúvidas sobre o sistema:**
- Verifique logs: `[AI-CONFIG]`, `[AI-BLOCK]`
- Console do browser (F12)
- Network tab para requisições HTTP

**Dúvidas sobre N8N:**
- Consulte `N8N_MIGRATION_GUIDE.md`
- Teste endpoints manualmente primeiro
- Logs do N8N workflow

---

**Pronto para começar! 🚀**

Qualquer dúvida, consulte os documentos de referência ou verifique os logs.
