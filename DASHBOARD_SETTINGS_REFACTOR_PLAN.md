# Dashboard & Settings - Plano de Refatoração Completo

**Data**: 15 de Novembro de 2025
**Versão**: 1.0
**Status**: Planejamento Concluído

---

## 📋 Índice

1. [Resumo Executivo](#resumo-executivo)
2. [Análise de Problemas](#análise-de-problemas)
3. [Arquitetura Proposta](#arquitetura-proposta)
4. [Plano de Implementação](#plano-de-implementação)
5. [Estrutura de Fallbacks](#estrutura-de-fallbacks)
6. [Checklist de Validação](#checklist-de-validação)

---

## 🎯 Resumo Executivo

### Objetivo Principal
Reformular completamente o módulo de **Dashboard** e **Settings** para:
- Corrigir erros críticos de CRUD (Company, Policies, Negotiation)
- Modernizar UI/UX de settings (navegação intuitiva, feedback visual)
- Adicionar métricas de conversas ao dashboard principal
- Validar funcionalidade completa do Heatmap de IA
- Remover funcionalidades obsoletas (Payment Provider, Advanced Settings, Follow-up Agent)
- Centralizar configurações de negociação
- Adicionar campos de pagamento bancário em Company Settings

### Escopo do Projeto
- **Arquivos a Modificar**: 15+ componentes
- **Novas Features**: 3 (Conversation metrics card, Bank info, Settings navigation redesign)
- **Remoções**: 5 (Páginas obsoletas, opções descontinuadas)
- **Tempo Estimado**: 6-8 horas de implementação
- **Prioridade**: CRÍTICA (erros impedem uso do sistema)

---

## 🔍 Análise de Problemas

### Problemas Críticos Identificados

#### 1. **Erros de CRUD em Settings** (PRIORIDADE MÁXIMA)

**Problema**: Firestore paths inconsistentes entre rotas de API

| Settings Page | Firestore Path na API | Firestore Path Esperado | Status |
|---------------|----------------------|------------------------|--------|
| Company | `tenants/{tid}/config/company-info` | ✅ Correto | OK |
| Policies | `tenants/{tid}/config/policies` | ✅ Correto | OK |
| Negotiation | `tenants/{tid}/settings/negotiation` | ❌ Deveria ser `/config/` | **ERRO** |

**Root Cause**:
- API de negotiation usa `collection('settings')` ao invés de `collection('config')`
- Inconsistência causa falha ao carregar/salvar dados
- Nenhum fallback para paths antigos

**Impacto**: Usuários não conseguem salvar configurações de negociação

---

#### 2. **Navegação de Settings** (PRIORIDADE ALTA)

**Problemas**:
- ❌ Nenhum botão "Voltar" para dashboard
- ❌ Layout pesado e confuso
- ❌ Feedback visual insuficiente (loading, success, errors)
- ❌ Páginas fantasma (Payment Provider, Advanced)
- ❌ Opções descontinuadas visíveis (Follow-up agent)

**Impacto**: UX ruim, usuários se perdem na navegação

---

#### 3. **Dashboard Principal - Métricas Ausentes** (PRIORIDADE MÉDIA)

**Problema**: Dashboard não mostra métricas de conversas do post-conversation

**Dados Disponíveis mas Não Exibidos**:
- Total de conversas do dia
- Taxa de resposta da Sofia
- Tempo médio de resposta
- Conversas ativas vs concluídas

**Impacto**: Dados valiosos não são apresentados ao usuário

---

#### 4. **Heatmap de IA** (PRIORIDADE MÉDIA)

**Status Atual**:
- ✅ Componente existe (`/dashboard/metricas`)
- ❓ API `/api/metrics/analytics` não verificada
- ❓ Dados de conversas não integrados

**Validação Necessária**: Verificar se heatmap está recebendo dados de `post-conversation`

---

#### 5. **Company Settings - Campos Faltando** (PRIORIDADE ALTA)

**Campos Necessários para Pagamentos**:
```typescript
// Dados bancários para repasse de pagamentos
bankInfo: {
  bankCode: string;        // Código do banco (001 = Banco do Brasil)
  bankName: string;        // Nome do banco
  agencyNumber: string;    // Número da agência
  agencyDigit?: string;    // Dígito da agência (opcional)
  accountNumber: string;   // Número da conta
  accountDigit: string;    // Dígito da conta
  accountType: 'checking' | 'savings';  // Tipo de conta
  pixKey?: string;         // Chave PIX (opcional)
  pixKeyType?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';  // Tipo de chave PIX
}
```

**Impacto**: Sistema não pode processar repasses de pagamento

---

## 🏗️ Arquitetura Proposta

### 1. Firestore Structure Unificada

```
tenants/{tenantId}/
  ├── config/                    ← COLEÇÃO CENTRALIZADA
  │   ├── company-info          ← Dados da empresa + banco
  │   ├── policies              ← Políticas (cancelamento, termos, privacidade)
  │   ├── negotiation           ← Configurações de negociação (MIGRADO)
  │   └── ai-config             ← Configuração de agentes de IA
  │
  ├── conversations/             ← Headers de conversas
  ├── messages/                  ← Mensagens individuais
  ├── properties/                ← Imóveis
  ├── clients/                   ← Clientes
  └── ...
```

**Mudanças**:
- ✅ Mover negotiation de `settings/` para `config/`
- ✅ Script de migração para dados existentes
- ✅ Fallback para ler de ambos os paths (compatibilidade)

---

### 2. Settings Navigation - Novo Design

**Componente**: `app/dashboard/settings/layout.tsx`

#### Novo Layout:

```
┌─────────────────────────────────────────────────┐
│  ← Voltar ao Dashboard    |    Configurações    │
├─────────────────────────────────────────────────┤
│                                                 │
│  SIDEBAR (150px)    │    CONTEÚDO (flex-1)     │
│                     │                           │
│  📋 Perfil & Conta  │    [Formulário]          │
│  🏢 Empresa         │                           │
│  🤖 Agentes de IA   │    [Tabs/Cards]          │
│  💰 Negociação      │                           │
│  📜 Políticas       │    [Botões Ação]         │
│                     │                           │
│                     │    [Status/Feedback]     │
│                     │                           │
└─────────────────────────────────────────────────┘
```

**Features**:
- Header com botão voltar (sempre visível)
- Breadcrumbs: Dashboard > Settings > [Current Page]
- Sidebar compacta e moderna
- Loading states em todos os formulários
- Success/Error toasts (Snackbar do MUI)
- Auto-save indicators

---

### 3. Dashboard Metrics Card - Conversas

**Novo Card**: `ConversationsMetricsCard.tsx`

```typescript
interface ConversationsMetrics {
  today: {
    total: number;           // Total de conversas hoje
    active: number;          // Conversas ativas
    completed: number;       // Conversas concluídas
    avgResponseTime: number; // Tempo médio de resposta (segundos)
  };
  week: {
    total: number;
    conversionRate: number;  // Taxa de conversão (%)
  };
}
```

**Visualização**:
```
┌─────────────────────────────────────┐
│  💬 Conversas com Sofia             │
│                                     │
│  📊 Hoje: 23 conversas              │
│  ✅ Ativas: 12  |  ✓ Concluídas: 11│
│  ⚡ Resposta média: 8s              │
│                                     │
│  📈 Semana: 156 conversas (+12%)    │
│                                     │
│  [Ver Detalhes →]                   │
└─────────────────────────────────────┘
```

---

### 4. Fallback Strategy - Multi-Layer

#### Layer 1: Firestore Path Fallback
```typescript
async function getSettings(tenantId: string, docName: string) {
  // Tentar path novo primeiro
  let doc = await db
    .collection('tenants').doc(tenantId)
    .collection('config').doc(docName)
    .get();

  if (!doc.exists) {
    // Fallback: tentar path antigo
    doc = await db
      .collection('tenants').doc(tenantId)
      .collection('settings').doc(docName)
      .get();

    if (doc.exists) {
      // MIGRAR automaticamente para novo path
      await migrateToNewPath(tenantId, docName, doc.data());
    }
  }

  if (!doc.exists) {
    // Fallback: retornar defaults
    return getDefaultSettings(docName);
  }

  return doc.data();
}
```

#### Layer 2: Schema Validation Fallback
```typescript
const result = Schema.safeParse(data);

if (!result.success) {
  logger.warn('Schema validation failed - using defaults for missing fields', {
    errors: result.error.errors,
    tenantId
  });

  // Merge com defaults para campos faltando
  return { ...DEFAULT_SETTINGS, ...data };
}
```

#### Layer 3: API Error Fallback
```typescript
try {
  const response = await fetch('/api/tenant/settings/company', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return await response.json();

} catch (error) {
  logger.error('Failed to load settings', { error });

  // Fallback: carregar do localStorage (cache)
  const cached = localStorage.getItem('settings_cache');
  if (cached) {
    return JSON.parse(cached);
  }

  // Último fallback: defaults
  return DEFAULT_SETTINGS;
}
```

#### Layer 4: UI Rendering Fallback
```typescript
{loading ? (
  <CircularProgress />
) : error ? (
  <Alert severity="error">
    Erro ao carregar. <Button onClick={retry}>Tentar Novamente</Button>
  </Alert>
) : data ? (
  <FormComponent data={data} />
) : (
  <Alert severity="warning">
    Nenhuma configuração encontrada. <Button onClick={createDefaults}>Criar Padrão</Button>
  </Alert>
)}
```

---

## 📝 Plano de Implementação

### FASE 1: Correção Crítica de CRUD (2-3 horas)

#### Task 1.1: Migrar Negotiation Settings Path
**Arquivo**: `app/api/tenant/settings/negotiation/route.ts`

**Mudanças**:
```typescript
// ANTES
const settingsRef = db
  .collection('tenants').doc(tenantId)
  .collection('settings').doc('negotiation');  // ❌ ERRADO

// DEPOIS
const settingsRef = db
  .collection('tenants').doc(tenantId)
  .collection('config').doc('negotiation');  // ✅ CORRETO
```

**Adicionar Fallback**:
```typescript
// GET - ler de config primeiro, fallback para settings
let settingsDoc = await configRef.get();

if (!settingsDoc.exists) {
  // Tentar path antigo
  settingsDoc = await oldSettingsRef.get();

  if (settingsDoc.exists) {
    // Migrar automaticamente
    await configRef.set(settingsDoc.data());
    logger.info('Migrated negotiation settings to new path', { tenantId });
  }
}
```

**Validação**:
- [ ] GET retorna dados corretamente
- [ ] PUT salva em `config/negotiation`
- [ ] Fallback funciona para paths antigos
- [ ] Logs confirmam migração automática

---

#### Task 1.2: Adicionar Error Handling Robusto
**Arquivos**: Todas as rotas em `app/api/tenant/settings/*/route.ts`

**Pattern a Aplicar**:
```typescript
export async function GET(request: NextRequest) {
  const requestId = `get-${docName}_${Date.now()}`;

  try {
    // 1. Auth validation
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          code: 'AUTH_REQUIRED',
          requestId
        },
        { status: 401 }
      );
    }

    // 2. Firestore read with fallback
    const data = await getSettingsWithFallback(
      authContext.tenantId,
      docName
    );

    // 3. Schema validation
    const validated = Schema.safeParse(data);

    if (!validated.success) {
      logger.warn('Invalid data structure - merging with defaults', {
        requestId,
        errors: validated.error.errors
      });

      return NextResponse.json({
        success: true,
        data: { ...DEFAULT_DATA, ...data },
        warnings: validated.error.errors,
        requestId
      });
    }

    // 4. Success response
    return NextResponse.json({
      success: true,
      data: validated.data,
      requestId
    });

  } catch (error) {
    logger.error(`Failed to get ${docName}`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown'
    });

    return NextResponse.json(
      {
        success: false,
        error: `Failed to load ${docName}`,
        code: 'INTERNAL_ERROR',
        requestId,
        details: process.env.NODE_ENV === 'development' ?
          error instanceof Error ? error.message : undefined :
          undefined
      },
      { status: 500 }
    );
  }
}
```

**Validação**:
- [ ] Todos os erros retornam JSON estruturado
- [ ] RequestId incluído em todas as respostas
- [ ] Logs detalhados em todos os caminhos
- [ ] Fallbacks funcionam corretamente

---

#### Task 1.3: Adicionar Campos de Pagamento em Company Settings
**Arquivos**:
- `app/api/tenant/settings/company/route.ts` (schema + CRUD)
- `app/dashboard/settings/company/page.tsx` (UI)
- `lib/types/tenant-settings.ts` (types)

**Schema Update**:
```typescript
const CompanyInfoSchema = z.object({
  // ... campos existentes ...

  // NOVOS CAMPOS - Informações Bancárias
  bankInfo: z.object({
    bankCode: z.string().min(3).max(4), // Ex: "001"
    bankName: z.string().min(1).max(100), // Ex: "Banco do Brasil"
    agencyNumber: z.string().min(1).max(10),
    agencyDigit: z.string().max(2).optional(),
    accountNumber: z.string().min(1).max(20),
    accountDigit: z.string().min(1).max(2),
    accountType: z.enum(['checking', 'savings']),
    pixKey: z.string().max(200).optional(),
    pixKeyType: z.enum(['cpf', 'cnpj', 'email', 'phone', 'random']).optional(),
  }).optional(),
});
```

**UI Component** (`CompanyBankInfoSection.tsx`):
```typescript
<Card sx={{ mt: 3 }}>
  <CardHeader title="💰 Informações Bancárias" />
  <CardContent>
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}>
        <TextField label="Banco" select ...>
          <MenuItem value="001">001 - Banco do Brasil</MenuItem>
          <MenuItem value="104">104 - Caixa Econômica</MenuItem>
          <MenuItem value="237">237 - Bradesco</MenuItem>
          <MenuItem value="341">341 - Itaú</MenuItem>
          {/* ... mais bancos */}
        </TextField>
      </Grid>

      <Grid item xs={12} md={4}>
        <TextField label="Agência" />
      </Grid>

      <Grid item xs={12} md={4}>
        <TextField label="Conta" />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField label="Chave PIX (opcional)" />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField label="Tipo de Chave PIX" select />
      </Grid>
    </Grid>
  </CardContent>
</Card>
```

**Validação**:
- [ ] Schema valida corretamente os campos bancários
- [ ] UI renderiza formulário de banco
- [ ] Dados são salvos e carregados corretamente
- [ ] Validação de formato (agência, conta, PIX)

---

### FASE 2: Dashboard - Métricas de Conversas (1-2 horas)

#### Task 2.1: Criar API de Métricas de Conversas
**Arquivo**: `app/api/metrics/conversations/route.ts`

```typescript
export async function GET(request: NextRequest) {
  try {
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = authContext.tenantId;
    const services = new TenantServiceFactory(tenantId);

    // Buscar conversas de hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayConversations = await services.db
      .collection('tenants').doc(tenantId)
      .collection('conversations')
      .where('startedAt', '>=', today)
      .get();

    // Buscar mensagens de hoje para calcular tempo de resposta
    const todayMessages = await services.db
      .collection('tenants').doc(tenantId)
      .collection('messages')
      .where('createdAt', '>=', today)
      .get();

    // Calcular métricas
    const totalToday = todayConversations.size;
    const activeToday = todayConversations.docs.filter(
      doc => doc.data().status === 'active'
    ).length;

    // Tempo médio de resposta
    let totalResponseTime = 0;
    let responseCount = 0;

    todayMessages.docs.forEach(doc => {
      const data = doc.data();
      if (data.sofiaMessageTimestamp && data.clientMessageTimestamp) {
        const diff = data.sofiaMessageTimestamp.toMillis() -
                    data.clientMessageTimestamp.toMillis();
        totalResponseTime += diff;
        responseCount++;
      }
    });

    const avgResponseTime = responseCount > 0 ?
      Math.round(totalResponseTime / responseCount / 1000) : 0; // em segundos

    // Buscar conversas da semana
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weekConversations = await services.db
      .collection('tenants').doc(tenantId)
      .collection('conversations')
      .where('startedAt', '>=', weekAgo)
      .get();

    return NextResponse.json({
      success: true,
      data: {
        today: {
          total: totalToday,
          active: activeToday,
          completed: totalToday - activeToday,
          avgResponseTime
        },
        week: {
          total: weekConversations.size
        }
      }
    });

  } catch (error) {
    logger.error('Failed to get conversation metrics', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to load metrics' },
      { status: 500 }
    );
  }
}
```

**Validação**:
- [ ] API retorna métricas corretas
- [ ] Cálculo de tempo de resposta está preciso
- [ ] Performance é aceitável (< 2s)

---

#### Task 2.2: Criar Card de Métricas de Conversas
**Arquivo**: `components/organisms/dashboards/ConversationsMetricsCard.tsx`

```typescript
export function ConversationsMetricsCard() {
  const { tenantId } = useTenant();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const response = await fetch('/api/metrics/conversations');
        const data = await response.json();
        setMetrics(data.data);
      } catch (error) {
        console.error('Failed to load conversation metrics', error);
      } finally {
        setLoading(false);
      }
    }

    loadMetrics();

    // Atualizar a cada 30 segundos
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, [tenantId]);

  if (loading) return <Skeleton variant="rectangular" height={200} />;
  if (!metrics) return null;

  return (
    <Card>
      <CardHeader
        title="💬 Conversas com Sofia"
        action={
          <Chip label="Hoje" size="small" color="primary" />
        }
      />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="h3">{metrics.today.total}</Typography>
            <Typography variant="caption" color="text.secondary">
              Conversas
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="h3">{metrics.today.avgResponseTime}s</Typography>
            <Typography variant="caption" color="text.secondary">
              Tempo Médio
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          <Grid item xs={6}>
            <Chip label={`✅ ${metrics.today.completed} concluídas`} size="small" />
          </Grid>

          <Grid item xs={6}>
            <Chip label={`⚡ ${metrics.today.active} ativas`} size="small" color="warning" />
          </Grid>
        </Grid>

        <Box sx={{ mt: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            href="/dashboard/metricas"
          >
            Ver Detalhes →
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
```

**Validação**:
- [ ] Card renderiza métricas corretamente
- [ ] Auto-refresh funciona (30s)
- [ ] Link para /metricas funciona
- [ ] Loading state é exibido

---

#### Task 2.3: Adicionar Card ao Dashboard Principal
**Arquivo**: `app/dashboard/page.tsx`

**Mudança**:
```typescript
// Adicionar import
import { ConversationsMetricsCard } from '@/components/organisms/dashboards/ConversationsMetricsCard';

// No grid de cards principais (segunda linha)
<Grid container spacing={3}>
  {/* Primeira linha - cards existentes */}
  <Grid item xs={12} md={3}>
    {/* Propriedades Ativas */}
  </Grid>
  <Grid item xs={12} md={3}>
    {/* Reservas Pendentes */}
  </Grid>
  <Grid item xs={12} md={3}>
    {/* Receita Mensal */}
  </Grid>
  <Grid item xs={12} md={3}>
    {/* Taxa de Ocupação */}
  </Grid>

  {/* Segunda linha */}
  <Grid item xs={12} md={4}>
    <ConversationsMetricsCard />  {/* ← NOVO */}
  </Grid>
  <Grid item xs={12} md={4}>
    <AgendaCard />
  </Grid>
  <Grid item xs={12} md={4}>
    <SofiaCard />
  </Grid>
</Grid>
```

**Validação**:
- [ ] Card aparece no dashboard
- [ ] Layout responsivo funciona
- [ ] Não quebra outros cards

---

### FASE 3: Settings UI/UX Redesign (2-3 horas)

#### Task 3.1: Redesenhar Settings Layout
**Arquivo**: `app/dashboard/settings/layout.tsx`

**Novo Layout**:
```typescript
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const SETTINGS_SECTIONS = [
    { id: 'profile', label: '📋 Perfil & Conta', href: '/dashboard/settings' },
    { id: 'company', label: '🏢 Empresa', href: '/dashboard/settings/company' },
    { id: 'ai', label: '🤖 Agentes de IA', href: '/dashboard/settings/ai-config' },
    { id: 'negotiation', label: '💰 Negociação', href: '/dashboard/settings/negotiation' },
    { id: 'policies', label: '📜 Políticas', href: '/dashboard/settings/policies' },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header com Breadcrumbs e Botão Voltar */}
      <Paper
        sx={{
          p: 2,
          borderRadius: 0,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => router.push('/dashboard')}>
            <ArrowBackIcon />
          </IconButton>

          <Breadcrumbs>
            <Link href="/dashboard">Dashboard</Link>
            <Typography color="primary">Configurações</Typography>
          </Breadcrumbs>
        </Box>

        <Typography variant="h6">Configurações</Typography>
      </Paper>

      {/* Content com Sidebar */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <Paper
          sx={{
            width: 200,
            borderRadius: 0,
            borderRight: '1px solid',
            borderColor: 'divider',
            overflowY: 'auto'
          }}
        >
          <List>
            {SETTINGS_SECTIONS.map((section) => (
              <ListItemButton
                key={section.id}
                selected={pathname === section.href}
                onClick={() => router.push(section.href)}
              >
                <ListItemText primary={section.label} />
              </ListItemButton>
            ))}
          </List>
        </Paper>

        {/* Main Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
```

**Validação**:
- [ ] Botão voltar funciona
- [ ] Breadcrumbs corretos
- [ ] Sidebar navigation funciona
- [ ] Highlight em página ativa
- [ ] Layout responsivo

---

#### Task 3.2: Adicionar Loading/Error States
**Pattern para Todas as Settings Pages**:

```typescript
export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const { getFirebaseToken } = useAuth();

  // Success/Error Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const token = await getFirebaseToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch('/api/tenant/settings/company', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setData(result.data);

      // Cache no localStorage
      localStorage.setItem('settings_company_cache', JSON.stringify(result.data));

    } catch (err) {
      setError(err.message);

      // Fallback: tentar carregar do cache
      const cached = localStorage.getItem('settings_company_cache');
      if (cached) {
        setData(JSON.parse(cached));
        setSnackbar({
          open: true,
          message: 'Carregado do cache (offline)',
          severity: 'warning'
        });
      }
    } finally {
      setLoading(false);
    }
  }

  async function saveData(formData) {
    setSaving(true);

    try {
      const token = await getFirebaseToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch('/api/tenant/settings/company', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      setData(result.data);

      setSnackbar({
        open: true,
        message: 'Configurações salvas com sucesso!',
        severity: 'success'
      });

    } catch (err) {
      setSnackbar({
        open: true,
        message: `Erro ao salvar: ${err.message}`,
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !data) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" onClick={loadData}>
            Tentar Novamente
          </Button>
        }
      >
        Erro ao carregar configurações: {error}
      </Alert>
    );
  }

  return (
    <>
      <FormComponent
        data={data}
        onSave={saveData}
        saving={saving}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
```

**Aplicar a**:
- [ ] `/dashboard/settings/company/page.tsx`
- [ ] `/dashboard/settings/ai-config/page.tsx`
- [ ] `/dashboard/settings/negotiation/page.tsx`
- [ ] `/dashboard/settings/policies/page.tsx`

---

#### Task 3.3: Remover Opções Obsoletas

**Arquivo**: `app/dashboard/settings/ai-config/page.tsx`

**Remover**:
```typescript
// ❌ REMOVER COMPLETAMENTE
<FormControlLabel
  control={<Switch checked={features.autoFollowUp} />}
  label="Auto Follow-up"
/>

// ❌ REMOVER SEÇÃO DE NEGOCIAÇÃO
<Typography variant="h6">Negociação</Typography>
<FormGroup>
  {/* Todo conteúdo de negociação */}
</FormGroup>
```

**Adicionar Aviso**:
```typescript
<Alert severity="info" sx={{ mb: 2 }}>
  ℹ️ Configurações de negociação foram movidas para a página dedicada:
  <Link href="/dashboard/settings/negotiation">Negociação</Link>
</Alert>
```

**Validação**:
- [ ] Follow-up removido completamente
- [ ] Negociação removida da página AI Config
- [ ] Link para página de negociação funciona

---

### FASE 4: Remover Páginas Obsoletas (30 min)

#### Task 4.1: Remover do Layout Navigation
**Arquivo**: `app/dashboard/settings/layout.tsx`

**Remover**:
```typescript
// ❌ REMOVER ESTAS SEÇÕES
{
  id: 'payment',
  label: '💳 Provedor de Pagamento',
  href: '/dashboard/settings/payment-provider',
  badge: 'BETA'
},
{
  id: 'advanced',
  label: '⚙️ Avançado',
  href: '/dashboard/settings/advanced'
},
```

**Validação**:
- [ ] Itens removidos da sidebar
- [ ] Nenhum link quebrado

---

#### Task 4.2: Criar Páginas de Redirecionamento (Opcional)
**Arquivos**:
- `app/dashboard/settings/payment-provider/page.tsx`
- `app/dashboard/settings/advanced/page.tsx`

**Conteúdo**:
```typescript
export default function RemovedPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirecionar após 3 segundos
    const timeout = setTimeout(() => {
      router.push('/dashboard/settings');
    }, 3000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <Alert severity="info">
      Esta página foi removida. Redirecionando para configurações...
    </Alert>
  );
}
```

**Validação**:
- [ ] Páginas retornam aviso
- [ ] Redirecionamento automático funciona

---

### FASE 5: Validar Heatmap e Métricas de IA (1 hora)

#### Task 5.1: Verificar API de Métricas
**Arquivo**: `app/api/metrics/analytics/route.ts`

**Validar**:
- [ ] Rota existe
- [ ] Retorna dados de conversas
- [ ] Formato compatível com heatmap

**Se não existir, criar**:
```typescript
export async function GET(request: NextRequest) {
  try {
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tenantId } = authContext;
    const services = new TenantServiceFactory(tenantId);

    // Buscar mensagens dos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const messages = await services.db
      .collection('tenants').doc(tenantId)
      .collection('messages')
      .where('createdAt', '>=', thirtyDaysAgo)
      .get();

    // Agrupar por hora e dia da semana
    const heatmapData = Array(7).fill(0).map(() => Array(24).fill(0));

    messages.docs.forEach(doc => {
      const data = doc.data();
      const date = data.createdAt.toDate();
      const hour = date.getHours();
      const dayOfWeek = date.getDay(); // 0 = Domingo

      heatmapData[dayOfWeek][hour]++;
    });

    return NextResponse.json({
      success: true,
      data: {
        heatmap: heatmapData,
        totalMessages: messages.size
      }
    });

  } catch (error) {
    logger.error('Failed to get analytics', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to load analytics' },
      { status: 500 }
    );
  }
}
```

**Validação**:
- [ ] API retorna heatmap data
- [ ] Formato é compatível com componente
- [ ] Performance aceitável

---

#### Task 5.2: Validar Componente Heatmap
**Arquivo**: `app/dashboard/metricas/page.tsx`

**Verificar**:
- [ ] Heatmap renderiza corretamente
- [ ] Dados vêm da API de analytics
- [ ] Tooltips mostram informações corretas
- [ ] Gradiente de cores funciona

**Se necessário, atualizar integração**:
```typescript
const { data: metricsData } = useSWR(
  '/api/metrics/analytics',
  fetcher,
  { refreshInterval: 60000 } // Refresh a cada 1 minuto
);

const heatmapData = metricsData?.data?.heatmap || [];
```

---

### FASE 6: Testes Completos (1 hora)

#### Checklist de Validação Final

##### Settings - Company
- [ ] Carrega dados existentes
- [ ] Salva alterações corretamente
- [ ] Campos bancários validados
- [ ] Loading state visível
- [ ] Success toast após salvar
- [ ] Error handling funciona
- [ ] Cache funciona (offline)

##### Settings - AI Config
- [ ] Carrega configurações
- [ ] Toggles funcionam
- [ ] Salva corretamente
- [ ] Follow-up removido
- [ ] Negociação removida
- [ ] Link para negociação funciona

##### Settings - Negotiation
- [ ] Carrega de `config/negotiation`
- [ ] Fallback para path antigo funciona
- [ ] Salva em path correto
- [ ] Presets funcionam
- [ ] Todos os campos validam

##### Settings - Policies
- [ ] Carrega políticas
- [ ] Tabs funcionam
- [ ] Editor de cancelamento funciona
- [ ] Salva corretamente

##### Dashboard - Conversas Card
- [ ] Métricas carregam
- [ ] Auto-refresh funciona
- [ ] Números corretos
- [ ] Link para detalhes funciona

##### Dashboard - Heatmap
- [ ] Heatmap renderiza
- [ ] Dados vêm da API
- [ ] Tooltips funcionam
- [ ] Atualização periódica funciona

##### Navigation
- [ ] Botão voltar funciona
- [ ] Breadcrumbs corretos
- [ ] Sidebar navigation funciona
- [ ] Active state correto
- [ ] Páginas obsoletas removidas

---

## 📊 Estrutura de Fallbacks - Resumo

### Nivel 1: Firestore Path Fallback
```
config/negotiation ← TRY FIRST
   ↓ (if not found)
settings/negotiation ← FALLBACK
   ↓ (if not found)
DEFAULT_SETTINGS ← ULTIMATE FALLBACK
```

### Nivel 2: Schema Validation
```
Validate with Zod
   ↓ (if fails)
Merge with defaults
   ↓
Return valid data
```

### Nivel 3: API Response
```
API Request
   ↓ (if fails)
LocalStorage cache
   ↓ (if empty)
Default values
```

### Nivel 4: UI Rendering
```
Loading → Error → Empty → Data
Each state has proper UI
```

---

## ✅ Checklist de Validação Final

### Pré-Deploy
- [ ] Todos os testes passam
- [ ] Nenhum console.error em produção
- [ ] Build completa sem erros
- [ ] TypeScript sem erros
- [ ] ESLint sem warnings críticos

### Funcionalidade
- [ ] CRUD de todas as settings funciona
- [ ] Métricas de conversas aparecem
- [ ] Heatmap funciona
- [ ] Navegação intuitiva
- [ ] Feedback visual em todas as ações

### Performance
- [ ] Dashboard carrega em < 2s
- [ ] Settings carregam em < 1s
- [ ] Nenhuma query lenta (> 3s)
- [ ] Cache funciona corretamente

### UX
- [ ] Loading states em todas as páginas
- [ ] Error messages claros
- [ ] Success feedback visível
- [ ] Mobile responsivo
- [ ] Acessibilidade básica (keyboard nav)

---

## 📝 Notas de Implementação

### Ordem de Implementação Recomendada
1. ✅ FASE 1: Crítico - corrigir CRUD primeiro
2. ✅ FASE 3: UI/UX - melhorar experiência
3. ✅ FASE 2: Dashboard - adicionar métricas
4. ✅ FASE 4: Cleanup - remover obsoleto
5. ✅ FASE 5: Validação - garantir heatmap
6. ✅ FASE 6: Testes - validação final

### Commits Sugeridos
```bash
# Fase 1
git commit -m "fix: corrige paths do Firestore em settings (config vs settings)"
git commit -m "feat: adiciona campos bancários em company settings"
git commit -m "refactor: melhora error handling em todas as settings APIs"

# Fase 2
git commit -m "feat: adiciona card de métricas de conversas no dashboard"
git commit -m "feat: cria API de métricas de conversas"

# Fase 3
git commit -m "refactor: redesenha layout de settings com navegação moderna"
git commit -m "feat: adiciona loading/error states em todas as settings"
git commit -m "refactor: remove opções obsoletas (follow-up, negotiation duplicada)"

# Fase 4
git commit -m "refactor: remove páginas obsoletas (payment-provider, advanced)"

# Fase 5
git commit -m "feat: valida e corrige integração do heatmap com post-conversation"

# Fase 6
git commit -m "test: adiciona validação completa de settings e dashboard"
```

---

**FIM DO PLANO DE REFATORAÇÃO**

**Próximos Passos**: Iniciar implementação seguindo o plano acima, fase por fase.
