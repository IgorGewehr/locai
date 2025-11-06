# 🔧 TROUBLESHOOTING - Dados não aparecem no Admin

## 🚀 SOLUÇÃO RÁPIDA

### 1. Acesse a Página de Diagnóstico
```
http://localhost:8080/dashboard/lkjhg/diagnostico
```

1. Clique em "Executar Diagnóstico"
2. Veja os resultados detalhados
3. Siga as recomendações

---

## 🔍 PROBLEMAS COMUNS E SOLUÇÕES

### ❌ Problema 1: "Nenhum dado aparece nas tabelas"

**Causa:** Pode ser falta de índices no Firebase

**Solução:**
1. Abra o console do navegador (F12)
2. Vá para a aba **Console**
3. Procure por erros tipo:
   ```
   FirebaseError: The query requires an index
   ```
4. Se aparecer um **link** no erro, clique nele
5. O Firebase vai abrir a página para criar o índice automaticamente
6. Clique em **"Create Index"**
7. Aguarde 2-5 minutos até o índice ser criado
8. Recarregue a página

---

### ❌ Problema 2: "Forbidden" ou "Permission Denied"

**Causa:** Firestore Rules bloqueando acesso

**Solução:**
1. Vá para Firebase Console
2. Firestore Database → Rules
3. Verifique se suas rules permitem leitura para admins:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users collection - leitura para autenticados
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // Tenants - acesso baseado em tenantId
    match /tenants/{tenantId}/{document=**} {
      allow read, write: if request.auth != null &&
        (request.auth.uid == tenantId ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.idog == true);
    }
  }
}
```

4. Clique em **"Publish"**

---

### ❌ Problema 3: "Usuário não é admin"

**Causa:** Flag `idog` não está configurada

**Solução:**
1. Vá para Firebase Console
2. Firestore Database
3. Collection `users`
4. Encontre seu documento de usuário
5. Adicione o campo:
   - **Field:** `idog`
   - **Type:** `boolean`
   - **Value:** `true`
6. Salve
7. Faça logout e login novamente

---

### ❌ Problema 4: "Não consigo logar no admin"

**Causa:** Caminho `/dashboard/lkjhg` está protegido

**Verificação:**
```typescript
// O middleware de auth deve permitir acesso
// Verifique se você tem o flag idog: true
```

**Solução:**
1. Acesse `/api/admin/verify` para testar:
   ```bash
   curl http://localhost:8080/api/admin/verify \
     -H "Authorization: Bearer SEU_TOKEN_FIREBASE"
   ```

2. Se retornar `isAdmin: false`, adicione `idog: true` no Firestore

---

### ❌ Problema 5: "Collection 'tenants' vazia"

**Causa:** Estrutura multi-tenant não inicializada

**Solução:**

#### Opção A: Criar tenant manualmente
1. Firebase Console → Firestore
2. Crie collection `tenants`
3. Adicione documento com ID do seu usuário
4. Dentro dele, crie sub-collections:
   - `properties`
   - `reservations`
   - `clients`
   - `tickets`
   - `conversations`

#### Opção B: Script de inicialização
```typescript
// scripts/init-tenant.js
const admin = require('firebase-admin');

async function initTenant(userId) {
  const db = admin.firestore();

  // Criar documento tenant
  await db.collection('tenants').doc(userId).set({
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    name: 'Minha Empresa',
    active: true
  });

  console.log('✅ Tenant criado:', userId);
}
```

---

### ❌ Problema 6: "Tickets não aparecem"

**Possíveis causas:**
1. Estrutura de dados antiga (tickets em local diferente)
2. Nenhum ticket criado ainda
3. Índice faltando

**Diagnóstico:**
```typescript
// Verifique no console do navegador:
1. Abra Network tab (F12)
2. Recarregue a página
3. Procure request para /api/admin/all-tickets
4. Veja a resposta:
   - Se status 200: tickets estão sendo retornados?
   - Se status 500: veja o erro
   - Se status 403: problema de permissão
```

**Solução:**
1. Se `tickets: []` na resposta → Nenhum ticket existe, crie alguns
2. Se erro de índice → Siga os passos do Problema 1
3. Se erro 403 → Siga os passos do Problema 2

---

## 🔎 ÍNDICES NECESSÁRIOS NO FIREBASE

Se você ver erros sobre "query requires an index", crie estes índices:

### Índice 1: Users por idog
```
Collection: users
Fields:
  - idog (Ascending)
  - __name__ (Ascending)
