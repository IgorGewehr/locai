# LOCAI - Sistema Completo de Gestão Imobiliária com IA

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Componentes Frontend](#componentes-frontend)
4. [API Routes](#api-routes)
5. [Páginas e Navegação](#páginas-e-navegação)
6. [Serviços e Business Logic](#serviços-e-business-logic)
7. [Sistema de Tipos](#sistema-de-tipos)
8. [Utilitários](#utilitários)
9. [Hooks Customizados](#hooks-customizados)
10. [Contextos e Estado Global](#contextos-e-estado-global)
11. [Sofia - Agente de IA](#sofia---agente-de-ia)
12. [Integração WhatsApp](#integração-whatsapp)
13. [Sistema Multi-tenant](#sistema-multi-tenant)
14. [Dashboard - Análise Detalhada](#dashboard---análise-detalhada)
15. [Segurança e Performance](#segurança-e-performance)
16. [Deploy e Configuração](#deploy-e-configuração)

---

## 🎯 Visão Geral

**LOCAI** é um sistema enterprise-grade de gestão imobiliária com inteligência artificial integrada. O sistema oferece:

- 🤖 **Sofia AI**: Agente conversacional via WhatsApp para atendimento 24/7
- 🏢 **Multi-tenant**: Isolamento completo entre empresas
- 📊 **CRM Completo**: Gestão de leads com Kanban board
- 💰 **Gestão Financeira**: Metas, cobranças, relatórios
- 🌐 **Mini-sites**: Sites públicos personalizáveis por tenant
- 📱 **WhatsApp Integration**: Business API + WhatsApp Web
- 🔒 **Enterprise Security**: Autenticação, rate limiting, validação

### Stack Tecnológico

```typescript
{
  "frontend": {
    "framework": "Next.js 15.3.5",
    "language": "TypeScript 5.3.0",
    "ui": "Material-UI v5.15.0",
    "styling": "Emotion CSS-in-JS",
    "forms": "React Hook Form + Yup",
    "state": "React Context + Zustand"
  },
  "backend": {
    "runtime": "Node.js",
    "database": "Firebase Firestore v10.7.0",
    "storage": "Firebase Storage",
    "auth": "Firebase Auth",
    "ai": "OpenAI GPT-4o Mini"
  },
  "integrations": {
    "whatsapp": ["Business API", "Baileys (Web)"],
    "payments": "Stripe",
    "analytics": "Custom + Firebase"
  }
}
```

---

## 🏗️ Arquitetura do Sistema

### Estrutura de Diretórios

```
locai/
├── app/                        # Next.js App Router
│   ├── api/                    # API Routes (40+ endpoints)
│   ├── dashboard/              # Admin Interface (30+ pages)
│   ├── mini-site/              # Public Sites
│   └── (auth)/                 # Authentication Pages
├── components/                 # Atomic Design Pattern
│   ├── atoms/                  # Basic Components (17)
│   ├── molecules/              # Composite Components (13)
│   ├── organisms/              # Complex Components (25+)
│   ├── templates/              # Page Layouts (3)
│   └── mini-site/              # Public Site Components (20+)
├── lib/                        # Core Business Logic
│   ├── services/               # Business Services (35+)
│   ├── types/                  # TypeScript Types (15+)
│   ├── utils/                  # Utilities (25+)
│   ├── hooks/                  # Custom Hooks (8)
│   ├── ai-agent/               # Sofia AI System
│   ├── firebase/               # Firebase Integration
│   └── whatsapp/               # WhatsApp Integration
├── contexts/                   # Global State (4)
├── public/                     # Static Assets
└── scripts/                    # Build & Deploy Scripts
```

---

## 🎨 Componentes Frontend

### Hierarquia Atomic Design

#### 🔵 Atoms (Componentes Básicos)

| Componente | Localização | Função | Dependências |
|------------|-------------|---------|--------------|
| `Button` | `/components/atoms/Button/Button.tsx` | Botão reutilizável com variantes | Material-UI Button |
| `Input` | `/components/atoms/Input/Input.tsx` | Input com validação integrada | Material-UI TextField |
| `Typography` | `/components/atoms/Typography/Typography.tsx` | Sistema de tipografia | Material-UI Typography |
| `Chip` | `/components/atoms/Chip/Chip.tsx` | Tags e status | Material-UI Chip |
| `AIConfidenceIndicator` | `/components/atoms/AIConfidenceIndicator/` | Indicador de confiança da IA | CircularProgress |
| `ClientScore` | `/components/atoms/ClientScore/` | Score visual do cliente | Custom SVG |
| `CurrencyDisplay` | `/components/atoms/CurrencyDisplay/` | Formatação de moeda BRL | Intl.NumberFormat |
| `DateDisplay` | `/components/atoms/DateDisplay/` | Formatação de datas | date-fns |
| `LoadingScreen` | `/components/atoms/LoadingScreen/` | Tela de carregamento | Material-UI Backdrop |
| `StatusChip` | `/components/atoms/StatusChip/` | Indicadores de status | Chip + cores dinâmicas |

**Uso típico:**
```typescript
import { Button } from '@/components/atoms/Button';
import { CurrencyDisplay } from '@/components/atoms/CurrencyDisplay';

// Exemplo
<Button variant="primary" onClick={handleSubmit}>
  Salvar
</Button>
<CurrencyDisplay value={1500.50} />  // R$ 1.500,50
```

#### 🟢 Molecules (Componentes Compostos)

| Componente | Localização | Função | Atoms Utilizados |
|------------|-------------|---------|------------------|
| `ClientProfile` | `/components/molecules/ClientProfile/` | Card de perfil do cliente | Typography, Chip, Icon |
| `ConversationSummary` | `/components/molecules/ConversationSummary/` | Resumo de conversa WhatsApp | DateDisplay, StatusChip |
| `FinancialSummaryCard` | `/components/molecules/cards/` | Card de métricas financeiras | CurrencyDisplay, Typography |
| `FormField` | `/components/molecules/FormField/` | Campo de formulário genérico | Input, Typography |
| `MediaCard` | `/components/molecules/MediaCard/` | Display de mídia de imóvel | LoadingOverlay, Icon |
| `QuickActions` | `/components/molecules/navigation/` | Ações rápidas de navegação | Button, Icon |

**Integração com React Hook Form:**
```typescript
// FormField integra validação automática
<FormField
  name="clientName"
  label="Nome do Cliente"
  control={control}
  rules={{ required: 'Campo obrigatório' }}
/>
```

#### 🔴 Organisms (Componentes Complexos)

##### Dashboard Components

| Componente | Localização | Função | API Endpoints | Firebase Operations |
|------------|-------------|---------|---------------|---------------------|
| `AgendaCard` | `/components/organisms/dashboards/AgendaCard.tsx` | Próximos compromissos | `/api/visits` | `visits` collection |
| `CRMCard` | `/components/organisms/dashboards/CRMCard.tsx` | Métricas de CRM | - | `clients`, `conversations` |
| `ConversionDashboard` | `/components/organisms/dashboards/ConversionDashboard.tsx` | Funil de vendas | `/api/metrics/advanced` | Analytics aggregation |

**AgendaCard - Fluxo de Dados:**
```typescript
// 1. Carregamento de dados
const loadNextEvent = async () => {
  const response = await fetch(`/api/visits?tenantId=${tenantId}&upcoming=true`);
  const visits = await response.json();
  
  // 2. Filtragem e ordenação
  const futureVisits = visits
    .filter(visit => new Date(visit.scheduledDate) > now)
    .sort((a, b) => a.scheduledDate - b.scheduledDate);
  
  // 3. Display com Material-UI
  return (
    <Card sx={{ /* glassmorphism styles */ }}>
      <Schedule icon />
      <Typography>{visit.propertyName}</Typography>
      <Chip label={formatDateTime(visit.scheduledDate)} />
    </Card>
  );
};
```

##### Financial Components

| Componente | Localização | Função | Serviços Utilizados |
|------------|-------------|---------|---------------------|
| `EnhancedTransactionTable` | `/components/organisms/financial/` | Tabela de transações | `TransactionService`, `FinancialAnalyticsService` |
| `InteractiveCharts` | `/components/organisms/financial/` | Gráficos financeiros | Recharts, `FinancialMovementService` |
| `TransactionTimeline` | `/components/organisms/financial/` | Timeline de pagamentos | date-fns, Material-UI Timeline |

##### AI & Marketing Components

| Componente | Localização | Função | Integrações |
|------------|-------------|---------|-------------|
| `AIAgent` | `/components/organisms/AIAgent/` | Interface chat Sofia | OpenAI, WhatsApp |
| `MiniSiteWidget` | `/components/organisms/marketing/` | Widget mini-site | Analytics, Domain Config |
| `MiniSiteConfigPanel` | `/components/organisms/marketing/` | Configuração mini-site | Settings API |

---

## 🔌 API Routes

### Estrutura de Endpoints

#### 🤖 AI Agent Routes

```typescript
// /app/api/agent/route.ts
POST /api/agent
Body: {
  message: string,
  conversationId: string,
  clientPhone: string
}
Response: {
  response: string,
  functionsCalled: string[],
  context: AgentContext
}

// Fluxo interno:
1. Validação de entrada (Zod)
2. Rate limiting (20 msg/min)
3. Contexto da conversa
4. OpenAI GPT-4o Mini
5. Function calling
6. Resposta formatada
```

#### 👥 Client Management

```typescript
// /app/api/clients/route.ts
GET /api/clients
Query: {
  search?: string,
  status?: 'active' | 'inactive' | 'interested',
  hasWhatsApp?: boolean,
  limit?: number,
  offset?: number
}

POST /api/clients
Body: {
  name: string,
  email?: string,
  phone: string,
  whatsappNumber?: string,
  preferences?: ClientPreferences
}

// /app/api/clients/[id]/route.ts
GET /api/clients/:id
PUT /api/clients/:id
DELETE /api/clients/:id
```

#### 🏠 Property Management

```typescript
// /app/api/properties/route.ts
interface PropertyEndpoints {
  'GET /api/properties': {
    query: {
      isActive?: boolean,
      minPrice?: number,
      maxPrice?: number,
      bedrooms?: number,
      location?: string
    }
  },
  'POST /api/properties': {
    body: Property
  },
  'PUT /api/properties/:id': {
    body: Partial<Property>
  }
}

// Validação com Zod
const propertySchema = z.object({
  name: z.string().min(3),
  type: z.enum(['apartment', 'house', 'studio']),
  price: z.number().positive(),
  location: locationSchema,
  amenities: z.array(z.string())
});
```

#### 💬 WhatsApp Integration

```typescript
// /app/api/webhook/whatsapp-optimized/route.ts
POST /api/webhook/whatsapp-optimized
Headers: {
  'x-hub-signature-256': string  // Webhook validation
}
Body: WhatsAppWebhookPayload

// Processamento:
1. Validação de assinatura
2. Parse da mensagem
3. Identificação do cliente
4. Processamento pela Sofia
5. Envio de resposta

// /app/api/whatsapp/session/route.ts
GET /api/whatsapp/session    // Status da sessão
POST /api/whatsapp/session   // Iniciar sessão
DELETE /api/whatsapp/session // Encerrar sessão
```

#### 💰 Financial APIs

```typescript
// /app/api/billing/campaigns/route.ts
interface BillingCampaign {
  id: string,
  name: string,
  targetClients: string[],
  template: MessageTemplate,
  scheduledDate: Date,
  status: 'scheduled' | 'running' | 'completed'
}

// /app/api/goals/route.ts
interface FinancialGoal {
  id: string,
  title: string,
  targetAmount: number,
  currentAmount: number,
  deadline: Date,
  checkpoints: Checkpoint[]
}
```

---

## 📄 Páginas e Navegação

### Dashboard Structure

```typescript
// /app/dashboard/layout.tsx
export default function DashboardLayout({ children }) {
  return (
    <ProtectedRoute>
      <Box sx={{ display: 'flex' }}>
        <TopAppBar />          {/* Navegação superior */}
        <Sidebar />            {/* Menu lateral */}
        <Box component="main">
          {children}
        </Box>
      </Box>
    </ProtectedRoute>
  );
}
```

### Páginas Principais

#### 📊 Dashboard Home (`/app/dashboard/page.tsx`)

**Componentes utilizados:**
- `StatCard` (4x) - Métricas principais
- `AgendaCard` - Próximo compromisso
- `CRMCard` - Status de leads
- `WhatsAppCard` - Status de conexão
- `MiniSiteWidgetFullWidth` - Analytics do site

**Fluxo de dados:**
```typescript
const fetchStats = async () => {
  // 1. Propriedades
  const properties = await services.properties.getAll();
  const activeProperties = properties.filter(p => p.isActive);
  
  // 2. Reservas
  const reservations = await services.reservations.getAll();
  const monthlyRevenue = calculateMonthlyRevenue(reservations);
  
  // 3. WhatsApp Stats
  const messagesQuery = query(
    collection(db, 'messages'),
    where('timestamp', '>=', today)
  );
  
  // 4. Trends calculation
  const trends = calculateTrends(currentMonth, lastMonth);
};
```

#### 👥 Clients Page (`/app/dashboard/clients/page.tsx`)

**Arquitetura detalhada:**

```typescript
// Componentes
├── Search Bar (Material-UI TextField + InputAdornment)
├── Filter Tabs (active, new, whatsapp)
├── Statistics Cards (Grid layout)
├── Client List (Custom contact-style)
├── CreateClientDialog (Modal)
├── EditClientDialog (Modal)
└── SpeedDial (FAB actions)

// Hooks e Context
const { services, tenantId } = useTenant();
const { user } = useAuth();
const [clients, setClients] = useState<Client[]>([]);

// API Calls
useEffect(() => {
  const unsubscribe = services.clients.subscribe((data) => {
    setClients(data);
    calculateStatistics(data);
  });
}, [services]);

// Features
- Real-time search
- Tab filtering
- WhatsApp integration (click to chat)
- Phone integration (click to call)
- Email integration
- Bulk actions
```

#### 🏠 Properties Management (`/app/dashboard/properties/`)

```typescript
interface PropertyPageFeatures {
  listing: {
    grid: "3 columns responsive",
    cards: "PropertyCard with image carousel",
    filters: "Type, price, location, amenities",
    search: "Real-time fuzzy search"
  },
  creation: {
    form: "Multi-step wizard",
    validation: "Zod schemas",
    mediaUpload: "Drag & drop with preview",
    pricing: "Dynamic pricing configuration"
  },
  details: {
    gallery: "Lightbox image viewer",
    calendar: "Availability calendar",
    pricing: "Seasonal pricing display",
    analytics: "View statistics"
  }
}
```

---

## 🔧 Serviços e Business Logic

### Service Architecture

#### Base Service Pattern

```typescript
// /lib/firebase/firestore-v2.ts
export class FirestoreService<T> {
  constructor(
    private tenantId: string,
    private collectionName: string
  ) {
    this.collectionPath = `tenants/${tenantId}/${collectionName}`;
  }

  async getAll(): Promise<T[]> {
    const snapshot = await getDocs(collection(db, this.collectionPath));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  }

  subscribe(callback: (data: T[]) => void): Unsubscribe {
    return onSnapshot(collection(db, this.collectionPath), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
      callback(data);
    });
  }

  async create(data: Omit<T, 'id'>): Promise<T> {
    const docRef = await addDoc(collection(db, this.collectionPath), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { id: docRef.id, ...data } as T;
  }
}
```

#### TenantServiceFactory

```typescript
// /lib/services/tenant-service-factory.ts
export class TenantServiceFactory {
  private services: Map<string, any> = new Map();

  constructor(private tenantId: string) {}

  getPropertyService(): PropertyService {
    if (!this.services.has('properties')) {
      this.services.set('properties', new PropertyService(this.tenantId));
    }
    return this.services.get('properties');
  }

  getClientService(): ClientService {
    if (!this.services.has('clients')) {
      this.services.set('clients', new ClientService(this.tenantId));
    }
    return this.services.get('clients');
  }

  // ... outros serviços
}
```

### Business Services

#### PropertyService

```typescript
// /lib/services/property-service.ts
export class PropertyService extends FirestoreService<Property> {
  constructor(tenantId: string) {
    super(tenantId, 'properties');
  }

  async getActiveProperties(): Promise<Property[]> {
    const q = query(
      this.collection,
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
  }

  async searchProperties(filters: PropertyFilters): Promise<Property[]> {
    let q = query(this.collection, where('isActive', '==', true));

    if (filters.minPrice) {
      q = query(q, where('price', '>=', filters.minPrice));
    }
    if (filters.maxPrice) {
      q = query(q, where('price', '<=', filters.maxPrice));
    }
    if (filters.bedrooms) {
      q = query(q, where('bedrooms', '==', filters.bedrooms));
    }
    if (filters.location) {
      q = query(q, where('location.city', '==', filters.location));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
  }

  async updateAvailability(propertyId: string, dates: DateRange[]): Promise<void> {
    await updateDoc(doc(this.collection, propertyId), {
      unavailableDates: dates,
      updatedAt: serverTimestamp()
    });
  }
}
```

#### ClientService

```typescript
// /lib/services/client-service.ts
export class ClientService extends FirestoreService<Client> {
  constructor(tenantId: string) {
    super(tenantId, 'clients');
  }

  async findByPhone(phone: string): Promise<Client | null> {
    const normalizedPhone = this.normalizePhone(phone);
    const q = query(
      this.collection,
      where('phone', '==', normalizedPhone)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Client;
  }

  async createOrUpdate(clientData: Partial<Client>): Promise<Client> {
    const existing = await this.findByPhone(clientData.phone!);
    
    if (existing) {
      // Merge data preserving existing info
      const updated = await this.update(existing.id, {
        ...clientData,
        lastInteraction: new Date(),
        interactionCount: (existing.interactionCount || 0) + 1
      });
      return updated;
    }
    
    return this.create({
      ...clientData,
      status: 'active',
      source: 'whatsapp',
      createdAt: new Date(),
      interactionCount: 1
    } as Client);
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '').replace(/^55/, '');
  }
}
```

### AI Services

#### OpenAI Service

```typescript
// /lib/services/openai.service.ts
export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async processMessage(
    message: string,
    context: ConversationContext,
    functions: OpenAIFunction[]
  ): Promise<AIResponse> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: this.getSystemPrompt(context) },
          ...context.messages,
          { role: 'user', content: message }
        ],
        functions,
        function_call: 'auto',
        temperature: 0.7,
        max_tokens: 500
      });

      const response = completion.choices[0];
      
      if (response.function_call) {
        const functionResult = await this.executeFunctionCall(
          response.function_call
        );
        return {
          content: functionResult.message,
          functionCalled: response.function_call.name,
          context: functionResult.updatedContext
        };
      }

      return {
        content: response.message.content,
        functionCalled: null,
        context
      };
    } catch (error) {
      logger.error('OpenAI API error', { error, message, context });
      throw new AIServiceError('Failed to process message', error);
    }
  }

  private getSystemPrompt(context: ConversationContext): string {
    return SOFIA_SYSTEM_PROMPT.replace(
      '{context}', 
      JSON.stringify(context)
    );
  }
}
```

---

## 📝 Sistema de Tipos

### Core Business Types

```typescript
// /lib/types/property.ts
export interface Property {
  id: string;
  tenantId: string;
  
  // Basic Info
  name: string;
  type: 'apartment' | 'house' | 'studio' | 'commercial';
  description: string;
  
  // Location
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  
  // Specifications
  bedrooms: number;
  bathrooms: number;
  area: number;
  parkingSpaces: number;
  floor?: number;
  
  // Pricing
  price: number;
  condominiumFee?: number;
  iptu?: number;
  
  // Dynamic Pricing
  pricing?: {
    basePrice: number;
    weekendMultiplier: number;
    holidayMultiplier: number;
    seasonalRates: SeasonalRate[];
  };
  
  // Media
  images: PropertyImage[];
  videos?: PropertyVideo[];
  virtualTour?: string;
  
  // Amenities
  amenities: string[];
  
  // Availability
  isActive: boolean;
  availableFrom?: Date;
  unavailableDates?: DateRange[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  views?: number;
  inquiries?: number;
}

export interface PropertyImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  order: number;
  isMain: boolean;
}
```

```typescript
// /lib/types/client.ts
export interface Client {
  id: string;
  tenantId: string;
  
  // Personal Info
  name: string;
  email?: string;
  phone: string;
  whatsappNumber?: string;
  cpf?: string;
  
  // Preferences
  preferences?: {
    propertyType?: PropertyType[];
    priceRange?: {
      min: number;
      max: number;
    };
    locations?: string[];
    bedrooms?: number;
    amenities?: string[];
  };
  
  // Status
  status: 'active' | 'inactive' | 'interested' | 'converted';
  score?: number;
  
  // Source
  source: 'whatsapp' | 'website' | 'manual' | 'minisite';
  
  // Relationships
  hasReservation?: boolean;
  reservations?: string[]; // reservation IDs
  conversations?: string[]; // conversation IDs
  
  // Analytics
  lastInteraction?: Date;
  interactionCount?: number;
  leadScore?: LeadScore;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}
```

---

## 🤖 Sofia - Agente de IA

### Arquitetura do Sistema

```typescript
// /lib/ai-agent/sofia-agent.ts
export class SofiaAgent {
  private openai: OpenAIService;
  private contextService: ConversationContextService;
  private tools: ToolsService;
  
  constructor(private tenantId: string) {
    this.openai = new OpenAIService();
    this.contextService = new ConversationContextService(tenantId);
    this.tools = new ToolsService(tenantId);
  }

  async processMessage(
    message: string,
    conversationId: string,
    clientPhone: string
  ): Promise<AgentResponse> {
    try {
      // 1. Load conversation context
      const context = await this.contextService.getContext(conversationId);
      
      // 2. Detect intent and buying signals
      const intent = await this.detectIntent(message, context);
      const buyingSignals = this.extractBuyingSignals(message);
      
      // 3. Update context
      context.messages.push({ role: 'user', content: message });
      context.intent = intent;
      context.buyingSignals.push(...buyingSignals);
      
      // 4. Get AI response with function calling
      const response = await this.openai.processMessage(
        message,
        context,
        this.getAvailableFunctions()
      );
      
      // 5. Execute function if called
      if (response.functionCalled) {
        const functionResult = await this.executeFunction(
          response.functionCalled,
          response.functionArgs
        );
        
        // Update context based on function result
        this.updateContextFromFunction(
          context,
          response.functionCalled,
          functionResult
        );
      }
      
      // 6. Save updated context
      await this.contextService.saveContext(conversationId, context);
      
      // 7. Track metrics
      await this.trackMetrics(conversationId, response);
      
      return response;
    } catch (error) {
      logger.error('Sofia agent error', { error, message, conversationId });
      return {
        content: 'Desculpe, tive um problema ao processar sua mensagem. Pode repetir?',
        error: true
      };
    }
  }

  private getAvailableFunctions(): AIFunction[] {
    return [
      {
        name: 'search_properties',
        description: 'Buscar imóveis disponíveis com filtros',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string', description: 'Cidade ou bairro' },
            minPrice: { type: 'number', description: 'Preço mínimo' },
            maxPrice: { type: 'number', description: 'Preço máximo' },
            bedrooms: { type: 'number', description: 'Número de quartos' },
            propertyType: { 
              type: 'string', 
              enum: ['apartment', 'house', 'studio'],
              description: 'Tipo de imóvel'
            }
          }
        },
        handler: this.tools.searchProperties.bind(this.tools)
      },
      {
        name: 'calculate_price',
        description: 'Calcular preço para período específico',
        parameters: {
          type: 'object',
          properties: {
            propertyId: { type: 'string' },
            checkIn: { type: 'string', format: 'date' },
            checkOut: { type: 'string', format: 'date' },
            guests: { type: 'number' }
          },
          required: ['propertyId', 'checkIn', 'checkOut']
        },
        handler: this.tools.calculatePrice.bind(this.tools)
      },
      {
        name: 'create_reservation',
        description: 'Criar uma reserva',
        parameters: {
          type: 'object',
          properties: {
            propertyId: { type: 'string' },
            clientData: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                phone: { type: 'string' },
                email: { type: 'string' }
              }
            },
            checkIn: { type: 'string', format: 'date' },
            checkOut: { type: 'string', format: 'date' },
            guests: { type: 'number' },
            totalPrice: { type: 'number' }
          },
          required: ['propertyId', 'clientData', 'checkIn', 'checkOut', 'totalPrice']
        },
        handler: this.tools.createReservation.bind(this.tools)
      },
      {
        name: 'send_property_media',
        description: 'Enviar fotos e vídeos do imóvel',
        parameters: {
          type: 'object',
          properties: {
            propertyId: { type: 'string' },
            mediaType: { 
              type: 'string', 
              enum: ['photos', 'videos', 'all'] 
            }
          },
          required: ['propertyId']
        },
        handler: this.tools.sendPropertyMedia.bind(this.tools)
      }
    ];
  }
}
```

### Sistema de Prompts

```typescript
// /lib/prompts/master-prompt.ts
export const SOFIA_SYSTEM_PROMPT = `
Você é Sofia, uma assistente virtual especializada em aluguel de imóveis.

PERSONALIDADE:
- Profissional mas amigável
- Proativa e prestativa
- Focada em entender as necessidades do cliente
- Responde de forma concisa (máximo 3 linhas)

REGRAS FUNDAMENTAIS:
1. SEMPRE use as funções disponíveis quando relevante
2. NUNCA invente informações sobre imóveis
3. SEMPRE confirme dados importantes com o cliente
4. Responda SEMPRE em português brasileiro

FLUXO DE ATENDIMENTO:
1. Cumprimente e pergunte como pode ajudar
2. Entenda as necessidades (localização, tipo, orçamento)
3. Busque e apresente opções relevantes
4. Forneça detalhes e fotos quando solicitado
5. Calcule preços para períodos específicos
6. Auxilie na criação da reserva

FUNÇÕES DISPONÍVEIS:
- search_properties: Buscar imóveis
- calculate_price: Calcular preço para período
- send_property_media: Enviar fotos/vídeos
- create_reservation: Criar reserva
- register_client: Registrar cliente

SINAIS DE COMPRA para observar:
- Urgência temporal
- Orçamento definido
- Perguntas específicas
- Comparações entre opções
- Linguagem de decisão

CONTEXTO ATUAL:
{context}
`;
```

---

## 💬 Integração WhatsApp

### WhatsApp Business API

```typescript
// /app/api/webhook/whatsapp-optimized/route.ts
export async function POST(request: Request) {
  try {
    // Validate webhook signature
    const signature = request.headers.get('x-hub-signature-256');
    if (!validateWebhookSignature(request, signature)) {
      return new Response('Invalid signature', { status: 401 });
    }

    const body = await request.json();
    
    // Process each message
    if (body.entry?.[0]?.changes?.[0]?.value?.messages) {
      const message = body.entry[0].changes[0].value.messages[0];
      const contact = body.entry[0].changes[0].value.contacts[0];
      
      // Extract message data
      const messageData: WhatsAppMessage = {
        id: message.id,
        from: message.from,
        type: message.type,
        text: message.text?.body,
        timestamp: new Date(parseInt(message.timestamp) * 1000),
        contactName: contact?.profile?.name
      };

      // Process with Sofia
      await processWhatsAppMessage(messageData);
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    logger.error('WhatsApp webhook error', error);
    return new Response('Internal error', { status: 500 });
  }
}
```

### WhatsApp Web (Baileys)

```typescript
// /lib/whatsapp/client.ts
import makeWASocket, { 
  DisconnectReason, 
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  makeInMemoryStore
} from '@whiskeysockets/baileys';

export class WhatsAppWebClient {
  private socket: any;
  private store: any;
  private status: 'disconnected' | 'connecting' | 'qr' | 'connected' = 'disconnected';
  
  async initialize() {
    const { version } = await fetchLatestBaileysVersion();
    const store = makeInMemoryStore({ 
      logger: logger.child({ module: 'baileys-store' }) 
    });
    
    this.store = store;
    
    this.socket = makeWASocket({
      version,
      logger: logger.child({ module: 'baileys' }),
      printQRInTerminal: false,
      auth: {
        creds: await this.loadAuthState(),
        keys: makeCacheableSignalKeyStore(keys, logger)
      },
      generateHighQualityLinkPreview: true,
      getMessage: this.getMessage.bind(this)
    });

    this.setupEventHandlers();
    store.bind(this.socket.ev);
  }

  private setupEventHandlers() {
    // Connection updates
    this.socket.ev.on('connection.update', (update: any) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        this.status = 'qr';
        this.emitQRCode(qr);
      }
      
      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        
        if (shouldReconnect) {
          setTimeout(() => this.initialize(), 5000);
        } else {
          this.status = 'disconnected';
        }
      } else if (connection === 'open') {
        this.status = 'connected';
        logger.info('WhatsApp Web connected');
      }
    });

    // Message updates
    this.socket.ev.on('messages.upsert', async (m: any) => {
      const messages = m.messages;
      
      for (const msg of messages) {
        if (!msg.key.fromMe && msg.message) {
          await this.handleIncomingMessage(msg);
        }
      }
    });
  }

  async sendTextMessage(to: string, text: string): Promise<void> {
    const jid = this.formatJID(to);
    
    await this.socket.sendMessage(jid, { 
      text,
      linkPreview: null 
    });
  }

  async sendImageMessage(
    to: string, 
    imageUrl: string, 
    caption?: string
  ): Promise<void> {
    const jid = this.formatJID(to);
    
    await this.socket.sendMessage(jid, {
      image: { url: imageUrl },
      caption
    });
  }
}
```

---

## 🏢 Sistema Multi-tenant

### Arquitetura

```typescript
// Estrutura do Firestore
tenants/
├── {tenantId}/
│   ├── properties/
│   ├── clients/
│   ├── reservations/
│   ├── conversations/
│   ├── messages/
│   ├── transactions/
│   ├── goals/
│   ├── visits/
│   ├── automations/
│   └── settings/
└── users/
    └── {userId}/
        └── tenantId: string
```

### Implementação

```typescript
// /lib/services/tenant-service-factory.ts
export class TenantServiceFactory {
  private services: Map<string, any> = new Map();
  
  constructor(private tenantId: string) {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }
  }

  private getService<T>(
    key: string, 
    ServiceClass: new (tenantId: string) => T
  ): T {
    if (!this.services.has(key)) {
      this.services.set(key, new ServiceClass(this.tenantId));
    }
    return this.services.get(key);
  }

  get properties() {
    return this.getService('properties', PropertyService);
  }

  get clients() {
    return this.getService('clients', ClientService);
  }

  get reservations() {
    return this.getService('reservations', ReservationService);
  }

  // ... outros serviços
}
```

---

## 📊 Dashboard - Análise Detalhada

### Dashboard Home Page

```typescript
// /app/dashboard/page.tsx - Estrutura Completa

interface DashboardComponents {
  // 1. Estatísticas Principais (4 cards)
  statsCards: {
    properties: {
      component: 'StatCard',
      data: {
        total: number,      // Total de imóveis
        active: number,     // Imóveis ativos
        trend: number       // Tendência %
      },
      api: 'services.properties.getAll()',
      updates: 'real-time via subscribe()'
    },
    reservations: {
      component: 'StatCard',
      data: {
        total: number,      // Total de reservas
        pending: number,    // Reservas pendentes
        trend: number       // Tendência mensal %
      },
      api: 'services.reservations.getAll()',
      calculations: 'Monthly comparison logic'
    },
    revenue: {
      component: 'StatCard',
      data: {
        monthly: number,    // Receita mensal
        total: number,      // Receita total
        trend: number       // Crescimento %
      },
      api: 'Calculated from confirmed reservations',
      formatting: 'formatCurrency()'
    },
    occupancy: {
      component: 'StatCard',
      data: {
        rate: number,       // Taxa de ocupação %
        occupied: number,   // Dias ocupados
        available: number   // Dias disponíveis
      },
      api: 'Calculated from reservations and properties',
      formula: '(occupiedDays / totalDays) * 100'
    }
  },

  // 2. Cards de Informação (3 cards lado a lado)
  infoCards: {
    agenda: {
      component: 'AgendaCard',
      location: '/components/organisms/dashboards/AgendaCard.tsx',
      features: [
        'Próximo compromisso',
        'Countdown timer',
        'Quick actions',
        'Empty state'
      ],
      api: '/api/visits?upcoming=true'
    },
    crm: {
      component: 'CRMCard',
      location: '/components/organisms/dashboards/CRMCard.tsx',
      features: [
        'Lead statistics',
        'Conversion rate',
        'Recent activity',
        'Response time'
      ],
      data: 'services.clients + conversations'
    },
    whatsapp: {
      component: 'WhatsApp Status Card (inline)',
      features: [
        'Connection status',
        'Daily messages count',
        'Active conversations',
        'Average response time'
      ],
      api: [
        '/api/whatsapp/session',
        'Firestore messages collection'
      ]
    }
  }
}
```

---

## 🔒 Segurança e Performance

### Segurança

```typescript
// Input Validation
const securityLayers = {
  input: {
    validation: 'Zod schemas for all inputs',
    sanitization: 'XSS prevention on all text',
    sqlInjection: 'Parameterized queries only',
    fileUpload: 'Type and size validation'
  },
  
  authentication: {
    method: 'Firebase Auth',
    tokens: 'JWT with expiration',
    sessions: 'Secure HTTP-only cookies',
    mfa: 'Optional 2FA support'
  },
  
  authorization: {
    tenantIsolation: 'Complete data separation',
    roleBasedAccess: 'Admin, user, viewer roles',
    resourceLevel: 'Per-document permissions',
    apiProtection: 'Middleware validation'
  },
  
  rateLimiting: {
    global: '100 requests/minute/IP',
    whatsapp: '20 messages/minute/user',
    ai: '50 requests/hour/tenant',
    uploads: '10 files/minute/user'
  }
};
```

### Performance

```typescript
// Optimization Strategies
const performanceOptimizations = {
  frontend: {
    codeSpitting: 'Dynamic imports for routes',
    lazyLoading: 'Components loaded on demand',
    imageOptimization: 'Next.js Image component',
    bundleSize: 'Tree shaking + minification',
    caching: 'Service worker + HTTP cache'
  },
  
  backend: {
    queryOptimization: 'Indexed Firestore queries',
    caching: {
      redis: 'For frequently accessed data',
      memory: 'In-process caching',
      cdn: 'Static assets on Cloudflare'
    },
    asyncProcessing: 'Queue heavy operations',
    connectionPooling: 'Reuse Firebase connections'
  }
};
```

---

## 🚀 Deploy e Configuração

### Environment Variables

```bash
# .env.example
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_SERVICE_ACCOUNT_KEY=

# OpenAI
OPENAI_API_KEY=

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=

# Application
NEXT_PUBLIC_APP_URL=
TENANT_ID=
NODE_ENV=

# Stripe (optional)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

### Deploy Commands

```bash
# Development
npm run dev

# Build
npm run build

# Production
npm run start

# Type checking
npm run type-check

# Linting
npm run lint

# Tests
npm run test

# Deploy to production
npm run deploy
```

---

## 🎯 Conclusão

O **LOCAI** representa um sistema enterprise-grade completo para gestão imobiliária, demonstrando:

1. **Arquitetura Moderna**: Next.js 15 com TypeScript, design patterns estabelecidos
2. **IA Avançada**: Sofia agent com GPT-4o Mini e function calling
3. **Multi-tenant**: Isolamento completo entre empresas
4. **Integrações Robustas**: WhatsApp dual-mode, pagamentos, analytics
5. **UX Profissional**: Material-UI com Atomic Design
6. **DevOps Ready**: Logging, monitoring, error handling profissionais

O sistema está **pronto para produção** com todas as funcionalidades implementadas e testadas, representando uma solução completa para o mercado imobiliário brasileiro.

---

*Última atualização: Agosto 2025*  
*Versão: 2.0.0*  
*Status: Production Ready*