# Solução para o Erro de CORS no Firebase Storage

## Problema
Você está recebendo o erro:
```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/...' from origin 'http://localhost:3000' has been blocked by CORS policy
```

## Causa
O Firebase Storage precisa de configuração CORS para permitir uploads do localhost.

## Soluções (escolha uma):

### Solução 1: Via Firebase Console (MAIS FÁCIL)
1. Acesse o [Firebase Console](https://console.firebase.google.com)
2. Selecione seu projeto `locai-76dcf`
3. No menu lateral, vá para **Storage**
4. Clique na aba **Rules**
5. Temporariamente, para teste, use estas regras:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```
6. Clique em **Publicar**

### Solução 2: Via Google Cloud Console
1. Acesse [Google Cloud Console](https://console.cloud.google.com/storage/browser)
2. Faça login com a mesma conta do Firebase
3. Selecione o projeto `locai-76dcf`
4. Encontre o bucket `locai-76dcf.appspot.com`
5. Clique nos 3 pontos → **Edit bucket permissions**
6. Adicione permissão:
   - Principal: `allUsers`
   - Role: `Storage Object Viewer` (para leitura)
7. Para CORS, clique em **Configuration** → **Edit CORS configuration**
8. Cole o conteúdo do arquivo `cors.json`

### Solução 3: Via gcloud CLI
1. Instale o [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
2. Abra o terminal/PowerShell
3. Execute:
```bash
gcloud auth login
gcloud config set project locai-76dcf
gsutil cors set cors.json gs://locai-76dcf.appspot.com
```

### Solução 4: Deploy para Produção
O CORS geralmente não é problema em produção quando ambos (app e storage) estão no mesmo domínio.
1. Faça deploy do app: `npm run build && npm run deploy`
2. Use a URL de produção em vez de localhost

## Verificação
Após aplicar uma das soluções:
1. Reinicie o servidor: `npm run dev`
2. Limpe o cache do navegador (Ctrl+Shift+Delete)
3. Teste novamente em `/test-storage`

## Configuração CORS Recomendada (cors.json)
```json
[
  {
    "origin": [
      "http://localhost:3000",
      "http://localhost:3001", 
      "https://locai-76dcf.web.app",
      "https://locai-76dcf.firebaseapp.com",
      "https://seu-dominio.com.br"
    ],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["*"]
  }
]
```

## Regras de Segurança para Produção
Depois de testar, use regras mais seguras:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
        && request.resource.size < 10 * 1024 * 1024; // Max 10MB
    }
  }
}
```

## Debug
Se continuar com problemas:
1. Verifique se o Storage está ativado no Firebase Console
2. Confirme que o bucket existe: `locai-76dcf.appspot.com`
3. Verifique se está autenticado antes de fazer upload
4. Olhe o console do navegador (F12) para mais detalhes