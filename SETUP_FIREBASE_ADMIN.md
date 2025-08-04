# Como obter a chave do Firebase Admin

## 🔑 Passo a passo para gerar a Service Account Key

### 1. Acesse o Console do Firebase
- Vá para: https://console.firebase.google.com
- Selecione seu projeto: **locai-c5e8a**

### 2. Navegue para Configurações do Projeto
- Clique no ícone da engrenagem (⚙️) no menu lateral
- Selecione "Configurações do projeto"

### 3. Vá para a aba "Contas de serviço"
- Clique na aba "Service accounts" (Contas de serviço)
- Você verá uma seção "Firebase Admin SDK"

### 4. Gere uma nova chave privada
- Clique no botão "Gerar nova chave privada"
- **IMPORTANTE**: Isso baixará um arquivo JSON com as credenciais

### 5. Extrair dados do arquivo JSON
O arquivo baixado terá este formato:
```json
{
  "type": "service_account",
  "project_id": "locai-c5e8a",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...REAL_KEY_HERE...=\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@locai-c5e8a.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

### 6. Atualizar variáveis de ambiente
Copie os seguintes valores do JSON para seu arquivo `.env` e `.env.development`:

```bash
FIREBASE_PROJECT_ID=locai-c5e8a
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@locai-c5e8a.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...CHAVE_COMPLETA_AQUI...=\n-----END PRIVATE KEY-----\n"
```

### ⚠️ IMPORTANTE - Segurança
- **NUNCA** compartilhe essas credenciais
- **NUNCA** faça commit dessas credenciais no Git
- O arquivo JSON baixado deve ser mantido seguro
- Adicione `*.json` ao seu `.gitignore` se não estiver lá

### 7. Teste a configuração
Após atualizar as variáveis, execute:
```bash
node test-admin.mjs
```

## 🆘 Se você não tem acesso ao Console do Firebase
- Peça para o administrador do projeto gerar as credenciais
- Ou me forneça acesso temporário para configurar

## 📁 Localização dos arquivos para atualizar
- `/mnt/c/Users/Administrador/WebstormProjects/locai/.env`
- `/mnt/c/Users/Administrador/WebstormProjects/locai/.env.development`