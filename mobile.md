# 📱 LOCAI Mobile - Documentação Completa para Desenvolvimento

## 🎯 Visão Geral do Projeto

### Descrição
**LOCAI** é uma plataforma de gestão de imóveis para aluguel de temporada com IA integrada (Sofia Agent), oferecendo automação completa via WhatsApp, CRM avançado, sistema financeiro e mini-sites públicos para cada empresa.

### Stack Tecnológica Recomendada
- **React Native** (Cross-platform)
- **TypeScript** (Type safety)
- **Firebase SDK** (Backend integration)
- **React Navigation 6** (Navigation)
- **React Native Paper** ou **NativeBase** (UI Components)
- **Redux Toolkit** ou **Zustand** (State Management)
- **React Hook Form** (Forms)
- **React Query** (Data fetching)

### Cores e Tema Principal
```typescript
const theme = {
  colors: {
    primary: '#6366F1',      // Indigo-500
    primaryDark: '#4F46E5',  // Indigo-600
    secondary: '#10B981',    // Emerald-500
    success: '#22C55E',      // Green-500
    warning: '#F59E0B',      // Amber-500
    error: '#EF4444',        // Red-500
    info: '#3B82F6',         // Blue-500
    
    background: '#FFFFFF',
    surface: '#F9FAFB',      // Gray-50
    text: '#111827',         // Gray-900
    textSecondary: '#6B7280', // Gray-500
    border: '#E5E7EB',       // Gray-200
    
    // Dark mode
    dark: {
      background: '#111827',
      surface: '#1F2937',
      text: '#F9FAFB',
      textSecondary: '#9CA3AF'
    }
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48
  },
  
  typography: {
    h1: { fontSize: 32, fontWeight: 'bold' },
    h2: { fontSize: 24, fontWeight: 'bold' },
    h3: { fontSize: 20, fontWeight: '600' },
    body: { fontSize: 16, fontWeight: 'normal' },
    caption: { fontSize: 14, fontWeight: 'normal' },
    small: { fontSize: 12, fontWeight: 'normal' }
  },
  
  borderRadius: {
    small: 4,
    medium: 8,
    large: 16,
    full: 9999
  }
};
```

---

## 🔐 1. AUTENTICAÇÃO

### 1.1 Tela de Login
**Rota:** `/login`  
**API Endpoint:** `POST /api/auth/login`

**Campos:**
- Email (input com validação de email)
- Senha (input com máscara de senha)
- Checkbox "Lembrar-me"
- Link "Esqueci minha senha"

**Validações:**
- Email: formato válido, obrigatório
- Senha: mínimo 6 caracteres, obrigatório

**Resposta da API:**
```typescript
interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    tenantId: string;
    role: 'admin' | 'agent' | 'user';
    profilePicture?: string;
  };
  token: string;
  refreshToken: string;
}
```

**Fluxo:**
1. Validar campos localmente
2. Enviar credenciais para API
3. Armazenar token no SecureStore
4. Salvar dados do usuário no estado global
5. Redirecionar para Dashboard

### 1.2 Tela de Registro
**Rota:** `/register`  
**API Endpoint:** `POST /api/auth/register`

**Campos:**
- Nome completo
- Email
- Telefone (com máscara)
- Senha
- Confirmar senha
- Aceite dos termos de uso

**Validações:**
- Todos os campos obrigatórios
- Email único no sistema
- Senhas devem coincidir
- Telefone formato brasileiro

### 1.3 Recuperação de Senha
**Rota:** `/reset-password`  
**API Endpoint:** `POST /api/auth/reset-password`

**Fluxo:**
1. Usuário informa email
2. Sistema envia código por email
3. Usuário insere código
4. Usuário define nova senha

---

## 📊 2. DASHBOARD PRINCIPAL

### 2.1 Home Dashboard
**Rota:** `/dashboard`  
**API Endpoint:** `GET /api/dashboard/stats`

**Componentes:**

#### Cards de Métricas (ScrollView Horizontal)
```typescript
interface MetricCard {
  title: string;
  value: number | string;
  change: number; // percentual
  changeType: 'increase' | 'decrease';
  icon: string;
  color: string;
}

const metrics: MetricCard[] = [
  { title: 'Receita Mensal', value: 'R$ 45.280', change: 12.5, ... },
  { title: 'Ocupação', value: '78%', change: -3.2, ... },
  { title: 'Novos Leads', value: 47, change: 28.0, ... },
  { title: 'Avaliação Média', value: '4.8', change: 2.1, ... }
];
```

#### Gráfico de Receitas (Line Chart)
- Últimos 12 meses
- Comparação com período anterior
- Interativo com tooltip

#### Próximas Reservas (FlatList)
```typescript
interface UpcomingReservation {
  id: string;
  propertyName: string;
  propertyImage: string;
  guestName: string;
  checkIn: Date;
  checkOut: Date;
  status: 'confirmed' | 'pending' | 'checked_in';
  totalAmount: number;
}
```

#### Ações Rápidas (Grid 2x3)
- Nova Reserva
- Adicionar Propriedade
- Enviar Mensagem
- Ver Calendário
- Relatórios
- Configurações

---

## 🏠 3. GESTÃO DE PROPRIEDADES

### 3.1 Lista de Propriedades
**Rota:** `/properties`  
**API Endpoint:** `GET /api/properties`

**Filtros (Header):**
- Busca por nome
- Status (Ativa/Inativa)
- Tipo (Casa/Apartamento/Chácara)
- Ordenação (Nome/Preço/Ocupação)

