# 🏠 Agente Imobiliária - Sistema de Gestão com IA

Sistema completo de gestão imobiliária com agente de IA integrado ao WhatsApp, desenvolvido com Next.js 14, Material-UI e Firebase.

## 🚀 Funcionalidades Principais

### 🤖 Agente IA WhatsApp
- Integração completa com WhatsApp Business API
- Processamento de mensagens em tempo real com OpenAI GPT-4
- Busca inteligente de propriedades
- Cálculo automático de preços
- Envio de fotos e vídeos das propriedades
- Criação de reservas via conversa
- Histórico completo de conversas

### 🏡 Gestão de Propriedades
- CRUD completo de propriedades
- Sistema de preços dinâmicos (base, fins de semana, feriados, sazonais)
- Upload e organização de múltiplas mídias
- Gestão de comodidades e amenidades
- Controle de disponibilidade
- Categorização avançada

### 📅 Sistema de Reservas
- Criação automática via agente IA
- Cálculo de preços em tempo real
- Controle de status e pagamentos
- Calendário de disponibilidade
- Confirmações automáticas

### 👥 Gestão de Clientes
- Perfis completos de clientes
- Histórico de reservas
- Preferências personalizadas
- Integração com conversas WhatsApp

### 📊 Dashboard e Analytics
- Métricas em tempo real
- Relatórios de ocupação e receita
- Status das integrações
- Atividades recentes

## 🛠️ Tecnologias Utilizadas

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **UI/UX**: Material-UI (MUI) v5, Emotion, Framer Motion
- **Backend**: Next.js API Routes, Node.js
- **Banco de Dados**: Firebase Firestore
- **Storage**: Firebase Storage
- **Autenticação**: Firebase Auth
- **IA**: OpenAI GPT-4 API
- **WhatsApp**: WhatsApp Business API
- **Pagamentos**: Stripe
- **Validação**: React Hook Form + Yup
- **Estado**: Zustand
- **Datas**: date-fns
- **Notificações**: React Hot Toast

## 🔧 Configuração do Projeto

### 1. Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta Firebase
- Chave OpenAI API
- WhatsApp Business API
- Conta Stripe (opcional)

### 2. Instalação

```bash
# Clone o repositório
git clone <repository-url>
cd agente-imobiliaria

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local
```

### 3. Configuração das Variáveis de Ambiente

Edite o arquivo `.env.local` com suas credenciais:

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin
FIREBASE_PRIVATE_KEY="your_private_key"
FIREBASE_CLIENT_EMAIL=your_service_account@your_project.iam.gserviceaccount.com

# OpenAI
OPENAI_API_KEY=sk-your_openai_api_key

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_VERIFY_TOKEN=your_verify_token

# Stripe (opcional)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Aplicação
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 4. Configuração do Firebase

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com)
2. Ative o Firestore Database
3. Ative o Storage
4. Configure as regras de segurança
5. Crie uma conta de serviço para uso server-side

#### Regras do Firestore (básicas):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

#### Regras do Storage (básicas):
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 5. Configuração do WhatsApp Business API

1. Crie uma conta no [Meta for Developers](https://developers.facebook.com)
2. Configure uma aplicação WhatsApp Business
3. Obtenha o Access Token e Phone Number ID
4. Configure o webhook apontando para: `https://seu-dominio.com/api/webhook/whatsapp`

### 6. Executar o Projeto

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Produção
npm start

# Verificação de tipos
npm run type-check

# Lint
npm run lint
```

O projeto estará disponível em `http://localhost:3000`

## 📁 Estrutura do Projeto

```
agente-imobiliaria/
├── app/                        # App Router (Next.js 14)
│   ├── api/                   # API Routes
│   │   ├── agent/            # Processamento do agente IA
│   │   ├── webhook/          # Webhooks (WhatsApp, pagamentos)
│   │   ├── properties/       # CRUD propriedades
│   │   └── reservations/     # CRUD reservas
│   ├── dashboard/            # Interface administrativa
│   │   ├── properties/       # Gestão de propriedades
│   │   ├── reservations/     # Gestão de reservas
│   │   ├── clients/          # Gestão de clientes
│   │   ├── conversations/    # Chat/conversas
│   │   └── analytics/        # Relatórios
│   ├── layout.tsx           # Layout principal
│   └── page.tsx             # Página inicial
├── components/              # Componentes React
│   ├── ui/                 # Componentes de UI
│   ├── property/           # Componentes de propriedades
│   ├── reservation/        # Componentes de reservas
│   ├── chat/              # Componentes de chat
│   └── common/            # Componentes comuns
├── lib/                   # Bibliotecas e utilitários
│   ├── firebase/         # Configuração e serviços Firebase
│   ├── services/         # Serviços (WhatsApp, OpenAI, etc.)
│   ├── hooks/           # React Hooks customizados
│   ├── utils/           # Utilitários
│   └── types/           # Definições TypeScript
├── theme/              # Configuração do tema MUI
└── public/            # Arquivos estáticos
```

## 🤖 Como Funciona o Agente IA

### Fluxo de Conversação

1. **Recebimento da Mensagem**: WhatsApp webhook → API
2. **Processamento**: OpenAI GPT-4 analisa a mensagem e o contexto
3. **Execução de Funções**: Busca propriedades, calcula preços, etc.
4. **Resposta**: Envio da resposta via WhatsApp
5. **Persistência**: Armazenamento da conversa no Firestore

### Funções Disponíveis do Agente

- `searchProperties`: Busca propriedades baseada em filtros
- `getPropertyDetails`: Obtém detalhes de uma propriedade específica
- `calculatePrice`: Calcula preços para datas específicas
- `sendPropertyMedia`: Envia fotos/vídeos das propriedades
- `createReservation`: Cria reservas para o cliente
- `updateClientPreferences`: Atualiza preferências do cliente

### Sistema de Preços Dinâmicos

O sistema calcula preços considerando:
- Preço base da propriedade
- Multiplicadores para fins de semana
- Multiplicadores para feriados
- Preços sazonais customizados
- Taxas de limpeza e caução

## 📊 Collections do Firestore

### Properties
- Informações da propriedade
- Preços e regras de pricing
- Mídias (fotos/vídeos)
- Comodidades e amenidades

### Reservations
- Dados da reserva
- Status e pagamentos
- Relacionamento com propriedade e cliente

### Clients
- Informações do cliente
- Preferências de busca
- Histórico de reservas

### Conversations
- Conversas do WhatsApp
- Contexto da conversa
- Mensagens e histórico

### Messages
- Mensagens individuais
- Metadata e status

## 🔒 Segurança

- Autenticação via Firebase Auth
- Regras de segurança no Firestore
- Validação de webhooks WhatsApp
- Sanitização de inputs
- Rate limiting nas APIs

## 🚀 Deploy

### Vercel (Recomendado)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Configurar variáveis de ambiente no dashboard da Vercel
```

### Outras Plataformas

O projeto é compatível com qualquer plataforma que suporte Next.js:
- Netlify
- Railway
- Heroku
- AWS
- Google Cloud

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🆘 Suporte

Para suporte e dúvidas:
- Abra uma issue no GitHub
- Envie um email para: suporte@exemplo.com
- Documentação: [docs.exemplo.com](https://docs.exemplo.com)

---

**Desenvolvido com ❤️ usando Next.js, Material-UI e OpenAI**