```

### Índice 2: Tickets por status
```
Collection: tenants/{tenantId}/tickets
Fields:
  - status (Ascending)
  - createdAt (Descending)
```

### Índice 3: Tickets por tenant + status
```
Collection: tenants/{tenantId}/tickets
Fields:
  - tenantId (Ascending)
  - status (Ascending)
  - createdAt (Descending)
```

**Como criar:**
1. Método automático: Clique no link do erro
2. Método manual:
   - Firebase Console → Firestore
   - Aba "Indexes"
   - "Create Index"
   - Preencha os campos acima
   - Aguarde criação (2-5 min)

---

## 📊 VERIFICAÇÃO MANUAL NO FIREBASE CONSOLE

### Checklist:
- [ ] Collection `users` existe e tem documentos
- [ ] Seu usuário tem `idog: true`
- [ ] Collection `tenants` existe
- [ ] Dentro de tenants, há sub-collections (tickets, properties, etc)
- [ ] Firestore Rules permitem leitura
- [ ] Todos os índices necessários foram criados

---

## 🐛 DEBUG AVANÇADO

### 1. Logs do Servidor
```bash
# Terminal onde npm run dev está rodando
# Procure por:
[Admin API] logs
❌ erros
⚠️ warnings
```

### 2. Console do Browser
```javascript
// Cole no console do navegador:
console.log('Auth user:', firebase.auth().currentUser);
console.log('User token:', await firebase.auth().currentUser.getIdToken());
```

### 3. Network Tab
1. Abra F12 → Network
2. Filtre por "admin"
3. Recarregue a página
4. Veja todas as requests para `/api/admin/*`
5. Clique em cada uma e veja:
   - Request headers (tem Authorization?)
   - Response (que dados voltaram?)
   - Status code (200, 403, 500?)

### 4. Test Manual das APIs
```bash
# 1. Pegar token
# No console do browser:
await firebase.auth().currentUser.getIdToken()

# 2. Testar API (substitua TOKEN)
curl http://localhost:8080/api/admin/verify \
  -H "Authorization: Bearer TOKEN"

curl http://localhost:8080/api/admin/users-enhanced \
  -H "Authorization: Bearer TOKEN"

curl http://localhost:8080/api/admin/all-tickets \
  -H "Authorization: Bearer TOKEN"
```

---

## 🎯 SOLUÇÃO DEFINITIVA: Página de Diagnóstico

**URL:** `http://localhost:8080/dashboard/lkjhg/diagnostico`

Esta página vai:
- ✅ Testar conexão com Firebase
- ✅ Contar usuários, tenants, tickets
- ✅ Verificar se índices existem
- ✅ Validar permissões
- ✅ Mostrar recomendações específicas
- ✅ Fornecer links diretos para criar índices

**Use esta página PRIMEIRO antes de debugar manualmente!**

---

## 📞 AINDA COM PROBLEMAS?

Se nenhuma solução acima funcionou:

1. **Exporte os logs de diagnóstico:**
   - Acesse `/dashboard/lkjhg/diagnostico`
   - Execute o diagnóstico
   - Copie o JSON dos resultados

2. **Capture erros do console:**
   - F12 → Console tab
   - Copie todos os erros vermelhos

3. **Capture Network requests:**
   - F12 → Network tab
   - Filtre por "admin"
   - Screenshot das requests falhando

4. **Compartilhe:**
   - Logs de diagnóstico
   - Erros do console
   - Network requests
   - Estrutura do Firestore (screenshot)

---

## ✅ CHECKLIST COMPLETO

Antes de perguntar "por que não aparece dados", verifique:

- [ ] Executou diagnóstico em `/dashboard/lkjhg/diagnostico`
- [ ] Seu usuário tem `idog: true` no Firestore
- [ ] Collection `users` tem dados
- [ ] Collection `tenants` tem dados
- [ ] Dentro de tenants, há tickets/properties/etc
- [ ] Firestore Rules permitem leitura
- [ ] Todos os índices necessários foram criados
- [ ] Sem erros no console do navegador
- [ ] Sem erros no Network tab
- [ ] APIs retornam 200 (não 403 ou 500)
- [ ] Token Firebase está válido

Se todos marcados e ainda não funciona, algo mais complexo está acontecendo.

---

**Última atualização:** 06/11/2025
**Versão:** 1.0