**Card de Propriedade:**
```typescript
interface PropertyCard {
  id: string;
  images: string[]; // carousel
  title: string;
  location: string;
  bedrooms: number;
  bathrooms: number;
  capacity: number;
  basePrice: number;
  rating: number;
  reviewsCount: number;
  occupancyRate: number;
  isActive: boolean;
  nextAvailable: Date;
}
```

**Ações no Card:**
- Tap: Abrir detalhes
- Swipe Left: Editar
- Swipe Right: Ativar/Desativar
- Long Press: Menu de opções

### 3.2 Detalhes da Propriedade
**Rota:** `/properties/:id`  
**API Endpoint:** `GET /api/properties/:id`

**Seções (ScrollView com Tabs):**

#### Tab 1: Informações
- Galeria de fotos (carousel fullscreen)
- Informações básicas
- Descrição completa
- Localização (mapa integrado)
- Comodidades (grid de ícones)

#### Tab 2: Calendário
- Calendário de disponibilidade
- Legenda de status (cores)
- Seletor de período
- Preços por data

#### Tab 3: Financeiro
- Receita total
- Receita média mensal
- Taxa de ocupação
- Gráfico de evolução
- Últimas transações

#### Tab 4: Avaliações
- Rating geral
- Distribuição de estrelas
- Comentários dos hóspedes
- Responder avaliações

### 3.3 Adicionar/Editar Propriedade
**Rota:** `/properties/new` ou `/properties/:id/edit`  
**API Endpoint:** `POST/PUT /api/properties`

**Formulário em Steps:**

#### Step 1: Informações Básicas
```typescript
interface BasicInfo {
  title: string;
  propertyType: 'house' | 'apartment' | 'farm' | 'other';
  address: string;
  city: string;
  state: string;
  zipCode: string;
  neighborhood: string;
}
```

#### Step 2: Características
```typescript
interface PropertySpecs {
  bedrooms: number;
  bathrooms: number;
  suites: number;
  garageSpots: number;
  totalArea: number;
  builtArea: number;
  capacity: number;
  beds: {
    single: number;
    double: number;
    queen: number;
    king: number;
    sofa: number;
  };
}
```

#### Step 3: Comodidades
- Lista de checkboxes agrupadas por categoria
- Ícones para cada amenidade
- Campo para adicionar personalizada

#### Step 4: Fotos e Vídeos
- Upload múltiplo de imagens
- Reordenação drag & drop
- Definir foto principal
- Upload de vídeos
- Preview com opção de deletar

#### Step 5: Preços e Taxas
```typescript
interface Pricing {
  basePrice: number;
  weekendMultiplier: number;
  cleaningFee: number;
  securityDeposit: number;
  extraGuestFee: number;
  minimumStay: number;
  customPricing: {
    [date: string]: number;
  };
  seasonalPricing: Array<{
    name: string;
    startDate: Date;
    endDate: Date;
    price: number;
  }>;
}
```

---

## 📅 4. SISTEMA DE RESERVAS

### 4.1 Lista de Reservas
**Rota:** `/reservations`  
**API Endpoint:** `GET /api/reservations`

**Filtros (Chips horizontais):**
- Status: Todas | Confirmadas | Pendentes | Check-in | Concluídas | Canceladas
- Período: Hoje | Esta Semana | Este Mês | Personalizado

**Card de Reserva:**
```typescript
interface ReservationCard {
  id: string;
  code: string; // #RES2024001
  property: {
    id: string;
    name: string;
    image: string;
  };
  guest: {
    id: string;
    name: string;
    phone: string;
    avatar?: string;
  };
  dates: {
    checkIn: Date;
    checkOut: Date;
    nights: number;
  };
  guests: {
    adults: number;
    children: number;
    total: number;
  };
  financial: {
    total: number;
    paid: number;
    pending: number;
  };
  status: ReservationStatus;
  statusColor: string;
}
```

### 4.2 Detalhes da Reserva
**Rota:** `/reservations/:id`  
**API Endpoint:** `GET /api/reservations/:id`

**Seções:**

#### Header com Status
- Badge colorido com status
- Botão de ações (dropdown)

#### Informações do Hóspede
- Avatar e nome
- Telefone (tap to call)
- Email (tap to mail)
- CPF/Documento
- Histórico de reservas

#### Detalhes da Estadia
- Propriedade (link)
- Datas e horários
- Número de hóspedes
- Requisições especiais
- Check-in/out realizado

#### Informações Financeiras
```typescript
interface FinancialBreakdown {
  accommodation: number;
  cleaningFee: number;
  extraGuests: number;
  discounts: number;
  taxes: number;
  total: number;
  payments: Array<{
    date: Date;
    amount: number;
    method: string;
    status: string;
  }>;
}
```

#### Ações Disponíveis
- Confirmar Reserva
- Realizar Check-in/out
- Enviar Mensagem
- Gerar Contrato
- Cancelar Reserva

### 4.3 Nova Reserva
**Rota:** `/reservations/new`  
**API Endpoint:** `POST /api/reservations`

**Formulário:**

#### Step 1: Selecionar Propriedade
- Lista ou busca
- Mostrar apenas disponíveis

#### Step 2: Selecionar Datas
- Calendário com disponibilidade
- Cálculo automático de preço

#### Step 3: Dados do Hóspede
- Buscar existente ou criar novo
- Formulário completo

#### Step 4: Detalhes e Pagamento
- Número de hóspedes
- Forma de pagamento
- Observações

#### Step 5: Confirmação
- Resumo completo
- Termos e condições
- Botão confirmar

