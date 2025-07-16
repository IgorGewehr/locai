# Firebase Storage Setup Guide

## 🔥 Problema: Upload de Mídia Travando em 0%

### Possíveis Causas e Soluções

### 1. **Regras de Segurança do Firebase Storage**

Acesse o Console do Firebase → Storage → Rules e verifique se as regras permitem upload:

```javascript
// Regras mais permissivas para teste (NÃO USE EM PRODUÇÃO)
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 2. **Configuração do CORS**

O Firebase Storage pode estar bloqueando requisições do navegador. Configure o CORS:

1. Instale o Google Cloud SDK
2. Crie um arquivo `cors.json`:

```json
[
  {
    "origin": ["http://localhost:3000", "http://localhost:3002", "https://seu-dominio.com"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "maxAgeSeconds": 3600,
    "responseHeader": [
      "Content-Type",
      "x-goog-acl",
      "x-goog-meta-firebaseStorageDownloadTokens",
      "Access-Control-Allow-Origin"
    ]
  }
]
```

3. Execute:
```bash
gsutil cors set cors.json gs://seu-bucket-do-firebase.appspot.com
```

### 3. **Verificar Configuração do Firebase**

Certifique-se de que todas as variáveis estão no `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=sua-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=sua-app-id
```

### 4. **Quota e Limites**

Verifique no Console do Firebase:
- Quota de armazenamento disponível
- Limite de banda
- Número de operações

### 5. **Problemas de Rede**

- Verifique se há proxy ou firewall bloqueando
- Teste com uma conexão diferente
- Use o modo anônimo do navegador

### 6. **Usar a Página de Teste**

Acesse `/dashboard/test-upload` para executar um diagnóstico completo que verifica:
- Configuração do Firebase
- Autenticação
- Todos os métodos de upload
- Erros detalhados

### 7. **Logs de Debug**

Abra o Console do Navegador (F12) e procure por:
- Erros de CORS
- Erros de autenticação
- Timeouts de rede
- Mensagens de erro do Firebase

### 8. **Soluções Implementadas**

O sistema agora tem 3 métodos de upload com fallback automático:

1. **uploadBytesResumable** (principal)
   - Melhor para progresso em tempo real
   - Timeout de 30 segundos

2. **uploadString com Data URL** (fallback)
   - Converte arquivo para base64
   - Mais confiável para arquivos pequenos

3. **Upload via API** (último recurso)
   - Upload server-side
   - Contorna problemas de CORS

### 9. **Testar Manualmente**

Use este código no console do navegador:

```javascript
// Teste básico de upload
async function testUpload() {
  const { storage, auth } = await import('/lib/firebase/config');
  
  console.log('Auth:', auth.currentUser?.email);
  console.log('Storage:', storage.app.options.storageBucket);
  
  const blob = new Blob(['test'], { type: 'text/plain' });
  const file = new File([blob], 'test.txt');
  
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const storageRef = ref(storage, 'test/manual-test.txt');
  
  try {
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    console.log('Success! URL:', url);
  } catch (error) {
    console.error('Error:', error);
  }
}

testUpload();
```

### 10. **Contato com Suporte**

Se nenhuma solução funcionar:
1. Verifique o status do Firebase: https://status.firebase.google.com/
2. Abra um ticket no suporte do Firebase
3. Forneça os logs de erro e o resultado da página de teste