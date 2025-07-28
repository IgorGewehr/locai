# 🧪 Guia do Teste do Agente IA Sofia

## 📍 Como Acessar

A funcionalidade de teste está disponível na barra de navegação do dashboard:

1. **Durante desenvolvimento**: Aparece automaticamente como "Teste IA 🧪"
2. **Acesso direto**: `/dashboard/teste`

## 🎯 Como Usar

1. **Clique em "Iniciar Conversa"** para começar uma nova sessão
2. **Digite mensagens** como se fosse um cliente no WhatsApp
3. **Observe as estatísticas** em tempo real (tokens, funções, tempo de resposta)
4. **Use "Refresh"** para limpar o contexto e começar nova conversa

## 🧠 Fluxo de Teste Recomendado

### Teste Básico
```
1. "ola"
2. "quero um apartamento"
3. "florianopolis"
4. "2 pessoas"
5. "1 a 10 de janeiro"
6. "quanto fica a primeira opção?"
7. "quero reservar"
8. "João Silva, CPF 123.456.789-00, WhatsApp 11999999999"
```

### Teste de Funções
```
1. "buscar apartamentos em são paulo para 4 pessoas"
2. "mostrar fotos da segunda opção"
3. "calcular preço para 15 a 20 dezembro"
4. "confirmar reserva"
```

## 📊 Monitoramento

A interface mostra em tempo real:
- **Duração da sessão**
- **Número de mensagens**
- **Tempo médio de resposta**
- **Funções executadas**
- **Tokens usados**
- **Taxa de cache**

## 🔧 Scripts de Teste

```bash
# Teste básico do Sofia Agent
npm run test-sofia

# Teste do WhatsApp QR Code
npm run test-whatsapp-qr
```

## 🚀 PRODUÇÃO: Como Remover

### Método 1: Via Variável de Ambiente
```typescript
// Em TopAppBar.tsx, linha 51
const SHOW_TEST_ROUTE = false; // Alterar para false
```

### Método 2: Configuração Automática
O teste só aparece quando `NODE_ENV === 'development'`

### Método 3: Remoção Completa
1. **Remover do menu**: Deletar linhas 77-83 em `TopAppBar.tsx`
2. **Remover página**: Deletar `app/dashboard/teste/page.tsx`
3. **Remover API**: Deletar `app/api/agent/clear-context/route.ts`
4. **Remover scripts**: Deletar `scripts/test-*.js`

## ⚠️ Configurações de Segurança

### Rate Limiting
- **Desabilitado** durante testes (`isTest: true`)
- **Ativo** em produção (20 msgs/min por telefone)

### Autenticação
- **Opcional** para testes
- **Obrigatória** em produção

### Logs
- **Detalhados** em desenvolvimento
- **Estruturados** em produção

## 🐛 Debugging

### Console do Navegador
```javascript
// Mensagens de debug aparecem como:
🚀 Enviando mensagem para Sofia V3: [mensagem] 
📥 Resposta da API: [dados completos]
📊 Status: [código HTTP]
```

### Logs do Servidor
```bash
# No terminal do Next.js
💬 [Sofia V3] Processando mensagem de [telefone]: "[mensagem]"
🔧 [Sofia V3] Executando função: [nome] [parâmetros]
✅ [Sofia V3] Resposta gerada ([tokens] tokens): "[resposta]..."
```

## 📝 Funcionalidades Disponíveis

### Sofia Agent V3
- ✅ **5 Funções corrigidas**
- ✅ **IDs reais** do Firebase
- ✅ **Fluxo cliente→reserva**
- ✅ **Validação completa**
- ✅ **Contexto inteligente**

### Interface de Teste
- ✅ **Chat em tempo real**
- ✅ **Estatísticas detalhadas**
- ✅ **Histórico de mensagens**
- ✅ **Limpeza de contexto**
- ✅ **Simulação WhatsApp**

## 🎪 Status do Sistema

**Sofia Agent V3**: ✅ 100% Funcional
- `search_properties` - Busca de propriedades
- `send_property_media` - Envio de fotos/vídeos  
- `get_property_details` - Detalhes da propriedade
- `calculate_price` - Cálculo de preços
- `register_client` - Cadastro de cliente
- `create_reservation` - Criação de reserva

**Todos os IDs são reais** do Firebase, não simulados!