---

## 👥 5. CRM - GESTÃO DE CLIENTES E LEADS

### 5.1 Lista de Clientes/Leads
**Rota:** `/crm`  
**API Endpoint:** `GET /api/crm/leads`

**Tabs Superiores:**
- Leads (com contador)
- Clientes (com contador)
- Arquivados

**Filtros e Busca:**
- Busca por nome/telefone/email
- Filtro por score (Hot/Warm/Cold)
- Filtro por origem
- Filtro por agente responsável

**Card de Lead/Cliente:**
```typescript
interface LeadCard {
  id: string;
  name: string;
  avatar?: string;
  phone: string;
  email?: string;
  score: 'hot' | 'warm' | 'cold';
  scoreColor: string;
  scoreValue: number; // 0-100
  lastContact: Date;
  assignedAgent?: string;
  tags: string[];
  source: string;
  potentialValue: number;
  nextAction?: {
    type: string;
    date: Date;
    description: string;
  };
}
```

### 5.2 Perfil do Cliente/Lead
**Rota:** `/crm/:id`  
**API Endpoint:** `GET /api/crm/leads/:id`

**Seções (ScrollView):**

#### Informações Pessoais
```typescript
interface ClientProfile {
  personalInfo: {
    name: string;
    phone: string;
    email: string;
    cpf: string;
    birthDate: Date;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
  preferences: {
    propertyTypes: string[];
    locations: string[];
    priceRange: {
      min: number;
      max: number;
    };
    amenities: string[];
  };
  analytics: {
    totalReservations: number;
    totalSpent: number;
    averageStay: number;
    lastReservation: Date;
    lifetime: number; // dias como cliente
  };
}
```

#### Timeline de Interações
- Lista cronológica de todas as interações
- Tipos: Mensagem, Ligação, Visita, Reserva
- Adicionar nova interação

#### Histórico de Reservas
- Lista de todas as reservas
- Status e valores
- Link para detalhes

#### Tarefas e Follow-ups
```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed';
  assignedTo: string;
}
```

### 5.3 Kanban de Vendas
**Rota:** `/crm/pipeline`  
**API Endpoint:** `GET /api/crm/pipeline`

**Colunas (Scroll Horizontal):**
1. Novo Lead
2. Contato Inicial
3. Qualificação
4. Proposta
5. Negociação
6. Fechado/Ganho
7. Fechado/Perdido

**Funcionalidades:**
- Drag & drop entre colunas
- Tap para abrir detalhes
- Cores por score
- Contador por coluna
- Valor total por coluna

---

## 💬 6. SISTEMA DE MENSAGENS (WHATSAPP)

### 6.1 Lista de Conversas
**Rota:** `/messages`  
**API Endpoint:** `GET /api/conversations`

**Interface da Lista:**
```typescript
interface ConversationList {
  id: string;
  contact: {
    name: string;
    phone: string;
    avatar?: string;
  };
  lastMessage: {
    text: string;
    timestamp: Date;
    isFromMe: boolean;
    status: 'sent' | 'delivered' | 'read';
  };
  unreadCount: number;
  isPinned: boolean;
  labels: string[];
}
```

**Funcionalidades:**
- Pull to refresh
- Busca por nome/mensagem
- Filtro por labels
- Marcar como lido
- Arquivar conversa
- Fixar conversa

### 6.2 Tela de Chat
**Rota:** `/messages/:id`  
**API Endpoint:** `GET /api/conversations/:id/messages`

**Componentes:**

#### Header
- Nome e foto do contato
- Status (online/última vez)
- Botões: Ligar, Vídeo, Info

#### Lista de Mensagens
```typescript
interface Message {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location';
  content: string;
  mediaUrl?: string;
  timestamp: Date;
  isFromMe: boolean;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  replyTo?: string;
  isAI?: boolean; // mensagem da Sofia
}
```

#### Input de Mensagem
- Campo de texto expansível
- Botão de anexos (foto, documento, localização)
- Botão de áudio (hold to record)
- Botão de envio
- Indicador "Sofia está digitando..."

### 6.3 Configuração WhatsApp
**Rota:** `/settings/whatsapp`  
**API Endpoint:** `GET /api/whatsapp/session`

**Seções:**

#### Status da Conexão
- QR Code para conectar
- Status: Conectado/Desconectado
- Número conectado
- Botão reconectar/desconectar

#### Configurações da Sofia (AI)
```typescript
interface SofiaSettings {
  enabled: boolean;
  personality: 'professional' | 'friendly' | 'casual';
  autoReply: boolean;
  autoReplyDelay: number; // segundos
  workingHours: {
    enabled: boolean;
    start: string; // "09:00"
    end: string; // "18:00"
    timezone: string;
  };
  welcomeMessage: string;
  awayMessage: string;
}
```

#### Respostas Automáticas
- Lista de gatilhos e respostas
- Adicionar/editar/deletar
- Ativar/desativar

---

## 💰 7. SISTEMA FINANCEIRO

### 7.1 Dashboard Financeiro
**Rota:** `/finance`  
**API Endpoint:** `GET /api/finance/dashboard`

**Cards de Resumo:**
```typescript
interface FinancialSummary {
  revenue: {
    current: number;
    previous: number;
    change: number;
  };
  expenses: {
    current: number;
    previous: number;
    change: number;
  };
  profit: {
    current: number;
    previous: number;
    change: number;
  };
  pending: {
    toReceive: number;
    toPay: number;
  };
}
```

