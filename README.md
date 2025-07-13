# 🏠 LocAI - Sistema de Gestão Imobiliária com IA

**LocAI** é um sistema completo de gestão imobiliária enterprise-level com assistente de IA integrado ao WhatsApp. O sistema permite gerenciar propriedades, reservas, clientes e oferece automação inteligente para atendimento 24/7.

## 🎉 Status do Projeto (Dezembro 2024)

✅ **Sistema 100% Funcional**
- Todos os módulos integrados com Firebase (sem dados mockados)
- CRUD completo para todas as entidades
- IA capaz de criar autonomamente: reservas, clientes e pagamentos
- Navegação intuitiva entre registros relacionados
- Interface responsiva otimizada para mobile

## 📋 Índice

- [🎯 Visão Geral](#-visão-geral)
- [🏗️ Arquitetura do Sistema](#️-arquitetura-do-sistema)
- [🖥️ Telas e Funcionalidades](#️-telas-e-funcionalidades)
- [🧩 Atomic Design Components](#-atomic-design-components)
- [🔗 API Routes](#-api-routes)
- [📊 Modelos de Dados](#-modelos-de-dados)
- [📚 Estrutura de Arquivos](#-estrutura-de-arquivos)
- [🚀 Como Executar](#-como-executar)
- [⚙️ Configuração](#️-configuração)
- [🔧 Tecnologias](#-tecnologias)

## 🎯 Visão Geral

### Funcionalidades Principais

- **🤖 Assistente IA WhatsApp**: Atendimento automatizado 24/7 com GPT-4
  - Criação autônoma de reservas com pagamentos
  - Registro inteligente de clientes com deduplicação
  - Gestão de despesas e receitas
  - Function calling avançado
  
- **🏠 Gestão de Propriedades**: CRUD completo com upload de mídia
  - Calendário de disponibilidade
  - Precificação dinâmica por temporada
  - Galeria de fotos e vídeos
  
- **📅 Sistema de Reservas**: Controle completo do ciclo de locação
  - Links diretos para cliente, propriedade e pagamento
  - Status e acompanhamento em tempo real
  - Integração automática com financeiro
  
- **📊 Analytics Enterprise**: Métricas financeiras e operacionais
  - Dados reais sem placeholders
  - Tendências calculadas dinamicamente
  - Segmentação de clientes automática
  
- **⚙️ Configuração Visual**: Setup de IA e empresa sem código
- **💰 Precificação Dinâmica**: Sistema automatizado com regras customizáveis

### Arquitetura Técnica

- **Frontend**: Next.js 14 + TypeScript + Material-UI
- **Backend**: Next.js API Routes + Firebase
- **IA**: OpenAI GPT-4 com Function Calling
- **Mensageria**: WhatsApp Business API
- **Banco de Dados**: Firebase Firestore
- **Storage**: Firebase Storage para mídia

## 🏗️ Arquitetura do Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WhatsApp      │    │   Next.js       │    │   Firebase      │
│   Business API  │◄──►│   Application   │◄──►│   Backend       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   OpenAI        │    │   Material-UI   │    │   Storage       │
│   GPT-4 API     │    │   Components    │    │   (Images/Docs) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Fluxo de Dados

1. **Cliente** envia mensagem no WhatsApp
2. **Webhook** recebe e processa a mensagem
3. **IA Agent** analisa e gera resposta usando function calling
4. **Firebase** persiste conversas e dados
5. **Dashboard** exibe métricas e permite gestão

## 🖥️ Telas e Funcionalidades

### 🏠 Dashboard Principal (`/dashboard`)

**Localização**: `app/dashboard/page.tsx`

**Funcionalidades**:
- KPIs principais (receita, ocupação, reservas)
- Status do WhatsApp em tempo real
- Atividade recente
- Ações rápidas de navegação

**Components Utilizados**:
```typescript
// Atoms
- Typography (títulos e textos)
- Chip (status e badges)
- Avatar (representação visual)
- LinearProgress (indicadores)

// Molecules  
- StatCard (cartões de métricas)
- ActivityItem (itens de atividade)

// Organisms
- DashboardHeader (cabeçalho com ações)
- StatsGrid (grid de estatísticas)
- ActivityFeed (feed de atividades)
```

### 🏠 Gestão de Propriedades

#### Listagem (`/dashboard/properties`)
**Localização**: `app/dashboard/properties/page.tsx`

**Funcionalidades**:
- Grid responsivo de propriedades
- Filtros por tipo, status e busca textual
- Menu de ações (editar, duplicar, excluir)
- Cards com informações visuais

**Components Utilizados**:
```typescript
// Atoms
- TextField (busca e filtros)
- Select (dropdowns de filtro)
- IconButton (ações rápidas)
- Chip (status da propriedade)

// Molecules
- PropertyCard (cartão de propriedade)
- FilterBar (barra de filtros)
- ActionMenu (menu de ações)

// Organisms
- PropertiesGrid (grid principal)
- PropertiesFilters (sistema de filtros)
```

#### Criação (`/dashboard/properties/create`)
**Localização**: `app/dashboard/properties/create/page.tsx`

**Funcionalidades**:
- Stepper com 6 etapas organizadas
- Validação em tempo real
- Upload de mídia com preview
- Sistema de precificação dinâmica

**Components Utilizados**:
```typescript
// Organisms (Principais)
- PropertyBasicInfo (informações básicas)
- PropertySpecs (especificações técnicas)
- PropertyAmenities (comodidades)
- PropertyPricing (configuração de preços)
- PropertyMediaUpload (upload de fotos/vídeos)

// Molecules
- StepperNavigation (navegação entre etapas)
- ValidationMessage (mensagens de erro)
- PriceCalculator (calculadora de preços)

// Atoms
- Stepper (indicador de progresso)
- Button (navegação e ações)
- TextField (inputs diversos)
```

#### Edição (`/dashboard/properties/[id]/edit`)
**Localização**: `app/dashboard/properties/[id]/edit/page.tsx`

**Funcionalidades**:
- Tabs para organização do conteúdo
- Indicador de alterações não salvas
- Mudança de status inline
- Preservação de estado durante edição

**Components Utilizados**:
```typescript
// Organisms (Reutilizados da criação)
- PropertyBasicInfo
- PropertySpecs  
- PropertyAmenities
- PropertyPricing
- PropertyMediaUpload

// Molecules
- TabNavigation (navegação em abas)
- StatusChanger (alteração de status)
- UnsavedChanges (indicador de mudanças)

// Atoms
- Tabs (sistema de abas)
- Dialog (confirmações)
- Alert (avisos importantes)
```

### 📅 Sistema de Reservas (`/dashboard/reservations`)

**Localização**: `app/dashboard/reservations/page.tsx`

**Funcionalidades**:
- Tabela profissional com paginação
- Filtros por status, pagamento e período
- Modal de detalhes completos
- Integração com WhatsApp

**Components Utilizados**:
```typescript
// Atoms
- Table (tabela principal)
- TableCell (células da tabela)
- Badge (contadores)
- Tooltip (informações extras)

// Molecules
- ReservationRow (linha da tabela)
- FilterPanel (painel de filtros)
- StatusChip (chip de status)
- PaymentStatus (status de pagamento)

// Organisms
- ReservationsTable (tabela completa)
- ReservationDetails (modal de detalhes)
- ReservationsFilters (sistema de filtros)
```

### 📊 Analytics Enterprise (`/dashboard/analytics`)

**Localização**: `app/dashboard/analytics/page.tsx`

**Funcionalidades**:
- KPIs com indicadores de tendência
- 4 tabs especializadas (Receita, Propriedades, Pagamentos, Origens)
- Gráficos interativos com Recharts
- Insights automáticos e alertas

**Components Utilizados**:
```typescript
// Atoms
- Typography (títulos e labels)
- Select (seletores de período)
- Chip (indicadores)
- LinearProgress (barras de progresso)

// Molecules
- KPICard (cartões de métricas principais)
- ChartContainer (containers para gráficos)
- InsightAlert (alertas de insights)
- TrendIndicator (indicadores de tendência)

// Organisms
- RevenueChart (gráfico de receita)
- PropertyPerformanceTable (tabela de performance)
- PaymentMethodsPie (gráfico pizza de pagamentos)
- BookingSourcesBar (gráfico de origens)
- AnalyticsDashboard (dashboard completo)
```

### ⚙️ Configurações Avançadas (`/dashboard/settings`)

**Localização**: `app/dashboard/settings/page.tsx`

**Funcionalidades**:
- 3 tabs: WhatsApp, Empresa, Assistente IA
- Upload de logo com preview
- Configuração de prompts da IA
- QR Code para conexão WhatsApp

**Components Utilizados**:
```typescript
// Atoms
- TextField (inputs de configuração)
- Avatar (preview do logo)
- Button (ações de upload/save)
- Alert (avisos e status)

// Molecules
- LogoUploader (upload de logo)
- AIStylePreview (preview de estilos IA)
- QRCodeDisplay (exibição do QR)
- ConfigurationForm (formulários)

// Organisms
- WhatsAppSetup (configuração completa WhatsApp)
- CompanySettings (configurações da empresa)
- AIPersonalityConfig (configuração da IA)
- SettingsTabs (sistema de abas)
```

## 🧩 Atomic Design Components

### 🔹 Atoms (Elementos Básicos)
```
components/atoms/
├── AIConfidenceIndicator/   # Indicador de confiança IA
├── AIPersonality/          # Personalidade da IA
├── AutomationTrigger/      # Gatilhos de automação
├── Button/                 # Botões customizados
├── Chip/                   # Chips e badges
├── ClientScore/            # Pontuação de clientes
├── ConversationStatus/     # Status de conversas
├── CurrencyDisplay/        # Exibição de valores monetários
├── DateDisplay/            # Exibição de datas
├── Icon/                   # Ícones do sistema
├── Input/                  # Inputs e TextFields
├── MessageType/            # Tipos de mensagem
├── OccupancyIndicator/     # Indicador de ocupação
├── PaymentMethodIcon/      # Ícones de pagamento
├── QuickActionButton/      # Botões de ação rápida
├── StatusChip/             # Chips de status
└── Typography/             # Textos e títulos
```

### 🔸 Molecules (Combinações Funcionais)
```
components/molecules/
├── cards/
│   ├── MediaCard/              # Cartão de mídia
│   └── FinancialSummaryCard/   # Cartão de resumo financeiro
├── forms/
│   ├── CheckboxField/          # Campo checkbox
│   ├── FormField/              # Campo de formulário
│   └── SelectField/            # Campo select
├── navigation/
│   ├── StepperNavigation/      # Navegação em etapas
│   └── QuickActions/           # Ações rápidas
├── profiles/
│   └── ClientProfile/          # Perfil do cliente
└── summaries/
    └── ConversationSummary/    # Resumo de conversas
```

### 🔶 Organisms (Seções Complexas)
```
components/organisms/
├── ai/
│   └── AIAgent/                # Agente de IA
├── calendars/
│   ├── AvailabilityCalendar/   # Calendário de disponibilidade
│   └── PricingCalendar/        # Calendário de preços
├── dashboards/
│   ├── AnalyticsDashboard/     # Dashboard de analytics
│   └── AudioPreferences/       # Preferências de áudio
├── financial/
│   ├── TransactionTimeline/    # Timeline de transações
│   └── PricingSurcharges/      # Sobretaxas de preço
├── goals/
│   ├── GoalCard/               # Cartão de meta
│   ├── CreateGoalDialog/       # Diálogo criar meta
│   ├── GoalDetailsDialog/      # Detalhes da meta
│   └── AddCheckpointDialog/    # Adicionar checkpoint
├── navigation/
│   ├── Header/                 # Cabeçalho principal
│   └── Sidebar/                # Barra lateral
└── property/
    ├── PropertyAmenities/      # Comodidades
    ├── PropertyBasicInfo/      # Informações básicas
    ├── PropertyMediaUpload/    # Upload de mídia
    ├── PropertyPricing/        # Precificação
    └── PropertySpecs/          # Especificações
```

### 🏗️ Templates (Layout Structures)
```
components/templates/
└── dashboards/
    ├── AdvancedAnalytics/          # Analytics avançado
    ├── SimpleFinancialDashboard/   # Dashboard financeiro
    └── FinancialGoals/             # Metas financeiras
```

### 🛠️ Utilities (Componentes Utilitários)
```
components/utilities/
└── ProtectedRoute/     # Rota protegida por autenticação
```

### 📄 Pages (Páginas Completas)
```
app/dashboard/
├── page.tsx                    # Dashboard principal
├── properties/
│   ├── page.tsx               # Listagem de propriedades
│   ├── create/page.tsx        # Criação de propriedade
│   └── [id]/edit/page.tsx     # Edição de propriedade
├── reservations/page.tsx       # Gestão de reservas
├── analytics/page.tsx          # Analytics e métricas
└── settings/page.tsx           # Configurações
```

## 🔗 API Routes

### Core APIs
```
app/api/
├── agent/route.ts              # Processamento do agente IA
├── webhook/whatsapp/route.ts   # Webhook do WhatsApp
├── properties/
│   ├── route.ts               # CRUD de propriedades
│   └── [id]/route.ts          # Operações por ID
├── reservations/
│   ├── route.ts               # CRUD de reservas
│   └── [id]/route.ts          # Operações por ID
├── clients/route.ts            # Gestão de clientes
├── conversations/route.ts      # Conversas do WhatsApp
├── analytics/route.ts          # Dados de analytics
├── pricing/route.ts            # Cálculos de preço
├── media/route.ts              # Upload de mídia
└── config/
    ├── whatsapp/route.ts      # Config WhatsApp
    └── company/route.ts        # Config da empresa
```

### Funcionalidades por Endpoint

#### 🤖 `/api/agent` - Agente IA
```typescript
POST /api/agent
{
  "message": "Procuro apartamento 2 quartos",
  "clientPhone": "+5511999999999",
  "conversationId": "conv_123"
}

Response: {
  "response": "Encontrei ótimas opções! Posso mostrar?",
  "function_calls": ["searchProperties", "sendPropertyMedia"],
  "context_updated": true
}
```

#### 📱 `/api/webhook/whatsapp` - Webhook WhatsApp
```typescript
POST /api/webhook/whatsapp
{
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "5511999999999",
          "text": { "body": "Olá" },
          "timestamp": "1640995200"
        }]
      }
    }]
  }]
}
```

#### 🏠 `/api/properties` - Propriedades
```typescript
// Criar propriedade
POST /api/properties
{
  "name": "Casa na Praia",
  "type": "house",
  "bedrooms": 3,
  "bathrooms": 2,
  "basePrice": 500,
  "address": { ... },
  "amenities": ["pool", "wifi"]
}

// Buscar propriedades
GET /api/properties?type=apartment&city=Rio&maxPrice=800

// Atualizar propriedade
PUT /api/properties/123
{
  "name": "Casa na Praia - Renovada",
  "status": "active"
}
```

#### 📅 `/api/reservations` - Reservas
```typescript
// Criar reserva
POST /api/reservations
{
  "propertyId": "prop_123",
  "clientPhone": "+5511999999999",
  "checkIn": "2024-02-15",
  "checkOut": "2024-02-18",
  "guests": 4,
  "totalAmount": 1200
}

// Listar reservas
GET /api/reservations?status=confirmed&startDate=2024-02-01
```

#### 📊 `/api/analytics` - Analytics
```typescript
// Métricas gerais
GET /api/analytics/overview?period=month

Response: {
  "totalRevenue": 125000,
  "totalReservations": 156,
  "occupancyRate": 0.78,
  "averageRating": 4.6,
  "trends": { ... }
}

// Performance de propriedades
GET /api/analytics/properties?sortBy=revenue

// Dados para gráficos
GET /api/analytics/charts/revenue?period=6months
```

## 📊 Modelos de Dados

### 🏠 Property (Propriedade)
```typescript
interface Property {
  id: string;
  name: string;
  type: 'apartment' | 'house' | 'villa' | 'studio';
  description: string;
  
  // Localização
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  coordinates: {
    lat: number;
    lng: number;
  };
  
  // Especificações
  bedrooms: number;
  bathrooms: number;
  capacity: number;  // máximo de hóspedes
  area: number;      // em m²
  
  // Comodidades
  amenities: string[];
  
  // Mídia
  photos: MediaFile[];
  videos: MediaFile[];
  
  // Precificação
  basePrice: number;           // preço base por noite
  weekendMultiplier: number;   // multiplicador fim de semana
  holidayMultiplier: number;   // multiplicador feriado
  minimumStay: number;         // estadia mínima em noites
  cleaningFee: number;         // taxa de limpeza
  securityDeposit: number;     // depósito de segurança
  
  // Regras e Políticas
  rules: string[];
  checkInTime: string;    // ex: "14:00"
  checkOutTime: string;   // ex: "11:00"
  
  // Status e Meta
  status: 'active' | 'inactive' | 'maintenance';
  availability: AvailabilityPeriod[];
  createdAt: Date;
  updatedAt: Date;
}

interface MediaFile {
  url: string;
  caption?: string;
  order: number;
  type: 'photo' | 'video';
}

interface AvailabilityPeriod {
  startDate: Date;
  endDate: Date;
  available: boolean;
  specialPrice?: number;  // preço especial para o período
}
```

### 📅 Reservation (Reserva)
```typescript
interface Reservation {
  id: string;
  
  // Propriedade
  propertyId: string;
  propertyName: string;
  
  // Cliente
  clientPhone: string;
  clientName: string;
  clientEmail?: string;
  
  // Período
  checkIn: Date;
  checkOut: Date;
  nights: number;
  guests: number;
  
  // Financeiro
  baseAmount: number;      // valor base
  cleaningFee: number;     // taxa de limpeza
  securityDeposit: number; // depósito
  totalAmount: number;     // valor total
  
  // Status
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'overdue' | 'refunded';
  
  // Origem
  source: 'whatsapp_ai' | 'manual' | 'website' | 'partner';
  
  // Meta
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 💬 Conversation (Conversa)
```typescript
interface Conversation {
  id: string;
  clientPhone: string;
  
  // Estado da conversa
  status: 'active' | 'closed' | 'transferred';
  lastMessage: Date;
  messageCount: number;
  
  // Contexto da IA
  context: {
    searchFilters: PropertyFilters;
    interestedProperties: string[];
    currentStep: ConversationStep;
    clientPreferences: ClientPreferences;
    pendingActions: string[];
  };
  
  // Analytics
  sentiment: 'positive' | 'neutral' | 'negative';
  satisfaction?: number;  // 1-5
  conversionStatus: 'lead' | 'qualified' | 'converted' | 'lost';
  
  createdAt: Date;
  updatedAt: Date;
}

interface Message {
  id: string;
  conversationId: string;
  
  // Conteúdo
  content: string;
  type: 'text' | 'image' | 'video' | 'document' | 'location';
  sender: 'client' | 'ai' | 'human';
  
  // WhatsApp
  whatsappMessageId?: string;
  mediaUrl?: string;
  
  // IA Context
  aiResponse?: {
    model: string;
    processingTime: number;
    functionsCalled: string[];
    confidence: number;
  };
  
  timestamp: Date;
}
```

### 👤 Client (Cliente)
```typescript
interface Client {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  
  // Preferências
  preferences: {
    propertyType: string[];
    priceRange: { min: number; max: number };
    locations: string[];
    amenities: string[];
    communicationStyle: 'formal' | 'casual';
  };
  
  // Histórico
  conversationHistory: string[];  // IDs das conversas
  reservationHistory: string[];   // IDs das reservas
  
  // Analytics
  totalSpent: number;
  averageStay: number;
  lastInteraction: Date;
  lifetimeValue: number;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### 🔧 PricingRule (Regra de Preço)
```typescript
interface PricingRule {
  id: string;
  propertyId: string;
  
  // Condições
  name: string;
  startDate: Date;
  endDate: Date;
  daysOfWeek?: number[];  // 0-6, domingo-sábado
  
  // Modificadores
  multiplier?: number;    // ex: 1.5 para +50%
  fixedPrice?: number;    // preço fixo
  discount?: number;      // desconto em %
  
  // Meta
  priority: number;       // para resolver conflitos
  active: boolean;
  createdAt: Date;
}
```

### 📈 Analytics (Métricas)
```typescript
interface AnalyticsData {
  // Período
  startDate: Date;
  endDate: Date;
  
  // Métricas Financeiras
  revenue: {
    total: number;
    byProperty: Record<string, number>;
    byMonth: Record<string, number>;
    growth: number;  // % vs período anterior
  };
  
  // Métricas Operacionais
  occupancy: {
    overall: number;
    byProperty: Record<string, number>;
    trend: number[];
  };
  
  // Métricas de Conversão
  conversion: {
    leadToBooking: number;
    whatsappEffectiveness: number;
    averageResponseTime: number;
  };
  
  // Satisfação
  satisfaction: {
    averageRating: number;
    reviewCount: number;
    nps: number;
  };
}
```

## 📚 Estrutura de Arquivos

```
locai/
├── 📁 app/                          # Next.js 14 App Router
│   ├── 📁 api/                      # API Routes
│   │   ├── agent/route.ts           # Agente IA principal
│   │   ├── webhook/whatsapp/route.ts # Webhook WhatsApp
│   │   ├── properties/route.ts      # CRUD propriedades
│   │   ├── reservations/route.ts    # CRUD reservas
│   │   └── analytics/route.ts       # Métricas e dados
│   │
│   ├── 📁 dashboard/                # Área administrativa
│   │   ├── page.tsx                 # Dashboard principal
│   │   ├── 📁 properties/           # Gestão de propriedades
│   │   │   ├── page.tsx            # Listagem
│   │   │   ├── create/page.tsx     # Criação
│   │   │   └── [id]/edit/page.tsx  # Edição
│   │   ├── reservations/page.tsx    # Gestão de reservas
│   │   ├── analytics/page.tsx       # Analytics enterprise
│   │   └── settings/page.tsx        # Configurações
│   │
│   ├── globals.css                  # Estilos globais
│   ├── layout.tsx                   # Layout raiz
│   └── page.tsx                     # Homepage
│
├── 📁 components/                   # Atomic Design Components
│   ├── 📁 atoms/                   # Elementos básicos (17 componentes)
│   │   ├── AIConfidenceIndicator/
│   │   ├── AIPersonality/
│   │   ├── AutomationTrigger/
│   │   ├── Button/
│   │   ├── Chip/
│   │   ├── ClientScore/
│   │   ├── ConversationStatus/
│   │   ├── CurrencyDisplay/
│   │   ├── DateDisplay/
│   │   ├── Icon/
│   │   ├── Input/
│   │   ├── MessageType/
│   │   ├── OccupancyIndicator/
│   │   ├── PaymentMethodIcon/
│   │   ├── QuickActionButton/
│   │   ├── StatusChip/
│   │   └── Typography/
│   │
│   ├── 📁 molecules/               # Combinações funcionais
│   │   ├── 📁 cards/               # Cartões
│   │   │   ├── MediaCard/
│   │   │   └── FinancialSummaryCard/
│   │   ├── 📁 forms/               # Campos de formulário
│   │   │   ├── CheckboxField/
│   │   │   ├── FormField/
│   │   │   └── SelectField/
│   │   ├── 📁 navigation/          # Navegação
│   │   │   ├── StepperNavigation/
│   │   │   └── QuickActions/
│   │   ├── 📁 profiles/            # Perfis
│   │   │   └── ClientProfile/
│   │   └── 📁 summaries/           # Resumos
│   │       └── ConversationSummary/
│   │
│   ├── 📁 organisms/               # Seções complexas
│   │   ├── 📁 ai/                  # IA
│   │   │   └── AIAgent/
│   │   ├── 📁 calendars/           # Calendários
│   │   │   ├── AvailabilityCalendar/
│   │   │   └── PricingCalendar/
│   │   ├── 📁 dashboards/          # Dashboards
│   │   │   ├── AnalyticsDashboard/
│   │   │   └── AudioPreferences/
│   │   ├── 📁 financial/           # Financeiro
│   │   │   ├── TransactionTimeline/
│   │   │   └── PricingSurcharges/
│   │   ├── 📁 goals/               # Metas
│   │   │   ├── GoalCard/
│   │   │   ├── CreateGoalDialog/
│   │   │   ├── GoalDetailsDialog/
│   │   │   └── AddCheckpointDialog/
│   │   ├── 📁 navigation/          # Navegação principal
│   │   │   ├── Header/
│   │   │   └── Sidebar/
│   │   └── 📁 property/            # Propriedades
│   │       ├── PropertyAmenities/
│   │       ├── PropertyBasicInfo/
│   │       ├── PropertyMediaUpload/
│   │       ├── PropertyPricing/
│   │       └── PropertySpecs/
│   │
│   ├── 📁 templates/               # Templates de página
│   │   └── 📁 dashboards/
│   │       ├── AdvancedAnalytics/
│   │       ├── SimpleFinancialDashboard/
│   │       └── FinancialGoals/
│   │
│   └── 📁 utilities/               # Componentes utilitários
│       └── ProtectedRoute/
│
├── 📁 lib/                         # Utilitários e Serviços
│   ├── 📁 ai/                      # Sistema de IA
│   │   ├── response-generator.ts   # Gerador de respostas
│   │   ├── agent-functions.ts      # Funções do agente
│   │   └── conversation-context.ts # Contexto das conversas
│   │
│   ├── 📁 firebase/                # Integração Firebase
│   │   ├── firestore.ts           # Serviço Firestore
│   │   ├── storage.ts             # Firebase Storage
│   │   └── admin.ts               # Admin SDK
│   │
│   ├── 📁 whatsapp/               # Integração WhatsApp
│   │   ├── message-handler.ts     # Processador de mensagens
│   │   ├── api-client.ts          # Cliente da API
│   │   └── webhook-validator.ts    # Validação de webhooks
│   │
│   ├── 📁 services/               # Serviços de negócio
│   │   ├── property.ts            # Serviço de propriedades
│   │   ├── reservation.ts         # Serviço de reservas
│   │   ├── pricing.ts             # Engine de precificação
│   │   ├── conversation.ts        # Serviço de conversas
│   │   └── analytics.ts           # Serviço de analytics
│   │
│   ├── 📁 utils/                  # Utilitários
│   │   ├── errors.ts              # Tratamento de erros
│   │   ├── validation.ts          # Validações
│   │   ├── async.ts               # Operações assíncronas
│   │   ├── dates.ts               # Manipulação de datas
│   │   └── formatting.ts          # Formatação de dados
│   │
│   └── types.ts                   # Definições TypeScript
│
├── 📁 public/                     # Arquivos estáticos
│   ├── images/
│   ├── icons/
│   └── ...
│
├── 📁 theme/                      # Configuração do tema
│   ├── theme.ts                   # Tema Material-UI
│   └── colors.ts                  # Paleta de cores
│
├── .env.local                     # Variáveis de ambiente
├── .env.example                   # Exemplo de configuração
├── next.config.js                 # Configuração Next.js
├── package.json                   # Dependências
├── tsconfig.json                  # Configuração TypeScript
├── CLAUDE.md                      # Documentação para IA
└── README.md                      # Este arquivo
```

### 🎯 Principais Diretórios

#### `lib/` - Lógica de Negócio
- **`ai/`**: Sistema completo de IA com GPT-4
- **`firebase/`**: Integração com banco e storage
- **`whatsapp/`**: API e webhook do WhatsApp
- **`services/`**: Camada de serviços de negócio
- **`utils/`**: Utilitários e helpers

#### `components/` - Atomic Design (Estrutura Atualizada)
- **`atoms/`**: 17 componentes básicos reutilizáveis
- **`molecules/`**: Componentes intermediários organizados por categoria
  - `cards/`: Cartões de informação
  - `forms/`: Campos de formulário
  - `navigation/`: Elementos de navegação
  - `profiles/`: Componentes de perfil
  - `summaries/`: Resumos e sínteses
- **`organisms/`**: Seções complexas organizadas por domínio
  - `ai/`: Componentes de inteligência artificial
  - `calendars/`: Calendários especializados
  - `dashboards/`: Componentes de dashboard
  - `financial/`: Elementos financeiros
  - `goals/`: Gestão de metas
  - `navigation/`: Navegação principal (Header/Sidebar)
  - `property/`: Componentes de propriedades
- **`templates/`**: Templates de páginas completas
  - `dashboards/`: Templates de dashboards específicos
- **`utilities/`**: Componentes não-UI (HOCs, guards, etc.)

#### `app/` - Next.js App Router
- **`api/`**: Endpoints REST da aplicação
- **`dashboard/`**: Interface administrativa completa

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Conta Firebase
- Conta OpenAI
- WhatsApp Business API (Meta)

### 1. Instalação
```bash
# Clone o repositório
git clone https://github.com/seu-usuario/locai.git
cd locai

# Instale as dependências
npm install
```

### 2. Configuração
```bash
# Copie o arquivo de exemplo
cp .env .env.local

# Edite as variáveis de ambiente
nano .env.local
```

### 3. Configuração do Firebase
1. Crie um projeto no [Firebase Console](https://console.firebase.google.com)
2. Ative Firestore e Storage
3. Gere uma chave de serviço
4. Configure as variáveis no `.env.local`

### 4. Configuração do WhatsApp
1. Acesse o dashboard em `/dashboard/settings`
2. Siga o guia de configuração passo a passo
3. Configure o webhook apontando para `/api/webhook/whatsapp`

### 5. Execução
```bash
# Modo desenvolvimento
npm run dev

# Build para produção
npm run build
npm start
```

## ⚙️ Configuração

### Variáveis de Ambiente
```env
# Firebase
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@seu-projeto.iam.gserviceaccount.com

# OpenAI
OPENAI_API_KEY=sk-...

# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_ACCESS_TOKEN=EAAxxxxx
WHATSAPP_VERIFY_TOKEN=seu-verify-token

# Aplicação
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
```

### Configuração Visual

#### WhatsApp (`/dashboard/settings`)
- **Tab WhatsApp**: Configure credenciais da API
- **Guia Passo-a-Passo**: Setup completo com validação
- **Teste de Conexão**: Verificação automática

#### Empresa (`/dashboard/settings`)
- **Upload de Logo**: Drag & drop com preview
- **Informações**: Nome, endereço, contatos
- **Branding**: Personalização visual

#### Assistente IA (`/dashboard/settings`)
- **Personalidade**: 3 estilos (Formal, Amigável, Casual)
- **Prompts Customizados**: Instruções específicas
- **Mensagens**: Boas-vindas e indisponibilidade
- **Preview**: Visualização em tempo real

## 🔧 Tecnologias

### Frontend
- **Next.js 14**: Framework React com App Router
- **TypeScript**: Tipagem estática
- **Material-UI v5**: Componentes e design system
- **Emotion**: CSS-in-JS
- **Recharts**: Gráficos e visualizações
- **React Hook Form**: Formulários otimizados
- **Yup**: Validação de schemas
- **date-fns**: Manipulação de datas

### Backend
- **Next.js API Routes**: Endpoints REST
- **Firebase Firestore**: Banco NoSQL
- **Firebase Storage**: Armazenamento de arquivos
- **Firebase Admin SDK**: Operações server-side

### IA e Integração
- **OpenAI GPT-4**: Processamento de linguagem natural
- **Function Calling**: Execução de funções específicas
- **WhatsApp Business API**: Mensageria
- **Webhooks**: Comunicação em tempo real

### Ferramentas de Desenvolvimento
- **ESLint**: Linting de código
- **Prettier**: Formatação automática
- **Husky**: Git hooks
- **Conventional Commits**: Padrão de commits

### Deploy e Monitoramento
- **Vercel**: Deploy e hosting
- **Firebase Functions**: Processamento serverless
- **OpenTelemetry**: Observabilidade (opcional)

## 📈 Próximos Passos

### Funcionalidades Planejadas
- [ ] Sistema de pagamentos integrado (Stripe/PagSeguro)
- [ ] Notificações push
- [ ] App mobile (React Native)
- [ ] Multi-tenancy completo
- [ ] Integração com Airbnb/Booking.com
- [ ] Sistema de avaliações
- [ ] Chat humano de backup
- [ ] Relatórios avançados
- [ ] API pública para parceiros

### Melhorias Técnicas
- [ ] Testes automatizados (Jest + Testing Library)
- [ ] CI/CD com GitHub Actions
- [ ] Monitoramento com Sentry
- [ ] Cache com Redis
- [ ] CDN para imagens
- [ ] PWA (Progressive Web App)

---

## 📞 Suporte

Para dúvidas, sugestões ou problemas:

- **Email**: suporte@locai.com.br
- **GitHub Issues**: [Reportar problemas](https://github.com/seu-usuario/locai/issues)
- **Documentação**: [Wiki do projeto](https://github.com/seu-usuario/locai/wiki)

---

**LocAI** - Transformando a gestão imobiliária com inteligência artificial 🚀