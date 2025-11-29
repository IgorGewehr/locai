# LOCAI - Sistema Imobiliario com IA

Sistema especializado de gestao imobiliaria para locacao por temporada, construido com Next.js 15, Firebase e integracao Sofia AI via N8N workflows + Baileys microservice.

## Indice

1. [Visao Geral](#visao-geral)
2. [Arquitetura](#arquitetura)
3. [60 AI Functions](#60-ai-functions)
4. [Revolutionary Onboarding](#revolutionary-onboarding)
5. [iCal Import/Export](#ical-importexport)
6. [Sistema de Conversas](#sistema-de-conversas)
7. [CRM Avancado](#crm-avancado)
8. [Integracao WhatsApp](#integracao-whatsapp)
9. [Facebook/Instagram](#facebookinstagram-em-desenvolvimento)
10. [Multi-tenant](#multi-tenant)
11. [API Endpoints](#api-endpoints)
12. [Configuracao](#configuracao)

---

## Visao Geral

LOCAI e uma plataforma **enterprise-grade** completa para gestao de imoveis de temporada, com **Sofia AI Agent** especializada em consultoria imobiliaria, integrada via **N8N workflows** e **servidor Baileys dedicado** para WhatsApp.

### Tech Stack

```typescript
{
  "core": {
    "framework": "Next.js 15.5.2 (App Router)",
    "language": "TypeScript 5.3.0",
    "ui": "Material-UI v5.15.0 + Emotion",
    "state": "React Context + Zustand",
    "database": "Firebase Firestore v10.7.0",
    "auth": "Firebase Auth + JWT Multi-tenant"
  },
  "ai_architecture": {
    "agent": "Sofia - Consultora Imobiliaria Especializada",
    "workflow_engine": "N8N v1.0+ (External)",
    "ai_model": "OpenAI GPT-4o Mini (via N8N)",
    "functions": "60 Business Functions via API",
    "behavior": "Reactive - Single Complete Response"
  },
  "messaging": {
    "whatsapp": "Baileys v6.7.18 (Dedicated Server)",
    "facebook": "Graph API v18.0 (In Development)",
    "instagram": "Graph API v18.0 (In Development)",
    "deployment": "DigitalOcean Dedicated Droplet"
  },
  "calendar_sync": {
    "protocol": "iCal RFC 5545",
    "platforms": "Airbnb, Booking, VRBO, Google Calendar",
    "direction": "Bidirectional (Import + Export)",
    "automation": "Cron every 30 minutes"
  },
  "crm_system": {
    "pipeline": "Automatic Lead Progression",
    "scoring": "Dynamic 20+ Factors AI Scoring",
    "analytics": "Advanced Conversion Funnels"
  }
}
```

### Funcionalidades Principais

- **Sofia AI Agent**: Consultora especializada com 60 funcoes de automacao
- **Revolutionary Onboarding**: Setup guiado em 2 passos (Propriedade + WhatsApp)
- **iCal Sync Bidirecional**: Import/Export com Airbnb, Booking, VRBO
- **CRM Avancado**: Pipeline automatizado com 5 dashboards analiticos
- **Multi-canal**: WhatsApp + Facebook Messenger + Instagram Direct
- **Multi-tenant**: Isolamento completo por organizacao
- **Mini-sites**: Sites publicos com dominios customizados
- **Enterprise Security**: Validacao Zod, sanitizacao de inputs, rate limiting

---

## Arquitetura

### Arquitetura de 4 Camadas

```
+-----------------------------------------------------------+
|                Frontend Layer (Next.js)                    |
|  +------------+ +------------+ +------------+ +----------+ |
|  |Revolutionary| |   CRM     | |Conversations| |Calendar | |
|  |Onboarding  | |5 Dashboards| |Multi-channel| |iCal Sync| |
|  +------------+ +------------+ +------------+ +----------+ |
+-----------------------------------------------------------+
                            | REST APIs
+-----------------------------------------------------------+
|              Sofia AI + N8N Layer                          |
|  +------------+ +------------+ +------------+ +----------+ |
|  |Sofia Agent | |N8N Workflow| |60 Functions| |  GPT-4o  | |
|  |Specialized | |Engine      | |Business    | |  Mini    | |
|  |Real Estate | |External    | |Automation  | |          | |
|  +------------+ +------------+ +------------+ +----------+ |
+-----------------------------------------------------------+
                            | Webhooks
+-----------------------------------------------------------+
|             Integration Layer                              |
|  +------------+ +------------+ +------------+ +----------+ |
|  |Baileys     | |Facebook    | |iCal Sync   | |  CRM     | |
|  |Dedicated   | |Graph API   | |Cron Job    | |  Auto    | |
|  |Server      | |Webhooks    | |Every 30min | |  Pipeline| |
|  +------------+ +------------+ +------------+ +----------+ |
+-----------------------------------------------------------+
                            | Data Services
+-----------------------------------------------------------+
|                Data Layer                                  |
|  +------------+ +------------+ +------------+ +----------+ |
|  |Firestore   | |Storage     | |Services    | | Cache    | |
|  |Multi-tenant| |Media Files | |Factory     | | LRU      | |
|  |Isolation   | |Compressed  | |Tenant      | | 5min TTL | |
|  +------------+ +------------+ +------------+ +----------+ |
+-----------------------------------------------------------+
```

### Fluxo Sofia WhatsApp

```
Cliente WhatsApp
       |
       v
Baileys Server (Dedicado)
       |
       v
POST /webhook/whatsapp-microservice
       |
       v
N8N + Sofia Workflow
       |
       +---> create_lead
       +---> search_properties
       +---> send_property_media
       +---> add_lead_interaction
       +---> lead_pipeline_movement
       |
       v
POST /api/whatsapp/send-n8n
       |
       v
Cliente recebe resposta completa
```

---

## 60 AI Functions

### Categorias de Funcoes

| Categoria | Count | Funcoes Principais |
|-----------|-------|-------------------|
| **CRM/Leads** | 11 | `create-lead`, `lead-pipeline-movement`, `classify-lead` |
| **Reservations** | 7 | `create-reservation`, `check-availability`, `schedule-visit` |
| **Properties** | 4 | `search-properties`, `get-property-details`, `send-property-media` |
| **Financial** | 6 | `calculate-price`, `calculate-dynamic-discount`, `check-discount-opportunities` |
| **Payments** | 8 | `create-payment-link`, `generate-pix-qrcode`, `check-payment-status` |
| **Analytics** | 7 | `track-conversion-step`, `get-analytics-dashboard`, `get-business-insights` |
| **Policies** | 5 | `get-tenant-config`, `get-negotiation-settings`, `get-policies` |
| **Communication** | 3 | `post-notification`, `post-conversation` |
| **Goals/Tasks** | 4 | `create-goal`, `update-goal-progress`, `create-task` |
| **Wallet** | 2 | `wallet-get-balance`, `wallet-add-credit` |
| **Outros** | 3 | `register-client`, `schedule-meeting`, `get-agent-prompts` |

### Todas as 60 Funcoes

```typescript
// CRM/LEADS (11)
POST /api/ai/functions/create-lead
POST /api/ai/functions/get-lead-details
POST /api/ai/functions/get-leads-list
POST /api/ai/functions/update-lead
POST /api/ai/functions/update-lead-status
POST /api/ai/functions/classify-lead
POST /api/ai/functions/add-lead-interaction
POST /api/ai/functions/analyze-lead-performance
POST /api/ai/functions/lead-pipeline-movement
POST /api/ai/functions/follow-up-lead
POST /api/ai/functions/track-qualification-milestone

// RESERVATIONS (7)
POST /api/ai/functions/create-reservation
POST /api/ai/functions/modify-reservation
POST /api/ai/functions/cancel-reservation
POST /api/ai/functions/check-availability
POST /api/ai/functions/check-agenda-availability
POST /api/ai/functions/check-visit-availability
POST /api/ai/functions/schedule-visit

// PROPERTIES (4)
POST /api/ai/functions/search-properties
POST /api/ai/functions/search-properties-cached
POST /api/ai/functions/search-properties-optimized
POST /api/ai/functions/get-property-details

// FINANCIAL (6)
POST /api/ai/functions/calculate-price
POST /api/ai/functions/calculate-dynamic-discount
POST /api/ai/functions/check-discount-opportunities
POST /api/ai/functions/get-dynamic-discount
POST /api/ai/functions/generate-quote
POST /api/ai/functions/request-withdrawal

// PAYMENTS (8)
POST /api/ai/functions/create-payment-link
POST /api/ai/functions/generate-pix-qrcode
POST /api/ai/functions/create-transaction
POST /api/ai/functions/check-payment-status
POST /api/ai/functions/cancel-payment
POST /api/ai/functions/list-pending-payments
POST /api/ai/functions/send-payment-reminder
POST /api/ai/functions/get-financial-summary

// ANALYTICS (7)
POST /api/ai/functions/track-conversion-step
POST /api/ai/functions/track-conversation-metric
POST /api/ai/functions/track-conversation-session
POST /api/ai/functions/track-message-engagement
POST /api/ai/functions/track-metrics
POST /api/ai/functions/analyze-performance
POST /api/ai/functions/get-analytics-dashboard

// POLICIES/CONFIG (5)
POST /api/ai/functions/get-tenant-config
POST /api/ai/functions/get-negotiation-settings
POST /api/ai/functions/get-policies
POST /api/ai/functions/get-cancellation-policies
POST /api/ai/functions/get-company-address

// COMMUNICATION (3)
POST /api/ai/functions/post-notification
POST /api/ai/functions/send-tenant-map
POST /api/ai/functions/post-conversation

// GOALS/TASKS (4)
POST /api/ai/functions/create-goal
POST /api/ai/functions/update-goal-progress
POST /api/ai/functions/create-task
POST /api/ai/functions/update-task

// WALLET (2)
POST /api/ai/functions/wallet-get-balance
POST /api/ai/functions/wallet-add-credit

// OUTROS (3)
POST /api/ai/functions/register-client
POST /api/ai/functions/schedule-meeting
POST /api/ai/functions/get-agent-prompts
```

---

## Revolutionary Onboarding

Sistema de onboarding guiado em 2 passos para novos usuarios.

### Passos

1. **Adicionar Primeira Propriedade**
   - Importar do Airbnb (automatico com URL)
   - Criar manualmente
   - Tempo estimado: 5 minutos

2. **Conectar WhatsApp**
   - Escanear QR Code
   - Habilitar Sofia AI
   - Tempo estimado: 3 minutos

### Arquitetura

```typescript
// Componentes principais
/components/organisms/RevolutionaryOnboarding/
  RevolutionaryOnboarding.tsx       // Main component
  SafeRevolutionaryOnboarding.tsx   // Error boundary wrapper
  OnboardingStepCard.tsx            // Individual step card
  steps/
    Step1PropertySetup/             // Property import/create
    Step3WhatsAppSetup/             // WhatsApp QR connection

// Hooks
/lib/hooks/useOnboarding.ts              // Base hook
/lib/hooks/useRevolutionaryOnboarding.ts // Extended hook

// Data structure
interface OnboardingProgress {
  userId: string;
  tenantId: string;
  steps: {
    add_property: 'pending' | 'in_progress' | 'completed' | 'skipped';
    connect_whatsapp: 'pending' | 'in_progress' | 'completed' | 'skipped';
  };
  completionPercentage: number;  // 0, 50, 100
  isCompleted: boolean;
  viewMode: 'compact' | 'expanded' | 'fullscreen';
}
```

### Visualizacoes

- **Compact**: Card minimalista no dashboard
- **Expanded**: Grid com todos os passos
- **Fullscreen**: Dialog em tela cheia

---

## iCal Import/Export

Sistema bidirecional de sincronizacao de calendarios com Airbnb, Booking, VRBO e Google Calendar.

### Exportacao (Locai -> Airbnb/Booking)

```typescript
// 1. Gerar token de seguranca
POST /api/properties/[id]/ical/generate-token
// Retorna: /api/ical/{tenantId}/{propertyId}?token={token}

// 2. Airbnb/Booking busca o feed
GET /api/ical/{tenantId}/{propertyId}?token={token}
// Retorna: arquivo .ics RFC 5545 compliant

// Features:
// - Cache de 1 hora
// - Rate limiting (1000 req/hora por IP)
// - Filtra ultimos 12 meses
// - Exclui reservas externas (previne loop)
```

### Importacao (Airbnb/Booking -> Locai)

```typescript
// 1. Configurar importacao
POST /api/calendar/sync/configure
{
  propertyId: string,
  iCalUrl: string,        // URL do Airbnb/Booking
  source: 'AIRBNB' | 'BOOKING' | 'VRBO' | 'GOOGLE_CALENDAR',
  syncFrequency: 'hourly' | 'daily' | 'manual'
}

// 2. Sync manual
POST /api/calendar/sync/{propertyId}

// 3. Sync automatico (cron a cada 30 min)
POST /api/calendar/sync/cron

// Features:
// - Deduplicacao via UID
// - Soft-delete para reservas removidas externamente
// - Cliente generico por plataforma
// - Exponential backoff retry
```

### Servicos

```typescript
// lib/services/ical-generator-service.ts   - Gera feeds iCal
// lib/services/ical-parser-service.ts      - Parse de iCal externo
// lib/services/calendar-sync-service.ts    - Orquestracao de sync
// lib/services/airbnb-import-service.ts    - Integracao Airbnb
// lib/services/property-import-service.ts  - Bulk import de propriedades
// lib/services/import-progress-service.ts  - Tracking de progresso
```

### Property Import Wizard

Wizard de 5 passos para importar propriedades do Airbnb:

1. **Paste URL**: Cole a URL da propriedade do Airbnb
2. **Import Data**: Busca dados automaticamente
3. **Configure iCal**: Configura sincronizacao (opcional)
4. **Complete Details**: Preenche informacoes adicionais
5. **Success**: Propriedade criada

---

## Sistema de Conversas

Interface multi-canal para gerenciamento de conversas com clientes.

### Canais Suportados

1. **WhatsApp** - Via Baileys dedicated server
2. **Facebook Messenger** - Via Graph API (em desenvolvimento)
3. **Instagram Direct** - Via Graph API (em desenvolvimento)

### Interface

```typescript
// Pagina: /app/dashboard/conversas/page.tsx

// Layout split-screen:
// [Sidebar Canais] | [Lista Conversas] | [Thread Mensagens]

// Features:
// - Filtro por canal (WhatsApp, Facebook, Instagram)
// - Busca por nome/telefone
// - Infinite scroll
// - Indicadores de mensagens nao lidas
// - Context menu (renomear, marcar lido, alterar status)
// - AI Control (bloquear/desbloquear Sofia)
```

### AI Control

Permite bloquear Sofia para atendimento manual:

```typescript
// Bloquear IA
POST /api/ai/block-conversation
{
  phone: string,
  blocked: true,
  duration: 1 | 2 | 4 | 24,  // horas
  reason?: string
}

// Verificar status
GET /api/ai/block-conversation?phone={phone}

// Quando bloqueada:
// - Input manual ativado
// - Mensagens em tempo real via Redis pub/sub
// - Expira automaticamente apos duracao
```

### Otimizacoes

```typescript
// Two-Collection Architecture
tenants/{tenantId}/conversations/    // Lightweight headers (1-2KB)
tenants/{tenantId}/messages/         // Detailed messages

// Hook otimizado
const {
  conversations,
  selectedConversation,
  messages,
  loadConversations,
  selectConversation,
  markAsRead,
  renameConversation
} = useConversationsOptimized({ tenantId });
```

---

## CRM Avancado

Sistema completo de gerenciamento de relacionamento com clientes.

### Pipeline Stages

```typescript
enum LeadStage {
  NEW = 'new',           // Lead criado
  CONTACTED = 'contacted', // Primeiro contato
  QUALIFIED = 'qualified', // Necessidades identificadas
  PRESENTATION = 'presentation', // Opcoes mostradas
  PROPOSAL = 'proposal',   // Orcamento solicitado
  NEGOTIATION = 'negotiation', // Discussao de preco
  CLOSING = 'closing',     // Confirmacao
  WON = 'won',            // Reserva concluida
  LOST = 'lost'           // Perdido
}
```

### Progressao Automatica

Sofia move leads automaticamente baseado nas interacoes:

```
new -> contacted       // Primeira resposta da Sofia
contacted -> qualified // Identifica datas, orcamento, localizacao
qualified -> presentation // Mostra opcoes de imoveis
presentation -> proposal  // Cliente pede orcamento
proposal -> negotiation   // Discussao de preco
negotiation -> closing    // Confirmacao de orcamento
closing -> won           // Reserva concluida
```

### 5 Dashboards

1. **Pipeline**: Kanban drag-and-drop com stages
2. **Todos os Leads**: Lista completa com filtros
3. **Insights IA**: Recomendacoes AI-powered
4. **Analytics Avancado**: Funis de conversao, time series
5. **Performance**: Tracking individual por lead

### Componentes

```typescript
/app/dashboard/crm/
  page.tsx                            // Main interface
  components/
    KanbanBoard.tsx                   // Drag-drop pipeline
    AdvancedAnalytics.tsx             // Conversion funnels
    LeadPerformanceTracker.tsx        // Individual tracking
    AIInsights.tsx                    // AI recommendations
    CRMStats.tsx                      // KPIs
    LeadDetailsDrawer.tsx             // Lead details
    CreateLeadDialog.tsx              // Create lead
    TaskDialog.tsx                    // Create task
```

### Lead Scoring

Pontuacao dinamica baseada em 20+ fatores:

- **Base Score**: Qualidade inicial
- **Temperature Bonus**: hot (+15), warm (+5), cold (-10)
- **Interaction Bonus**: Frequencia e engajamento
- **Qualification Bonus**: Budget, timeline, need, authority
- **Time Decay**: Reducao para leads antigos
- **AI Enhanced**: Ajustes baseados em ML

---

## Integracao WhatsApp

### Servidor Dedicado

```typescript
{
  server: {
    url: 'http://167.172.116.195:3000',
    technology: 'Baileys v6.7.18',
    deployment: 'DigitalOcean Dedicated Droplet',
    isolation: 'Multi-tenant QR sessions'
  },
  features: {
    session_management: 'QR code por tenant',
    media_handling: 'Upload/download direto',
    multi_device: 'WhatsApp multi-device support',
    auto_reconnection: 'Reconexao automatica'
  }
}
```

### Endpoints

```typescript
// Receber mensagens do Baileys
POST /api/webhook/whatsapp-microservice

// Mensagens em tempo real (modo manual)
POST /api/webhook/client-message

// Enviar via Sofia/N8N
POST /api/whatsapp/send-n8n

// Enviar manualmente
POST /api/whatsapp/send-manual

// QR Code
GET /api/whatsapp/qr

// Status da sessao
GET /api/whatsapp/session
```

---

## Facebook/Instagram (Em Desenvolvimento)

Integracao com Facebook Messenger e Instagram Direct Messages.

### Endpoints

```typescript
// Webhook (recebe mensagens)
GET/POST /api/facebook/webhook

// Autenticacao (conectar paginas)
POST /api/facebook/auth
DELETE /api/facebook/auth?tenantId={tenantId}

// Status da conexao
GET /api/facebook/status?tenantId={tenantId}

// Enviar mensagens
POST /api/social/send
{
  tenantId: string,
  conversationId: string,
  message: string
}
```

### Webhook Events

Suporta 3 tipos de objetos:

1. **Page** (Facebook Messenger)
2. **Instagram** (Direct Messages)
3. **WhatsApp Business Account** (Oficial)

---

## Multi-tenant

### Estrutura Firestore

```typescript
tenants/
  {tenantId}/
    properties/           // Imoveis
    clients/             // Clientes
    reservations/        // Reservas
    transactions/        // Transacoes
    leads/               // Pipeline CRM
    conversations/       // Conversas
    messages/            // Mensagens
    amenities/           // Comodidades
    goals/               // Metas
    calendar_sync_configurations/  // Config iCal
    settings/
      company/           // Dados da empresa
      negotiation/       // Descontos
      policies/          // Politicas
      ai-config/         // Config da Sofia

users/
  {userId}/
    onboarding/          // Progresso onboarding
      {tenantId}/
```

### TenantServiceFactory

```typescript
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';

const services = new TenantServiceFactory(tenantId);

// Acesso a colecoes
const properties = await services.properties.getAll();
const clients = await services.clients.getAll();
const reservations = await services.reservations.getAll();
const leads = await services.leads.getAll();

// Servicos especializados
const availability = await services.availability.check(propertyId, dates);
const accounts = await services.accounts.getBalance();
```

---

## API Endpoints

### Core APIs

```typescript
// Reservations
GET/POST  /api/reservations
GET/PUT   /api/reservations/[id]
DELETE    /api/reservations/[id]?soft=true

// Transactions
GET/POST  /api/transactions

// Properties
GET/POST  /api/properties
POST      /api/properties/import
POST      /api/properties/import/validate

// iCal
GET  /api/ical/[tenantId]/[propertyId]
POST /api/properties/[id]/ical/generate-token
POST /api/calendar/sync/configure
POST /api/calendar/sync/[propertyId]
POST /api/calendar/sync/cron

// WhatsApp
POST /api/webhook/whatsapp-microservice
POST /api/webhook/client-message
POST /api/whatsapp/send-n8n
POST /api/whatsapp/send-manual
GET  /api/whatsapp/qr
GET  /api/whatsapp/session

// Facebook/Instagram
GET/POST /api/facebook/webhook
POST     /api/facebook/auth
GET      /api/facebook/status
POST     /api/social/send

// AI Control
GET/POST /api/ai/block-conversation

// Tenant Settings
GET/PUT  /api/tenant/settings/company
GET/PUT  /api/tenant/settings/negotiation
GET/PUT  /api/tenant/settings/policies
GET/PUT  /api/tenant/discount-settings
```

---

## Configuracao

### Variaveis de Ambiente

```bash
# === CORE APPLICATION ===
NEXT_PUBLIC_APP_URL=http://localhost:3000
TENANT_ID=default-tenant
NODE_ENV=development

# === FIREBASE ===
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_SERVICE_ACCOUNT_KEY=

# === SOFIA AI + N8N ===
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/sofia-messages
N8N_WEBHOOK_SECRET=your-n8n-webhook-secret
N8N_API_KEY=your-n8n-api-key-for-functions

# === WHATSAPP - BAILEYS ===
WHATSAPP_MICROSERVICE_URL=http://167.172.116.195:3000
WHATSAPP_MICROSERVICE_API_KEY=your-dedicated-server-key
WHATSAPP_WEBHOOK_SECRET=your-webhook-validation-secret

# === FACEBOOK ===
NEXT_PUBLIC_FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_VERIFY_TOKEN=

# === CALENDAR SYNC ===
CRON_SECRET=your-cron-secret-for-calendar-sync

# === SECURITY ===
JWT_SECRET=your-ultra-secure-jwt-secret
ADMIN_API_SECRET=your-admin-panel-secret
```

### Scripts de Desenvolvimento

```bash
# Desenvolvimento
npm install                      # Instalar dependencias
npm run dev                      # Dev server (port 3000)

# Build & Deploy
npm run build                    # Production build
npm run start                    # Production server
npm run prod-check               # Full deployment check

# Qualidade
npm run lint                     # ESLint
npm run type-check               # TypeScript validation

# Utilitarios
npm run clean                    # Limpar cache
npm run health                   # Health check
```

### Testes

```bash
# Test AI Functions
curl -X POST http://localhost:3000/api/ai/functions/create-lead \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"test","phone":"+5511999999999"}'

# Search properties
curl -X POST http://localhost:3000/api/ai/functions/search-properties \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"test","location":"Praia","guests":4}'

# Check discount opportunities
curl -X POST http://localhost:3000/api/ai/functions/check-discount-opportunities \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"test"}'

# Test iCal export
curl http://localhost:3000/api/ical/{tenantId}/{propertyId}?token={token}
```

---

## Dashboard

### Paginas Disponiveis

| Pagina | Path | Descricao |
|--------|------|-----------|
| **Home** | `/dashboard` | Overview com KPIs, agenda, heatmap |
| **CRM** | `/dashboard/crm` | Pipeline, leads, analytics |
| **Properties** | `/dashboard/properties` | Gerenciamento de imoveis |
| **Reservations** | `/dashboard/reservations` | Reservas e visitas |
| **Clients** | `/dashboard/clients` | Gerenciamento de clientes |
| **Conversations** | `/dashboard/conversas` | Chat multi-canal |
| **Agenda** | `/dashboard/agenda` | Calendario de eventos |
| **Financial** | `/dashboard/financeiro/*` | Transacoes, cobrancas, relatorios |
| **Settings** | `/dashboard/settings/*` | WhatsApp, empresa, politicas, IA |
| **Admin** | `/dashboard/lkjhg` | Painel administrativo |

---

## Seguranca

### Camadas de Seguranca

1. **Zod Validation** - Todas as rotas API usam Zod
2. **Input Sanitization** - Protecao XSS via `sanitizeUserInput()`
3. **Rate Limiting** - Limites por tenant
4. **Tenant Isolation** - Paths multi-tenant no Firestore
5. **PII Masking** - Automatico no sistema de logging

### Padrao de API Route

```typescript
import { z } from 'zod';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { sanitizeUserInput } from '@/lib/utils/validation';
import { handleApiError } from '@/lib/utils/api-errors';
import { logger } from '@/lib/utils/logger';

const Schema = z.object({
  name: z.string().min(1).max(100),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Autenticar
    const auth = await validateFirebaseAuth(request);
    if (!auth.authenticated) return unauthorized();

    // 2. Validar
    const body = await request.json();
    const result = Schema.safeParse(body);
    if (!result.success) return validationError(result.error);

    // 3. Sanitizar
    const sanitized = { ...result.data, name: sanitizeUserInput(result.data.name) };

    // 4. Executar (tenant-scoped)
    const services = new TenantServiceFactory(auth.tenantId);
    const data = await services.collection.create(sanitized);

    // 5. Retornar
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## Performance

- **Sofia Functions**: <300ms por funcao
- **CRM Dashboard**: <1s load time
- **iCal Sync**: Cache de 1 hora
- **Query Optimization**: LRU cache + indices compostos
- **Bundle**: ~3.2MB com code splitting
- **Real-time**: Firebase onSnapshot para updates ao vivo

---

## Estrutura do Projeto

```
locai/
  app/
    api/
      ai/functions/           # 60 AI function endpoints
      calendar/sync/          # iCal sync endpoints
      facebook/               # Facebook/Instagram integration
      whatsapp/               # WhatsApp endpoints
      webhook/                # Webhook handlers
      properties/             # Properties CRUD
      reservations/           # Reservations CRUD
      tenant/                 # Tenant settings
    dashboard/
      crm/                    # CRM interface
      conversas/              # Conversations interface
      properties/             # Properties management
      settings/               # Settings pages
      lkjhg/                  # Admin panel
    onboarding/               # Basic onboarding quiz

  components/
    organisms/
      RevolutionaryOnboarding/  # Onboarding system
      PropertyImportWizard/     # Property import
      PropertyICalManagement/   # iCal management

  lib/
    firebase/
      firestore-v2.ts         # Multi-tenant Firestore
    services/
      ical-generator-service.ts
      ical-parser-service.ts
      calendar-sync-service.ts
      property-import-service.ts
      conversation-service.ts
      facebook-service.ts
    hooks/
      useOnboarding.ts
      useRevolutionaryOnboarding.ts
      useConversationsOptimized.ts
    ai/
      tenant-aware-agent-functions.ts
    types/
      calendar-sync.ts
      conversation.ts
      onboarding.ts
    utils/
      logger.ts
      validation.ts
      api-errors.ts

  scripts/
    cron-sync-calendars.js    # iCal cron job
    migrate-onboarding-data.ts
```

---

*Sistema LOCAI - Versao 6.0*
*Arquitetura: Sofia AI Agent + N8N + Baileys + iCal Sync + Multi-channel*
*60 AI Functions | Revolutionary Onboarding | Enterprise Security | Multi-tenant*
*Ultima atualizacao: Novembro 2025*