**Gráficos:**
- Receita vs Despesas (Line Chart)
- Distribuição por Propriedade (Pie Chart)
- Fluxo de Caixa (Bar Chart)

### 7.2 Transações
**Rota:** `/finance/transactions`  
**API Endpoint:** `GET /api/finance/transactions`

**Lista de Transações:**
```typescript
interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  date: Date;
  property?: {
    id: string;
    name: string;
  };
  reservation?: {
    id: string;
    code: string;
  };
  paymentMethod: string;
  status: 'pending' | 'completed' | 'cancelled';
  attachments?: string[];
}
```

**Filtros:**
- Tipo (Receita/Despesa)
- Período
- Propriedade
- Categoria
- Status

**Ações:**
- Adicionar transação
- Editar transação
- Anexar comprovante
- Marcar como pago

### 7.3 Metas Financeiras
**Rota:** `/finance/goals`  
**API Endpoint:** `GET /api/goals`

**Card de Meta:**
```typescript
interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date;
  category: 'revenue' | 'savings' | 'investment';
  progress: number; // percentual
  status: 'on_track' | 'at_risk' | 'achieved' | 'failed';
  icon: string;
  color: string;
}
```

**Detalhes da Meta:**
- Gráfico de progresso
- Histórico de evolução
- Projeção de alcance
- Ações e tarefas relacionadas

### 7.4 Relatórios
**Rota:** `/finance/reports`  
**API Endpoint:** `GET /api/finance/reports`

**Tipos de Relatório:**
1. Demonstrativo Mensal
2. Análise por Propriedade
3. Fluxo de Caixa
4. DRE Simplificado
5. Comparativo Anual

**Funcionalidades:**
- Gerar PDF
- Enviar por email
- Filtros personalizados
- Gráficos interativos

---

## 📅 8. CALENDÁRIO E AGENDA

### 8.1 Calendário Integrado
**Rota:** `/calendar`  
**API Endpoint:** `GET /api/calendar/events`

**Visualizações:**
- Mês (default)
- Semana
- Dia
- Lista

**Tipos de Eventos:**
```typescript
interface CalendarEvent {
  id: string;
  type: 'reservation' | 'maintenance' | 'visit' | 'task' | 'reminder';
  title: string;
  property?: {
    id: string;
    name: string;
  };
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  color: string;
  participants?: string[];
  location?: string;
  notes?: string;
}
```

**Legenda de Cores:**
- 🟦 Azul: Reservas confirmadas
- 🟨 Amarelo: Reservas pendentes
- 🟩 Verde: Check-ins
- 🟥 Vermelho: Check-outs
- 🟪 Roxo: Manutenções
- 🟧 Laranja: Visitas agendadas

### 8.2 Criar/Editar Evento
**Rota:** `/calendar/event/new`

**Formulário:**
- Tipo de evento (seletor)
- Título
- Propriedade (se aplicável)
- Data e hora início/fim
- Dia inteiro (toggle)
- Repetir (diário/semanal/mensal)
- Participantes
- Localização
- Notas
- Notificações

---

## 🎯 9. MINI-SITE (WEBVIEW)

### 9.1 Visualizador do Mini-Site
**Rota:** `/mini-site`  
**API Endpoint:** `GET /api/mini-site/settings`

**Funcionalidades:**
- WebView do site público
- Botão de refresh
- Botão compartilhar link
- Copiar link
- Editar configurações

### 9.2 Configurações do Mini-Site
**Rota:** `/mini-site/settings`  
**API Endpoint:** `PUT /api/mini-site/settings`

```typescript
interface MiniSiteSettings {
  enabled: boolean;
  domain: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
  };
  header: {
    logo: string;
    title: string;
    subtitle: string;
  };
  contact: {
    whatsapp: string;
    email: string;
    instagram: string;
    facebook: string;
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
    image: string;
  };
  features: {
    showPrices: boolean;
    allowBooking: boolean;
    showAvailability: boolean;
    showReviews: boolean;
  };
}
```

---

## ⚙️ 10. CONFIGURAÇÕES

### 10.1 Menu de Configurações
**Rota:** `/settings`

**Seções:**
1. 👤 Perfil
2. 🏢 Empresa
3. 🔔 Notificações
4. 💬 WhatsApp
5. 🤖 Assistente IA (Sofia)
6. 💳 Plano e Faturamento
7. 👥 Usuários e Permissões
8. 🔒 Segurança
9. 🎨 Aparência
10. ℹ️ Sobre e Ajuda

### 10.2 Perfil do Usuário
**Rota:** `/settings/profile`  
**API Endpoint:** `PUT /api/user/profile`

```typescript
interface UserProfile {
  name: string;
  email: string;
  phone: string;
  avatar: string;
  bio?: string;
  language: 'pt' | 'en' | 'es';
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}
```

### 10.3 Configurações da Empresa
**Rota:** `/settings/company`  
**API Endpoint:** `PUT /api/company/settings`

```typescript
interface CompanySettings {
  name: string;
  logo: string;
  cnpj: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    city: string;
    state: string;
    zipCode: string;
  };
  contact: {
    phone: string;
    email: string;
    website?: string;
  };
  billing: {
    bankAccount: string;
    pixKey: string;
    paymentMethods: string[];
  };
}
```

### 10.4 Notificações
**Rota:** `/settings/notifications`  
**API Endpoint:** `PUT /api/user/notifications`

