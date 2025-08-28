# 📊 Monitoramento das APIs CRUD

## 🎯 Logs Aprimorados Implementados

As seguintes funções agora têm logs detalhados:

### ✅ **Funções com logs avançados:**
- `search-properties` - Busca de propriedades
- `create-reservation` - Criação de reservas  
- `calculate-price` - Cálculo de preços

### 📝 **Informações logadas:**

```javascript
// Início da execução
🔍 [SEARCH-PROPERTIES] Iniciando busca
- requestId: Identificador único da requisição
- tenantId: Tenant mascarado (primeiros 8 chars + ***)
- params: Parâmetros detalhados da busca
- source: Origem da requisição (N8N, web, etc.)
- userAgent: User agent da requisição

// Fim da execução
✅ [SEARCH-PROPERTIES] Busca concluída  
- results: Informações dos resultados encontrados
- performance: Tempo de processamento
- metadata: Timestamp e requestId
```

## 🧪 Como Testar

### 1. **Teste Individual**
```bash
# Testar busca de propriedades
curl -X POST http://localhost:3000/api/ai/functions/search-properties \
  -H "Content-Type: application/json" \
  -H "x-source: manual-test" \
  -d '{
    "tenantId": "test-tenant",
    "location": "Praia Grande",
    "bedrooms": 2,
    "maxPrice": 5000
  }'
```

### 2. **Teste Automatizado**
```bash
# Ver funções disponíveis
curl http://localhost:3000/api/test/functions

# Testar uma função específica
curl -X POST http://localhost:3000/api/test/functions \
  -H "Content-Type: application/json" \
  -d '{
    "function": "search-properties",
    "tenantId": "test-tenant",
    "params": {"location": "São Paulo"}
  }'

# Testar múltiplas funções
curl -X POST http://localhost:3000/api/test/functions \
  -H "Content-Type: application/json" \
  -d '{"testAll": true, "tenantId": "test-tenant"}'
```

## 📈 Monitoramento em Tempo Real

### 1. **Logs por Função**
```bash
# Ver logs de uma função específica
grep "SEARCH-PROPERTIES" logs/app.log | tail -20

# Ver logs de reservas
grep "CREATE-RESERVATION" logs/app.log | tail -20

# Ver logs de preços
grep "CALCULATE-PRICE" logs/app.log | tail -20
```

### 2. **Logs por Status**
```bash
# Ver todas as execuções iniciadas
grep "🔍\|📅\|💰" logs/app.log | tail -20

# Ver todas as execuções concluídas
grep "✅" logs/app.log | tail -20

# Ver todos os erros
grep "❌" logs/app.log | tail -20
```

### 3. **Logs por RequestId**
```bash
# Rastrear uma requisição específica
grep "search_1703123456_abc123" logs/app.log

# Encontrar todas as requisições de um tenant
grep "tenant123***" logs/app.log
```

### 4. **Métricas de Performance**
```bash
# Ver tempos de processamento
grep "processingTime" logs/app.log | tail -20

# Ver requisições mais lentas (acima de 1s)
grep "processingTime.*[0-9][0-9][0-9][0-9]ms" logs/app.log
```

## 🔍 Debug Específico do N8N

### 1. **Requisições vindas do N8N**
```bash
# Ver chamadas do N8N (adicione x-source: n8n no N8N)
grep '"source":"n8n"' logs/app.log

# Ver user-agent do N8N
grep "n8n-webhook" logs/app.log
```

### 2. **Erros de Autenticação**
```bash
# Ver falhas de TenantId
grep "TenantId não fornecido" logs/app.log

# Ver erros de validação
grep "Validation failed" logs/app.log
```

## 📊 Dashboard de Monitoramento

### Endpoint de Métricas
```bash
# Ver status geral das funções
curl http://localhost:3000/api/test/functions
```

### Resposta típica:
```json
{
  "summary": {
    "totalFunctions": 4,
    "successful": 3,
    "failed": 1,
    "totalTime": "1240ms",
    "avgTime": "310ms"
  },
  "results": [
    {
      "function": "search-properties",
      "status": 200,
      "success": true,
      "responseTime": "285ms"
    }
  ]
}
```

## 🚨 Alertas e Monitoramento

### 1. **Detectar Problemas**
```bash
# Funções com muitos erros
grep "❌.*failed" logs/app.log | cut -d' ' -f3 | sort | uniq -c | sort -nr

# Tempos de resposta altos
grep "processingTime.*[0-9]\{4,\}ms" logs/app.log

# Requisições sem TenantId
grep "TenantId não fornecido" logs/app.log | wc -l
```

### 2. **Métricas por Período**
```bash
# Requisições na última hora
grep "$(date -d '1 hour ago' '+%Y-%m-%d %H')" logs/app.log | grep "🔍\|📅\|💰" | wc -l

# Sucessos vs Erros nas últimas 2 horas
echo "Sucessos: $(grep "$(date -d '2 hours ago' '+%Y-%m-%d %H')" logs/app.log | grep "✅" | wc -l)"
echo "Erros: $(grep "$(date -d '2 hours ago' '+%Y-%m-%d %H')" logs/app.log | grep "❌" | wc -l)"
```

## 🔧 Configuração do N8N

### Headers Recomendados
Para facilitar o monitoramento, configure estes headers no N8N:

```javascript
// Em HTTP Request nodes
{
  "headers": {
    "Content-Type": "application/json",
    "x-source": "n8n",
    "User-Agent": "N8N-Workflow/1.0"
  }
}
```

## 📋 Checklist de Monitoramento

### Diário:
- [ ] Verificar erros nas últimas 24h: `grep "❌" logs/app.log | grep "$(date '+%Y-%m-%d')" | wc -l`
- [ ] Ver funções mais usadas: `grep "🔍\|📅\|💰" logs/app.log | grep "$(date '+%Y-%m-%d')" | wc -l`
- [ ] Verificar performance média: `grep "processingTime" logs/app.log | grep "$(date '+%Y-%m-%d')"`

### Semanal:
- [ ] Rodar teste automatizado: `curl -X POST localhost:3000/api/test/functions -d '{"testAll":true}'`
- [ ] Verificar logs de autenticação
- [ ] Analisar padrões de uso por tenant

### Quando Adicionar Nova Função:
- [ ] Aplicar o padrão de logs avançados
- [ ] Incluir no teste automatizado
- [ ] Documentar parâmetros específicos
- [ ] Testar integração com N8N

## 🎯 Próximos Passos

1. **Aplicar logs avançados às demais funções** usando o script criado
2. **Configurar alertas automáticos** para erros frequentes
3. **Criar dashboard visual** para métricas
4. **Implementar rate limiting** se necessário
5. **Adicionar métricas de negócio** (conversões, etc.)