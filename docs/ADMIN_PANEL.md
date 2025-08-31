# Painel Administrativo LocAI

## 🔒 Visão Geral

O painel administrativo é uma interface ultra-secreta para admins do sistema gerenciarem tickets e usuários de todos os tenants. Acesso disponível apenas para usuários com `idog: true`.

## 🚪 Acesso

**URL Secreta:** `/dashboard/lkjhg`

### Requisitos de Acesso
1. **Autenticação:** Usuário deve estar logado
2. **Autorização:** Campo `idog: true` no documento do usuário
3. **Rate Limiting:** Máximo 30 acessos por minuto por admin
4. **Logs de Segurança:** Todos os acessos são logados

## 🛡️ Camadas de Segurança

### 1. Middleware de Rota
```typescript
// middleware.ts
if (pathname.startsWith('/dashboard/lkjhg')) {
  return await adminAuthMiddleware(request);
}
```

### 2. Verificação de Usuário
- Validação de token de autenticação
- Verificação do campo `idog: true` no Firestore
- Rate limiting por usuário admin
- Log de todas as tentativas de acesso

### 3. API Protection
```typescript
// Todas as APIs /api/admin/* são protegidas
const { isAdmin } = await verifyAdminAccess(request);
if (!isAdmin) return 403;
```

### 4. Headers de Segurança
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

## 📊 Funcionalidades

### 1. Gerenciamento de Tickets
- **Visualização Global:** Todos os tickets de todos os tenants
- **Filtros:** Status, busca por usuário/tenant
- **Resposta Direta:** Admins podem responder tickets
- **Mudança de Status:** Aberto → Em Progresso → Resolvido → Fechado
- **Chat em Tempo Real:** Interface de chat para cada ticket

### 2. Gerenciamento de Usuários
- **Visão Geral:** Todos os usuários de todos os tenants
- **Métricas:** Número de propriedades, data de criação, último login
- **Filtros:** Por tenant, status, plano
- **Informações:** Email, nome, plano atual, status

### 3. Estatísticas do Sistema
- **Por Tenant:**
  - Número de usuários
  - Número de propriedades  
  - Total de tickets
  - Tickets ativos
- **Global:**
  - Total de tenants
  - Usuários totais
  - Revenue agregada

## 🗂️ Estrutura de Arquivos

```
app/dashboard/lkjhg/
├── page.tsx          # Interface principal do admin
├── layout.tsx        # Layout específico com segurança

app/api/admin/
├── verify/route.ts           # Verificação de acesso admin
├── tickets/route.ts          # Lista todos os tickets
├── tickets/[id]/reply/route.ts      # Responder ticket
├── tickets/[id]/status/route.ts     # Alterar status
├── users/route.ts            # Lista todos os usuários
└── stats/route.ts            # Estatísticas do sistema

lib/middleware/
└── admin-auth.ts     # Middleware de autenticação admin

lib/config/
└── logging-config.ts # Configuração de logs otimizada
```

## 🔧 Como Habilitar Admin

Para tornar um usuário admin:

```javascript
// Via Firebase Console ou script
await updateDoc(doc(db, 'users', userId), {
  idog: true
});
```

## 📝 Logs de Segurança

Todos os eventos são logados:

```javascript
// Tentativas de acesso
logger.warn('🚫 [Admin Auth] Acesso negado', {
  component: 'Security',
  uid: userId,
  ip: clientIP
});

// Acessos bem-sucedidos  
logger.info('✅ [Admin Auth] Acesso admin autorizado', {
  component: 'Security',
  uid: userId,
  email: userEmail
});
```

## 🧪 Testes de Segurança

Execute os testes de segurança:

```bash
node lib/scripts/test-admin-security.js
```

Testa:
- Acesso não autenticado (deve redirecionar)
- Rate limiting (deve bloquear após limite)
- Headers de segurança (devem estar presentes)
- Proteção da API (deve retornar 403)

## 🚨 Monitoramento

### Alertas de Segurança
1. **Tentativas não autorizadas** são logadas como WARNING
2. **Rate limiting** ativa é logada como ERROR
3. **Acessos bem-sucedidos** são logadas como INFO

### Métricas Importantes
- Número de tentativas de acesso negadas por dia
- Rate limiting ativado por usuário
- Tempo de resposta das APIs admin

## 🔄 Sistema de Tickets

### Fluxo de Resposta Admin
1. Admin acessa `/dashboard/lkjhg`
2. Vê todos os tickets ordenados por prioridade
3. Clica em ticket → Abre chat interface
4. Admin responde → Resposta salva com `authorRole: 'admin'`
5. Status atualizado automaticamente para 'in_progress'
6. Usuário vê resposta em `/dashboard/help`

### Estados do Ticket
- **open:** Novo ticket criado
- **in_progress:** Admin respondeu ou está trabalhando
- **resolved:** Problema resolvido
- **closed:** Ticket fechado definitivamente

## 💡 Boas Práticas

1. **Nunca compartilhe a URL secreta** `/dashboard/lkjhg`
2. **Use IPs confiáveis** quando possível
3. **Monitore logs regularmente** para atividade suspeita
4. **Rotacione tokens** periodicamente
5. **Mantenha lista de admins atualizada**

## 🔧 Configurações de Produção

```env
# Habilitar logs no Firebase (opcional)
ENABLE_FIREBASE_LOGS=true

# Salt para hash de senhas admin
ADMIN_SALT=sua-chave-secreta-aqui
```

## 🎯 Experiência do Usuário

### Interface do Admin
- **Clean & Modern:** Interface Material-UI
- **Responsiva:** Funciona em desktop e mobile
- **Real-time:** Atualização automática de dados
- **Filtros:** Busca e filtros avançados

### Interface do Cliente (Help Page)
- **Chat Nativo:** Conversa fluida com admin
- **Notificações:** Badge para respostas não lidas
- **Status Visual:** Chips coloridos para status
- **Histórico:** Todas as conversas organizadas

## 🚀 Deploy e Manutenção

### Checklist de Deploy
- [ ] Verificar se middleware está ativo
- [ ] Confirmar rate limiting configurado
- [ ] Testar headers de segurança
- [ ] Validar logs de acesso
- [ ] Executar testes de segurança

### Monitoramento Contínuo
- Monitor tentativas de acesso não autorizado
- Alertas para rate limiting excessivo
- Performance das queries de admin
- Crescimento do volume de tickets

---

**⚠️ IMPORTANTE:** Este painel tem acesso a dados sensíveis de todos os tenants. Use com extrema responsabilidade e mantenha a URL secreta.