```typescript
interface NotificationSettings {
  categories: {
    reservations: {
      new: boolean;
      cancelled: boolean;
      modified: boolean;
      checkIn: boolean;
      checkOut: boolean;
    };
    messages: {
      whatsapp: boolean;
      inApp: boolean;
    };
    financial: {
      payment: boolean;
      expense: boolean;
      goalProgress: boolean;
    };
    system: {
      updates: boolean;
      maintenance: boolean;
      security: boolean;
    };
  };
  quiet: {
    enabled: boolean;
    start: string; // "22:00"
    end: string; // "08:00"
  };
}
```

---

## 📱 11. COMPONENTES REUTILIZÁVEIS

### 11.1 Componentes de UI Base

```typescript
// Button Component
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

// Input Component
interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  type?: 'text' | 'email' | 'password' | 'number' | 'phone';
  error?: string;
  helperText?: string;
  icon?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
}

// Card Component
interface CardProps {
  children: ReactNode;
  padding?: number;
  margin?: number;
  shadow?: boolean;
  onPress?: () => void;
  backgroundColor?: string;
}

// Avatar Component
interface AvatarProps {
  source?: string;
  name?: string; // para iniciais
  size?: 'small' | 'medium' | 'large' | number;
  badge?: boolean;
  onPress?: () => void;
}

// Badge Component
interface BadgeProps {
  text: string | number;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'small' | 'medium';
  dot?: boolean;
}

// Chip Component
interface ChipProps {
  label: string;
  onPress?: () => void;
  onDelete?: () => void;
  selected?: boolean;
  icon?: string;
  color?: string;
}

// FAB (Floating Action Button)
interface FABProps {
  icon: string;
  onPress: () => void;
  color?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  extended?: boolean;
  label?: string;
}

// Empty State Component
interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

// Loading Component
interface LoadingProps {
  size?: 'small' | 'large';
  color?: string;
  fullScreen?: boolean;
  message?: string;
}

// Modal Component
interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'small' | 'medium' | 'large' | 'full';
  showCloseButton?: boolean;
}
```

### 11.2 Componentes de Negócio

```typescript
// Property Card Component
interface PropertyCardProps {
  property: Property;
  onPress: () => void;
  variant?: 'compact' | 'full' | 'horizontal';
  showPrice?: boolean;
  showRating?: boolean;
  showOccupancy?: boolean;
}

// Reservation Status Badge
interface ReservationStatusProps {
  status: ReservationStatus;
  size?: 'small' | 'medium';
  showIcon?: boolean;
}

// Price Display Component
interface PriceDisplayProps {
  amount: number;
  currency?: 'BRL' | 'USD' | 'EUR';
  size?: 'small' | 'medium' | 'large';
  showPeriod?: boolean;
  period?: 'day' | 'week' | 'month';
  oldPrice?: number;
}

// Calendar Day Component
interface CalendarDayProps {
  date: Date;
  status?: 'available' | 'booked' | 'blocked' | 'past';
  price?: number;
  selected?: boolean;
  onPress?: () => void;
}

// Message Bubble Component
interface MessageBubbleProps {
  message: Message;
  isFromMe: boolean;
  showAvatar?: boolean;
  showStatus?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon?: string;
  color?: string;
  onPress?: () => void;
}
```

---

## 🔄 12. SINCRONIZAÇÃO E CACHE

### 12.1 Estratégia de Cache

```typescript
interface CacheConfig {
  // Tempos de expiração em segundos
  expiration: {
    properties: 3600,      // 1 hora
    reservations: 1800,    // 30 minutos
    conversations: 300,    // 5 minutos
    messages: 60,          // 1 minuto
    dashboard: 900,        // 15 minutos
    financial: 1800,       // 30 minutos
  };
  
  // Limites de armazenamento
  limits: {
    maxProperties: 100,
    maxReservations: 200,
    maxMessages: 1000,
    maxCacheSize: 50 * 1024 * 1024, // 50MB
  };
  
  // Estratégias
  strategies: {
    properties: 'cache-first',
    reservations: 'network-first',
    messages: 'network-only',
    media: 'cache-first',
  };
}
```

### 12.2 Sincronização Offline

```typescript
interface OfflineSync {
  // Fila de ações pendentes
  pendingActions: Array<{
    id: string;
    type: 'create' | 'update' | 'delete';
    entity: string;
    data: any;
    timestamp: Date;
    retries: number;
  }>;
  
  // Configuração de retry
  retry: {
    maxAttempts: 3,
    backoffMultiplier: 2,
    initialDelay: 1000,
  };
  
  // Sincronização
  sync: {
    auto: boolean;
    interval: 30000; // 30 segundos
    onConnectionRestore: boolean;
    batchSize: 10;
  };
}
```

---

## 🔔 13. NOTIFICAÇÕES PUSH

### 13.1 Configuração

```typescript
interface PushNotificationConfig {
  // Firebase Cloud Messaging
  fcm: {
    senderId: string;
    apiKey: string;
    projectId: string;
    appId: string;
  };
  
  // Tipos de notificação
  types: {
    reservation_new: {
      title: 'Nova Reserva',
      body: 'Você recebeu uma nova reserva para {property}',
      icon: 'calendar',
      sound: 'default',
      priority: 'high',
    };
    message_received: {
      title: '{sender}',
      body: '{message}',
      icon: 'message',
      sound: 'message',
      priority: 'high',
    };
    payment_received: {
      title: 'Pagamento Recebido',
      body: 'Pagamento de R$ {amount} confirmado',
      icon: 'payment',
      sound: 'success',
      priority: 'medium',
    };
    // ... outras notificações
  };
}
```

### 13.2 Handlers

