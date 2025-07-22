# 🔧 Guia de Troubleshooting - Agente de IA

## 🎯 Visão Geral dos Problemas Comuns

Este guia ajuda a identificar e resolver os principais problemas do sistema de IA.

---

## 📊 Dashboard de Debug

Acesse `/dashboard/debug` para usar as ferramentas de diagnóstico:

- **Teste do Agente**: Simula conversas completas
- **Teste do Webhook**: Verifica configuração do WhatsApp  
- **Teste das Funções**: Valida busca de propriedades e cache
- **Análise de Logs**: Logs detalhados de cada componente

---

## 🔍 Diagnóstico Sistemático

### 1. ✅ Verificação Inicial

Execute estes comandos para verificação rápida:

```bash
# 1. Verificar se o servidor está rodando
curl http://localhost:3000/api/debug/webhook-test

# 2. Testar o agente diretamente
curl -X POST http://localhost:3000/api/debug/agent-test \
  -H "Content-Type: application/json" \
  -d '{"message": "Olá", "phone": "5511999999999"}'

# 3. Testar funções do agente
curl http://localhost:3000/api/debug/functions-test
```

### 2. 🔎 Análise de Logs

Monitore os logs para identificar problemas:

```bash
# Em desenvolvimento
npm run dev

# Procurar por padrões específicos nos logs:
# [WEBHOOK-xxxxx] - Logs do webhook
# [SEARCH-xxxxx] - Logs de busca de propriedades  
# [INTENT] - Logs de detecção de intenção
# [Agent] - Logs gerais do agente
```

---

## ❌ Problemas Comuns e Soluções

### 🚫 Problema 1: "Agente não responde no WhatsApp"

#### Sintomas:
- Mensagens enviadas mas sem resposta
- Webhook não recebe as mensagens

#### Diagnóstico:
```bash
# Verificar configuração do webhook
GET /api/debug/webhook-test
```

#### Possíveis Causas e Soluções:

**A) Webhook não configurado no Meta**
```bash
# Verificar se o webhook está registrado no Meta Developer Console
# URL deve ser: https://seu-dominio.com/api/webhook/whatsapp
# Verify Token deve coincidir com WHATSAPP_VERIFY_TOKEN
```

**B) Credenciais incorretas**
```env
# Verificar .env.local
WHATSAPP_ACCESS_TOKEN=EAAxxxx...
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_VERIFY_TOKEN=sua_verify_token
```

**C) Erro de rate limiting**
```bash
# Logs mostrarão:
🚫 [WEBHOOK-xxxxx] Rate limit excedido para 5511999999999

# Solução: Aguardar 1 minuto ou reiniciar servidor
```

---

### 🚫 Problema 2: "Agente detecta intenção errada"

#### Sintomas:
- Responde "Como posso ajudar?" para "Quero alugar apartamento"
- Detecta 'general' ao invés de 'search_properties'

#### Diagnóstico:
```bash
# Testar detecção de intenção
POST /api/debug/agent-test
{
  "message": "Sua mensagem aqui",
  "phone": "5511999999999"
}

# Verificar logs:
🎯 [INTENT] Detectando intenção para: "sua mensagem"
✅ [INTENT] Detectado: search_properties (score: 3)
```

#### Soluções:

**A) Adicionar mais palavras-chave**
```typescript
// Em /lib/ai-agent/professional-agent.ts
search_properties: [
  'procuro', 'busco', 'quero', 'preciso',
  'sua_nova_palavra_chave_aqui'
]
```

**B) Verificar score system**
```typescript
// O sistema pontua matches:
// - Match exato: 3 pontos
// - Palavra completa: 2 pontos  
// - Substring: 1 ponto
```

---

### 🚫 Problema 3: "Busca de propriedades retorna vazia"

#### Sintomas:
- "Não encontrei propriedades disponíveis"
- Mesmo tendo propriedades cadastradas

#### Diagnóstico:
```bash
# Testar busca diretamente
GET /api/debug/functions-test

# Verificar logs:
🔍 [SEARCH-xxxxx] Iniciando busca de propriedades: {location: "florianópolis"}
📊 [SEARCH-xxxxx] Total de propriedades encontradas: 0
```

#### Possíveis Causas e Soluções:

**A) Problemas com o tenantId**
```typescript
// Verificar se está usando o tenant correto
console.log('TenantId usado:', tenantId);
console.log('TenantId esperado:', process.env.TENANT_ID);
```

**B) Propriedades com status incorreto**
```typescript
// Propriedades devem ter:
{
  status: 'active', // ou 'available' ou undefined
  tenantId: 'seu_tenant_id'
}
```

**C) Problema na busca por localização**
```typescript
// Verificar se a propriedade tem campos de localização:
{
  location: "Florianópolis",      // ou
  city: "Florianópolis",          // ou  
  address: { city: "Florianópolis" }
}
```

---

### 🚫 Problema 4: "Contexto se perde entre mensagens"

#### Sintomas:
- Usuário diz "Florianópolis" e depois "para 2 pessoas"
- Agente pergunta a cidade novamente

#### Diagnóstico:
```bash
# Verificar se singleton está funcionando
POST /api/debug/agent-test (duas vezes seguidas)

# Logs devem mostrar:
♻️ Reutilizando instância existente do Professional Agent
📊 Contexto atual: {clientData: {city: "florianópolis"}}
```

#### Soluções:

