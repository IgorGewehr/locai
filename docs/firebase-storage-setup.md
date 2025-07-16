# Configuração do Firebase Storage

## Problema: Upload travado em 0%

Se o upload de imagens/vídeos está travando em 0%, isso geralmente indica um problema de permissões ou CORS no Firebase Storage.

## Solução

### 1. Verificar Regras de Segurança do Storage

Acesse o Firebase Console → Storage → Rules e configure as regras:

```javascript
// Regras para desenvolvimento (TEMPORÁRIO - NÃO USE EM PRODUÇÃO)
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

Para produção, use regras mais seguras:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Permitir leitura pública de imagens
    match /properties/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
        && request.resource.size < 100 * 1024 * 1024 // 100MB max
        && request.resource.contentType.matches('(image|video)/.*');
    }
  }
}
```

### 2. Configurar CORS

Crie um arquivo `cors.json`:

```json
[
  {
    "origin": ["http://localhost:3000", "http://localhost:3001", "https://seu-dominio.com"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "maxAgeSeconds": 3600,
    "responseHeader": [
      "Content-Type",
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Headers",
      "Access-Control-Allow-Methods",
      "X-Requested-With",
      "X-Firebase-Storage-Version"
    ]
  }
]
```

Aplique a configuração CORS:

```bash
# Instalar gsutil se ainda não tiver
pip install gsutil

# Configurar CORS
gsutil cors set cors.json gs://seu-bucket-id.appspot.com
```

### 3. Verificar Configurações do Projeto

1. **Verifique o arquivo `.env`**:
```env
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
```

2. **Verifique se o bucket está correto no Firebase Console**

3. **Verifique se a autenticação está funcionando**:
   - O usuário precisa estar autenticado para fazer upload
   - Verifique se `auth.currentUser` não é null

### 4. Debug do Upload

O código já foi atualizado com logs de debug. Ao tentar fazer upload:

1. Abra o Console do navegador (F12)
2. Tente fazer upload de uma imagem
3. Procure por mensagens como:
   - "📎 Starting upload for..."
   - "📈 Upload progress for..."
   - "❌ Upload error for..."

### 5. Erros Comuns e Soluções

**Erro: "storage/unauthorized"**
- Solução: Atualize as regras de segurança (veja item 1)

**Erro: "storage/unauthenticated"**
- Solução: Certifique-se de que o usuário está logado

**Erro: "CORS error"**
- Solução: Configure CORS (veja item 2)

**Erro: "storage/retry-limit-exceeded"**
- Solução: Verifique conexão de internet e tente novamente

### 6. Teste Rápido

Para testar se o Storage está funcionando, execute no console do navegador:

```javascript
// Teste de conexão com Storage
import { storage } from '@/lib/firebase/config';
import { ref, uploadString } from 'firebase/storage';

const testRef = ref(storage, 'test/test.txt');
uploadString(testRef, 'Hello World').then(() => {
  console.log('✅ Storage está funcionando!');
}).catch((error) => {
  console.error('❌ Erro no Storage:', error);
});
```

## Checklist de Verificação

- [ ] Firebase Storage está ativado no console
- [ ] Regras de segurança permitem upload
- [ ] CORS está configurado corretamente
- [ ] Variáveis de ambiente estão corretas
- [ ] Usuário está autenticado
- [ ] Console do navegador mostra logs de debug

## Suporte

Se o problema persistir após seguir estes passos:
1. Verifique os logs do navegador
2. Verifique o Firebase Console → Storage → Usage
3. Teste com uma imagem pequena (< 1MB)
4. Verifique se há quota disponível no Firebase