```typescript
interface NotificationHandlers {
  // Quando recebe notificação
  onNotification: (notification: RemoteMessage) => {
    // Parse do tipo
    const type = notification.data?.type;
    
    // Roteamento baseado no tipo
    switch(type) {
      case 'reservation':
        navigation.navigate('Reservations', { 
          id: notification.data?.reservationId 
        });
        break;
      case 'message':
        navigation.navigate('Messages', { 
          conversationId: notification.data?.conversationId 
        });
        break;
      // ... outros casos
    }
  };
  
  // Background handler
  onBackgroundMessage: async (message: RemoteMessage) => {
    // Salvar no banco local
    await saveNotification(message);
    
    // Atualizar badge
    await updateBadgeCount();
  };
}
```

---

## 🔒 14. SEGURANÇA

### 14.1 Autenticação e Autorização

```typescript
interface SecurityConfig {
  // Token Management
  token: {
    storage: 'SecureStore', // iOS Keychain, Android Keystore
    expiration: 86400, // 24 horas
    refreshBefore: 3600, // Renovar 1h antes de expirar
  };
  
  // Biometria
  biometric: {
    enabled: boolean;
    fallbackToPasscode: boolean;
    types: ['FaceID', 'TouchID', 'Fingerprint'];
  };
  
  // Criptografia local
  encryption: {
    algorithm: 'AES-256-GCM';
    keyDerivation: 'PBKDF2';
    iterations: 10000;
  };
  
  // Validações
  validation: {
    minPasswordLength: 8;
    requireSpecialChar: true;
    requireNumber: true;
    requireUpperCase: true;
    maxLoginAttempts: 5;
    lockoutDuration: 900; // 15 minutos
  };
}
```

### 14.2 Permissões e Roles

```typescript
interface Permissions {
  roles: {
    admin: {
      properties: ['create', 'read', 'update', 'delete'],
      reservations: ['create', 'read', 'update', 'delete'],
      financial: ['create', 'read', 'update', 'delete'],
      users: ['create', 'read', 'update', 'delete'],
      settings: ['read', 'update'],
    };
    agent: {
      properties: ['read', 'update'],
      reservations: ['create', 'read', 'update'],
      financial: ['read'],
      users: ['read'],
      settings: ['read'],
    };
    viewer: {
      properties: ['read'],
      reservations: ['read'],
      financial: [],
      users: [],
      settings: [],
    };
  };
}
```

---

## 📊 15. ANALYTICS E TRACKING

### 15.1 Eventos de Tracking

```typescript
interface AnalyticsEvents {
  // Eventos de tela
  screen_view: {
    screen_name: string;
    screen_class: string;
  };
  
  // Eventos de negócio
  property_viewed: {
    property_id: string;
    property_name: string;
    price: number;
  };
  
  reservation_created: {
    reservation_id: string;
    property_id: string;
    value: number;
    check_in: Date;
    check_out: Date;
  };
  
  message_sent: {
    conversation_id: string;
    message_type: string;
    is_ai_response: boolean;
  };
  
  // Eventos de engajamento
  feature_used: {
    feature_name: string;
    feature_category: string;
  };
}
```

### 15.2 Métricas de Performance

```typescript
interface PerformanceMetrics {
  // App Performance
  app: {
    startup_time: number;
    crash_rate: number;
    anr_rate: number; // Application Not Responding
    memory_usage: number;
    battery_impact: string;
  };
  
  // API Performance
  api: {
    average_latency: number;
    error_rate: number;
    timeout_rate: number;
  };
  
  // User Engagement
  engagement: {
    daily_active_users: number;
    session_duration: number;
    screens_per_session: number;
    retention_rate: number;
  };
}
```

---

## 🚀 16. DEEP LINKING

### 16.1 Configuração de Deep Links

```typescript
interface DeepLinkConfig {
  // Esquema de URL
  scheme: 'locai://';
  
  // Rotas disponíveis
  routes: {
    'property/:id': 'PropertyDetails',
    'reservation/:id': 'ReservationDetails',
    'chat/:conversationId': 'Chat',
    'calendar/:date': 'Calendar',
    'invoice/:id': 'Invoice',
    'profile/:userId': 'UserProfile',
  };
  
  // Universal Links (iOS) / App Links (Android)
  domains: [
    'app.locai.com',
    'link.locai.com'
  ];
}
```

---

## 🎨 17. TEMAS E PERSONALIZAÇÃO

### 17.1 Sistema de Temas

```typescript
interface ThemeSystem {
  // Temas disponíveis
  themes: {
    light: ThemeConfig;
    dark: ThemeConfig;
    custom: ThemeConfig;
  };
  
  // Configuração de tema
  interface ThemeConfig {
    colors: {
      primary: string;
      primaryVariant: string;
      secondary: string;
      secondaryVariant: string;
      background: string;
      surface: string;
      error: string;
      onPrimary: string;
      onSecondary: string;
      onBackground: string;
      onSurface: string;
      onError: string;
    };
    
    typography: {
      fontFamily: {
        regular: string;
        medium: string;
        bold: string;
      };
      sizes: {
        h1: number;
        h2: number;
        h3: number;
        body1: number;
        body2: number;
        caption: number;
      };
    };
    
    spacing: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
    };
    
    borderRadius: {
      sm: number;
      md: number;
      lg: number;
      xl: number;
    };
    
    shadows: {
      sm: ShadowStyle;
      md: ShadowStyle;
      lg: ShadowStyle;
    };
  }
}
```

---

## 📦 18. ESTRUTURA DE PASTAS RECOMENDADA

