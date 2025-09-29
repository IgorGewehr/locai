# 🔍 Diagnóstico: Assinatura Kirvano Não Registrada

## Problema
Assinatura feita com email `jhinpepeye@gmail.com` na Kirvano não foi registrada no sistema.

## Onde Deveria Estar Armazenado

### 1. Coleção `users`
```
Firestore Database > users > {randomUserId} > {
  email: "jhinpepeye@gmail.com",
  name: "jhinpepeye",
  createdViaWebhook: true,
  passwordSet: false,
  webhookData: {
    saleId: "sale_xxx",
    source: "kirvano",
    createdAt: "2025-XX-XX"
  }
}
```

### 2. Coleção `subscriptions`
```
Firestore Database > subscriptions > {sameUserId} > {
  subscriptionActive: true,
  subscriptionStatus: "active",
  kirvanoSaleId: "sale_xxx",
  subscriptionPlan: "Plano Básico",
  lastPaymentAmount: 97.00
}
```

## Passos de Diagnóstico

### 1. Verificar se o Servidor Estava Rodando
```bash
# Verificar se o servidor estava ativo no momento da compra
npm run dev
# ou
npm start
```

### 2. Testar Webhook Manualmente
```bash
# Com servidor rodando, testar:
curl -X GET http://localhost:3000/api/test/webhook-kirvano?email=jhinpepeye@gmail.com
```

### 3. Simular Webhook da Kirvano
```bash
curl -X POST http://localhost:3000/api/test/webhook-kirvano \
  -H "Content-Type: application/json" \
  -d '{"email": "jhinpepeye@gmail.com"}'
```

### 4. Verificar Configuração da Kirvano
- URL do webhook deve ser: `https://seudominio.com/api/webhooks/kirvano`
- Ou URL curta: `https://seudominio.com/api/webhooks/ki`
- Eventos configurados: `SALE_APPROVED`, `SUBSCRIPTION_RENEWED`

### 5. Verificar Logs do Sistema
```bash
# Verificar logs da aplicação
tail -f logs/application.log

# Ou verificar console do servidor
# Buscar por: "[Kirvano Webhook]"
```

## Soluções Possíveis

### Solução 1: Reprocessar Webhook Manualmente
1. Acessar: `/api/test/webhook-kirvano`
2. Simular webhook com email `jhinpepeye@gmail.com`
3. Verificar se usuário foi criado

### Solução 2: Criar Usuário Manualmente
1. Ir para Firestore Console
2. Criar documento em `users` com dados da compra
3. Usuário poderá definir senha em `/set-password?email=jhinpepeye@gmail.com`

### Solução 3: Verificar URL do Webhook na Kirvano
1. Acessar painel da Kirvano
2. Verificar se URL está correta
3. Testar webhook novamente

## URLs Importantes

- **Webhook Principal:** `/api/webhooks/kirvano`
- **Webhook Curto:** `/api/webhooks/ki`
- **Teste Manual:** `/api/test/webhook-kirvano`
- **Definir Senha:** `/set-password?email=jhinpepeye@gmail.com`

## Próximos Passos

1. ✅ Verificar se usuário existe no banco
2. ✅ Testar webhook manualmente
3. ✅ Simular criação se necessário
4. ✅ Configurar URL correta na Kirvano
5. ✅ Monitorar próximas compras

## Prevenção

- Manter servidor sempre rodando em produção
- Configurar monitoring de webhooks
- Implementar retry automático para webhooks falhados
- Logs detalhados de todas as operações