**A) Verificar singleton**
```typescript
// Verificar se está usando getInstance()
const agent = ProfessionalAgent.getInstance(); // ✅ Correto
const agent = new ProfessionalAgent();         // ❌ Errado
```

**B) Verificar se contexto está sendo salvo**
```typescript
// Logs devem mostrar:
🆕 Criando novo contexto para: 5511999999999
📊 Contexto atual: {intent: "search_properties", clientData: {...}}
```

---

### 🚫 Problema 5: "Cache não está funcionando"

#### Sintomas:
- Todas as respostas mostram `fromCache: false`
- Saudações gastam tokens

#### Diagnóstico:
```bash
GET /api/debug/functions-test

# Deve mostrar no resultado:
cache_system: {
  first_call: { fromCache: false, tokensUsed: 0 },
  second_call: { fromCache: true, tokensUsed: 0 }
}
```

#### Soluções:

**A) Verificar se cache está habilitado**
```typescript
// Para handleGreeting deve retornar 0 tokens sempre
if (intent === 'greeting') {
  // Não deve usar OpenAI
  return { tokensUsed: 0, fromCache: false }
}
```

**B) Verificar chaves do cache**
```typescript
// Cache é baseado em intent + dados relevantes
// Mesma intenção + mesmo contexto = cache hit
```

---

## 📊 Métricas e Monitoramento

### Status do Sistema

```bash
# Verificar métricas do agente
GET /api/debug/agent-test

# Resposta deve incluir:
{
  "agent_stats": {
    "activeConversations": 5,
    "cacheStats": {
      "size": 45,
      "hitRate": 0.73
    }
  }
}
```

### Benchmarks Esperados

| Métrica | Valor Esperado | Valor Problemático |
|---------|----------------|-------------------|
| Tempo de resposta | < 500ms | > 2000ms |
| Taxa de cache | > 60% | < 30% |
| Tokens por greeting | 0 | > 0 |
| Tokens por search | 25-35 | > 100 |

---

## 🔧 Ferramentas de Debug

### 1. Debug Endpoints

```bash
# Configuração do webhook
GET /api/debug/webhook-test

# Teste do agente
POST /api/debug/agent-test
{
  "message": "sua mensagem",
  "phone": "5511999999999"
}

# Teste das funções
GET /api/debug/functions-test

# Simular webhook
POST /api/debug/webhook-test
{
  "from": "5511999999999",
  "message": "sua mensagem"
}
```

### 2. Dashboard Debug

Acesse `/dashboard/debug` para interface visual:

- Teste interativo do agente
- Verificação de configurações
- Resultados formatados
- Histórico de testes

### 3. Logs Estruturados

Procure por estes padrões nos logs:

```bash
# Webhook
📨 [WEBHOOK-xxxxx] Nova mensagem recebida
✅ [WEBHOOK-xxxxx] Resposta enviada com sucesso

# Intenção
🎯 [INTENT] Detectando intenção para: "sua mensagem"
✅ [INTENT] Detectado: search_properties (score: 3)

# Busca
🔍 [SEARCH-xxxxx] Iniciando busca de propriedades
✅ [SEARCH-xxxxx] Busca finalizada. Retornando 3 propriedades

# Agente
🤖 [Agent] Contexto para 5511999999999: {...}
```

---

## 🆘 Troubleshooting Avançado

### Problema: Performance Lenta

```bash
# Verificar tempo de resposta
# Logs devem mostrar:
📊 [WEBHOOK-xxxxx] Processamento concluído: {totalTime: "340ms"}

# Se > 2000ms, verificar:
# 1. Conexão Firebase
# 2. Tamanho da base de propriedades  
# 3. Complexidade dos filtros de busca
```

### Problema: Erros Intermitentes

```bash
# Verificar rate limiting
# Logs mostrarão:
🚫 [WEBHOOK-xxxxx] Rate limit excedido

# Verificar erros do Firebase
❌ [SEARCH-xxxxx] Erro na busca de propriedades: PERMISSION_DENIED
```

### Problema: Memória Alta

```bash
# Verificar contextos ativos
GET /api/debug/agent-test

# Se activeConversations > 1000:
# 1. Implementar limpeza automática
# 2. Verificar vazamentos de memória
# 3. Reiniciar aplicação
```

---

## 📞 Quando Pedir Ajuda

Se após seguir este guia o problema persistir:

1. **Colete informações**:
   - Logs específicos do erro
   - Resultado dos endpoints de debug
   - Mensagem exata que falhou

2. **Reproduza o problema**:
   - Use `/dashboard/debug` para testar
   - Anote exatamente os passos que levam ao erro

3. **Documente**:
   - Screenshots dos logs
   - Configuração do ambiente
   - Versão do sistema

---

## 🔄 Manutenção Preventiva

### Limpeza Regular

```bash
# 1. Limpar cache quando necessário
DELETE /api/agent/clear-context
{
  "clientPhone": "numero_especifico"
}

# 2. Monitorar métricas
GET /api/debug/functions-test (semanalmente)

# 3. Verificar logs
grep -i "error\|fail" logs/app.log
```

### Atualizações

```bash
# 1. Backup do banco antes de atualizações
# 2. Testar em ambiente de desenvolvimento
# 3. Verificar compatibilidade com WhatsApp API
```

---

**✅ Lembre-se**: A maioria dos problemas pode ser identificada rapidamente usando o dashboard de debug em `/dashboard/debug`!