```
src/
├── components/
│   ├── atoms/          # Componentes básicos
│   ├── molecules/      # Componentes compostos
│   ├── organisms/      # Componentes complexos
│   └── templates/      # Templates de tela
├── screens/            # Telas da aplicação
│   ├── auth/
│   ├── dashboard/
│   ├── properties/
│   ├── reservations/
│   ├── crm/
│   ├── messages/
│   ├── finance/
│   ├── calendar/
│   └── settings/
├── navigation/         # Configuração de navegação
│   ├── AppNavigator.tsx
│   ├── AuthNavigator.tsx
│   └── TabNavigator.tsx
├── services/           # Serviços e API
│   ├── api/
│   ├── firebase/
│   └── storage/
├── store/             # Estado global
│   ├── slices/
│   └── store.ts
├── hooks/             # Custom hooks
├── utils/             # Utilitários
├── types/             # TypeScript types
├── constants/         # Constantes
├── assets/            # Imagens, fontes, etc
└── config/            # Configurações

```

---

## 🔌 19. INTEGRAÇÕES

### 19.1 Firebase Services

```typescript
interface FirebaseIntegration {
  // Firestore
  collections: {
    tenants: 'tenants/{tenantId}';
    properties: 'tenants/{tenantId}/properties';
    reservations: 'tenants/{tenantId}/reservations';
    clients: 'tenants/{tenantId}/clients';
    conversations: 'tenants/{tenantId}/conversations';
    messages: 'tenants/{tenantId}/conversations/{conversationId}/messages';
    transactions: 'tenants/{tenantId}/transactions';
    goals: 'tenants/{tenantId}/goals';
  };
  
  // Storage
  storage: {
    propertyImages: 'tenants/{tenantId}/properties/{propertyId}/images';
    profilePictures: 'tenants/{tenantId}/users/{userId}/avatar';
    documents: 'tenants/{tenantId}/documents';
  };
  
  // Functions
  functions: {
    processReservation: 'processReservation';
    sendWhatsAppMessage: 'sendWhatsAppMessage';
    generateReport: 'generateReport';
    calculatePricing: 'calculatePricing';
  };
}
```

### 19.2 APIs Externas

```typescript
interface ExternalAPIs {
  // OpenAI (Sofia Agent)
  openai: {
    endpoint: 'https://api.openai.com/v1';
    model: 'gpt-4o-mini';
    functions: [
      'search_properties',
      'calculate_price',
      'create_reservation',
      'send_property_media',
      'send_property_map',
      // ... outras 15 funções
    ];
  };
  
  // Google Maps
  googleMaps: {
    geocoding: 'https://maps.googleapis.com/maps/api/geocode/json';
    staticMaps: 'https://maps.googleapis.com/maps/api/staticmap';
    places: 'https://maps.googleapis.com/maps/api/place';
  };
  
  // WhatsApp Business API
  whatsapp: {
    sendMessage: '/api/webhook/whatsapp';
    sendMedia: '/api/webhook/whatsapp/media';
    getStatus: '/api/whatsapp/session';
  };
  
  // Stripe (Pagamentos)
  stripe: {
    createPaymentIntent: '/api/payments/intent';
    confirmPayment: '/api/payments/confirm';
    refund: '/api/payments/refund';
  };
}
```

---

## 📱 20. REQUISITOS TÉCNICOS

### 20.1 Versões Mínimas

```typescript
interface MinimumRequirements {
  ios: {
    version: '13.0',
    devices: ['iPhone 6s+', 'iPad Air 2+'];
  };
  android: {
    version: '6.0', // API 23
    minSdk: 23,
    targetSdk: 33,
  };
  reactNative: '0.72.0';
  node: '18.0.0';
}
```

### 20.2 Permissões Necessárias

```typescript
interface AppPermissions {
  ios: [
    'NSCameraUsageDescription',           // Câmera para fotos
    'NSPhotoLibraryUsageDescription',     // Galeria
    'NSLocationWhenInUseUsageDescription', // Localização
    'NSContactsUsageDescription',         // Contatos
    'NSMicrophoneUsageDescription',       // Áudio WhatsApp
  ];
  android: [
    'android.permission.CAMERA',
    'android.permission.READ_EXTERNAL_STORAGE',
    'android.permission.WRITE_EXTERNAL_STORAGE',
    'android.permission.ACCESS_FINE_LOCATION',
    'android.permission.READ_CONTACTS',
    'android.permission.RECORD_AUDIO',
    'android.permission.INTERNET',
    'android.permission.VIBRATE',
  ];
}
```

---

## 🧪 21. TESTES

### 21.1 Estratégia de Testes

```typescript
interface TestStrategy {
  // Testes unitários
  unit: {
    coverage: 80; // mínimo %
    tools: ['Jest', 'React Native Testing Library'];
  };
  
  // Testes de integração
  integration: {
    apis: ['Mock Service Worker'];
    database: ['Firebase Emulator'];
  };
  
  // Testes E2E
  e2e: {
    tools: ['Detox', 'Appium'];
    platforms: ['iOS', 'Android'];
    devices: ['Phone', 'Tablet'];
  };
}
```

---

## 📈 22. KPIs E MÉTRICAS DO APP

### 22.1 Métricas de Sucesso

```typescript
interface AppMetrics {
  // Adoção
  adoption: {
    downloads: number;
    activations: number;
    dailyActiveUsers: number;
    monthlyActiveUsers: number;
  };
  
  // Engajamento
  engagement: {
    sessionsPerUser: number;
    averageSessionLength: number;
    screenViews: number;
    featureAdoption: Map<string, number>;
  };
  
  // Performance de Negócio
  business: {
    reservationsViaApp: number;
    revenueViaApp: number;
    messagesProcessed: number;
    aiInteractions: number;
  };
  
  // Qualidade
  quality: {
    crashFreeRate: number;
    appRating: number;
    reviewCount: number;
    bugReports: number;
  };
}
```

---

## 🚢 23. DEPLOY E DISTRIBUIÇÃO

### 23.1 Processo de Build

```bash
# iOS
cd ios && pod install
npx react-native run-ios --configuration Release

# Android
cd android && ./gradlew assembleRelease
npx react-native run-android --variant=release
```

### 23.2 Configuração de CI/CD

```typescript
interface CICDConfig {
  // GitHub Actions / Bitrise / CircleCI
  pipeline: {
    stages: [
      'lint',
      'test',
      'build',
      'deploy'
    ];
  };
  
  // Distribuição
  distribution: {
    ios: {
      testflight: true;
      appStore: true;
    };
    android: {
      playConsole: true;
      internalTesting: true;
      production: true;
    };
  };
  
  // Versionamento
  versioning: {
    semantic: true; // 1.0.0
    buildNumber: 'auto-increment';
  };
}
```

---

## 📞 24. SUPORTE E HELP

### 24.1 Sistema de Ajuda In-App

```typescript
interface HelpSystem {
  // FAQ
  faq: Array<{
    category: string;
    questions: Array<{
      question: string;
      answer: string;
      helpful: number;
    }>;
  }>;
  
  // Tutoriais
  tutorials: Array<{
    id: string;
    title: string;
    description: string;
    steps: Array<{
      title: string;
      description: string;
      image?: string;
      video?: string;
    }>;
  }>;
  
  // Chat Support
  support: {
    enabled: boolean;
    workingHours: string;
    averageResponseTime: string;
  };
  
  // Feedback
  feedback: {
    types: ['bug', 'feature', 'compliment', 'other'];
    attachments: boolean;
    screenshots: boolean;
  };
}
```

---

## 🎁 25. FEATURES PREMIUM

### 25.1 Recursos por Plano

```typescript
interface PlanFeatures {
  free: {
    properties: 3;
    reservations: 10; // por mês
    users: 1;
    storage: '1GB';
    features: ['basic_dashboard', 'calendar', 'whatsapp'];
  };
  
  professional: {
    properties: 20;
    reservations: 100;
    users: 5;
    storage: '10GB';
    features: [
      ...free.features,
      'sofia_ai',
      'financial',
      'mini_site',
      'reports'
    ];
  };
  
  enterprise: {
    properties: 'unlimited';
    reservations: 'unlimited';
    users: 'unlimited';
    storage: '100GB';
    features: [
      ...professional.features,
      'api_access',
      'white_label',
      'custom_domain',
      'priority_support'
    ];
  };
}
```

---

## 📝 NOTAS IMPORTANTES PARA O TIME DE DESENVOLVIMENTO

### Prioridades de Implementação (MVP)
1. **Fase 1 - Core (Semanas 1-4)**
   - Autenticação e onboarding
   - Dashboard principal
   - Lista e detalhes de propriedades
   - Calendário básico

2. **Fase 2 - Reservas (Semanas 5-8)**
   - Sistema de reservas completo
   - Gestão de clientes
   - Notificações básicas
   - Sincronização com backend

3. **Fase 3 - Comunicação (Semanas 9-12)**
   - Integração WhatsApp
   - Chat com Sofia AI
   - Sistema de mensagens
   - Templates de mensagens

4. **Fase 4 - Financeiro (Semanas 13-16)**
   - Dashboard financeiro
   - Transações
   - Relatórios
   - Metas e objetivos

### Considerações Técnicas
- **Performance**: Implementar lazy loading e code splitting
- **Offline First**: Priorizar funcionamento offline com sync
- **Segurança**: Implementar certificate pinning e obfuscação
- **Analytics**: Instrumentar todas as ações importantes
- **Acessibilidade**: Seguir guidelines WCAG 2.1 AA
- **Internacionalização**: Preparar para múltiplos idiomas

### Padrões de Código
- **Style Guide**: Airbnb React Native Style Guide
- **Commits**: Conventional Commits
- **Branch Strategy**: Git Flow
- **Code Review**: Obrigatório para merge
- **Documentation**: JSDoc para todas as funções públicas

### Contatos da API Backend
- **Base URL Produção**: `https://alugazap.com/api`
- **Base URL Desenvolvimento**: `http://localhost:8080/api`
- **Documentação API**: Swagger disponível em `/api-docs`
- **Autenticação**: Bearer Token JWT
- **Rate Limiting**: 100 requests/minute

### Links Úteis
- **Repositório Web**: github.com/[seu-repo]
- **Figma Design**: figma.com/[seu-design]
- **Jira Board**: [seu-projeto].atlassian.net
- **Documentação Backend**: [link-para-docs]

---

## 🎯 CONCLUSÃO

Este documento apresenta a especificação completa para o desenvolvimento do aplicativo mobile LOCAI. A implementação deve seguir as diretrizes apresentadas, mantendo consistência com a versão web existente e priorizando a experiência do usuário.

Para dúvidas ou esclarecimentos adicionais, consulte a equipe de desenvolvimento web ou abra uma issue no repositório do projeto.

**Última atualização**: Setembro 2025  
**Versão do documento**: 1.0.0  
**Autor**: Equipe de Desenvolvimento LOCAI