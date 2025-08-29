# 📚 Guia do Desenvolvedor - Projeto Locai

## 🎯 Visão Geral
Bem-vindo ao projeto **Locai**! Este é um sistema enterprise de agente imobiliário com IA, construído com Next.js 15, TypeScript, Material-UI e Firebase. Este guia foi criado para ajudá-lo a entender rapidamente os padrões e convenções do projeto.

## 🏗️ Arquitetura do Projeto

### Stack Principal
- **Framework**: Next.js 15.3.5 (App Router)
- **Linguagem**: TypeScript 5.3.0
- **UI**: Material-UI v5.15.0
- **Banco de Dados**: Firebase Firestore
- **IA**: OpenAI GPT-4o Mini + LangChain
- **Mensageria**: WhatsApp (Business API + Web/Baileys)

## 📁 Estrutura de Diretórios e Padrões de Nomenclatura

### Estrutura Principal
```
locai/
├── app/                      # Next.js App Router
│   ├── api/                 # Rotas da API (kebab-case)
│   ├── dashboard/           # Páginas do dashboard (kebab-case)
│   └── [domain]/           # Mini-sites públicos
├── components/              # Componentes React (Atomic Design)
│   ├── atoms/              # Componentes básicos
│   ├── molecules/          # Componentes compostos
│   ├── organisms/          # Componentes complexos
│   └── templates/          # Templates de página
├── lib/                     # Lógica de negócio
│   ├── ai/                 # Sistema de IA
│   ├── ai-agent/           # Agent Sofia (core)
│   ├── services/           # Serviços de negócio
│   ├── firebase/           # Configuração Firebase
│   ├── utils/              # Utilitários
│   └── types/              # TypeScript types
├── contexts/                # React Contexts
├── hooks/                   # Custom React Hooks
└── theme/                   # Tema MUI
```

### 📝 Padrões de Nomenclatura

#### Arquivos e Pastas
- **Componentes React**: `PascalCase.tsx` (ex: `PropertyCard.tsx`)
- **Serviços/Utils**: `kebab-case.ts` (ex: `property-service.ts`)
- **Tipos TypeScript**: `kebab-case.ts` (ex: `property-types.ts`)
- **Hooks**: `camelCase.ts` começando com `use` (ex: `useProperty.ts`)
- **Rotas API**: `kebab-case/route.ts` (ex: `api/properties/route.ts`)

#### Código
- **Interfaces/Types**: `PascalCase` (ex: `PropertyInterface`)
- **Funções**: `camelCase` (ex: `searchProperties()`)
- **Constantes**: `UPPER_SNAKE_CASE` (ex: `MAX_RESULTS`)
- **Classes**: `PascalCase` (ex: `FirestoreService`)

## 🎨 Frontend - Componentes

### Onde Criar/Manter Componentes

O projeto usa **Atomic Design**. Aqui está onde colocar cada tipo:

#### 1. Atoms (`components/atoms/`)
Componentes básicos e reutilizáveis:
```typescript
// components/atoms/Button.tsx
export const Button: React.FC<ButtonProps> = ({ ... }) => {
  // Componente simples, sem lógica complexa
}
```
**Exemplos**: Button, Input, Chip, StatusIndicator

#### 2. Molecules (`components/molecules/`)
Combinação de atoms, organizadas por categoria:
```
molecules/
├── cards/           # Cards reutilizáveis
├── forms/           # Campos de formulário
├── navigation/      # Elementos de navegação
└── summaries/       # Resumos e previews
```
**Exemplos**: PropertyCard, FormField, NavigationMenu

#### 3. Organisms (`components/organisms/`)
Componentes complexos, organizados por domínio:
```
organisms/
├── ai/              # Componentes de IA
├── financial/       # Componentes financeiros
├── property/        # Componentes de propriedades
├── calendars/       # Calendários
└── dashboards/      # Dashboards específicos
```
**Exemplos**: PropertyDetailsForm, AIAgentConfig, FinancialDashboard

#### 4. Templates (`components/templates/`)
Layouts de página completos:
```typescript
// components/templates/dashboards/PropertyDashboard.tsx
export const PropertyDashboard: React.FC = () => {
  // Layout completo da página
}
```

### Padrão de Criação de Componente

```typescript
// components/molecules/cards/PropertyCard.tsx
import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import { PropertyInterface } from '@/lib/types/property';

interface PropertyCardProps {
  property: PropertyInterface;
  onClick?: () => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ 
  property, 
  onClick 
}) => {
  return (
    <Card onClick={onClick}>
      <CardContent>
        <Typography variant="h6">{property.name}</Typography>
        {/* Conteúdo do card */}
      </CardContent>
    </Card>
  );
};
```

## 🔧 Backend - Tipos e Interfaces

### Onde Definir/Ajustar Tipos

#### 1. Tipos Principais (`lib/types/`)
```typescript
// lib/types/property.ts
export interface PropertyInterface {
  id: string;
  name: string;
  location: string;
  bedrooms: number;
  // ... outros campos
}

export interface PropertySearchParams {
  location?: string;
  minBedrooms?: number;
  maxPrice?: number;
}
```

#### 2. Tipos de API (`lib/types/api/`)
```typescript
// lib/types/api/responses.ts
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

#### 3. Tipos de Contexto (`contexts/`)
```typescript
// contexts/TenantContext.tsx
export interface TenantContextType {
  tenantId: string;
  tenantData: TenantInterface;
  // ... outros campos
}
```

### Convenção de Importação de Tipos
```typescript
// Use path aliases
import { PropertyInterface } from '@/lib/types/property';
// Não use caminhos relativos
// import { PropertyInterface } from '../../../lib/types/property';
```

## 💾 CRUD Operations

### Onde Definir/Ajustar Funções CRUD

#### 1. Serviços Firebase (`lib/services/`)

**Padrão Multi-Tenant com TenantServiceFactory:**
```typescript
// lib/services/property-service.ts
import { TenantServiceFactory } from './tenant-service-factory';

export class PropertyService {
  private factory: TenantServiceFactory;

  constructor(tenantId: string) {
    this.factory = new TenantServiceFactory(tenantId);
  }

  // CREATE
  async createProperty(data: Omit<PropertyInterface, 'id'>): Promise<string> {
    const service = this.factory.createService<PropertyInterface>('properties');
    return await service.create(data);
  }

  // READ
  async getProperty(id: string): Promise<PropertyInterface | null> {
    const service = this.factory.createService<PropertyInterface>('properties');
    return await service.getById(id);
  }

  // UPDATE
  async updateProperty(id: string, data: Partial<PropertyInterface>): Promise<void> {
    const service = this.factory.createService<PropertyInterface>('properties');
    await service.update(id, data);
  }

  // DELETE
  async deleteProperty(id: string): Promise<void> {
    const service = this.factory.createService<PropertyInterface>('properties');
    await service.delete(id);
  }

  // QUERY
  async searchProperties(params: PropertySearchParams): Promise<PropertyInterface[]> {
    const service = this.factory.createService<PropertyInterface>('properties');
    return await service.query(/* construir query baseada em params */);
  }
}
```

#### 2. API Routes (`app/api/`)

**Estrutura de API Route:**
```typescript
// app/api/properties/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PropertyService } from '@/lib/services/property-service';
import { logger } from '@/lib/utils/logger';

// GET - Listar/Buscar
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || process.env.TENANT_ID!;
    const service = new PropertyService(tenantId);
    
    const properties = await service.searchProperties({});
    
    return NextResponse.json({ 
      success: true, 
      data: properties 
    });
  } catch (error) {
    logger.error('Erro ao buscar propriedades', { error });
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar propriedades' },
      { status: 500 }
    );
  }
}

// POST - Criar
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || process.env.TENANT_ID!;
    const data = await request.json();
    const service = new PropertyService(tenantId);
    
    const id = await service.createProperty(data);
    
    return NextResponse.json({ 
      success: true, 
      data: { id } 
    });
  } catch (error) {
    logger.error('Erro ao criar propriedade', { error });
    return NextResponse.json(
      { success: false, error: 'Erro ao criar propriedade' },
      { status: 500 }
    );
  }
}
```

```typescript
// app/api/properties/[id]/route.ts
// PUT - Atualizar
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Implementação similar...
}

// DELETE - Deletar
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Implementação similar...
}
```

#### 3. Hooks Customizados (`hooks/`)

**Para operações no frontend:**
```typescript
// hooks/useProperties.ts
import { useState, useEffect } from 'react';
import { PropertyInterface } from '@/lib/types/property';
import { useTenant } from '@/contexts/TenantContext';

export const useProperties = () => {
  const [properties, setProperties] = useState<PropertyInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantId } = useTenant();

  const fetchProperties = async () => {
    try {
      const response = await fetch('/api/properties', {
        headers: { 'x-tenant-id': tenantId }
      });
      const data = await response.json();
      setProperties(data.data);
    } catch (error) {
      console.error('Erro ao buscar propriedades:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProperty = async (data: Omit<PropertyInterface, 'id'>) => {
    const response = await fetch('/api/properties', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId 
      },
      body: JSON.stringify(data)
    });
    
    if (response.ok) {
      await fetchProperties(); // Recarregar lista
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [tenantId]);

  return {
    properties,
    loading,
    createProperty,
    refetch: fetchProperties
  };
};
```

## 🏢 Multi-Tenant Architecture

### Importante: Sempre Use Contexto de Tenant

#### 1. Em Componentes
```typescript
import { useTenant } from '@/contexts/TenantContext';

export const MyComponent = () => {
  const { tenantId, tenantData } = useTenant();
  
  // Use tenantId para todas operações
};
```

#### 2. Em Serviços
```typescript
// Sempre inicialize serviços com tenantId
const service = new TenantServiceFactory(tenantId);
```

#### 3. Estrutura no Firestore
```
tenants/
└── {tenantId}/
    ├── properties/
    ├── reservations/
    ├── clients/
    ├── conversations/
    └── ... outras coleções
```

## 🤖 Sistema de IA - Sofia Agent

### Adicionar Nova Função ao Agent

#### 1. Definir a Função (`lib/ai/tenant-aware-agent-functions.ts`)
```typescript
{
  name: 'minha_nova_funcao',
  description: 'Descrição clara do que a função faz',
  parameters: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'Descrição do parâmetro'
      }
    },
    required: ['param1']
  }
}
```

#### 2. Implementar a Função
```typescript
async function minha_nova_funcao(
  params: any,
  context: AgentContext,
  tenantId: string
): Promise<any> {
  const factory = new TenantServiceFactory(tenantId);
  // Implementação da lógica
  return resultado;
}
```

#### 3. Atualizar Enhanced Intent Detector
Adicione exemplos em `lib/ai-agent/enhanced-intent-detector.ts`

## 📝 Logging e Debug

### Nunca Use console.log!

```typescript
// ❌ ERRADO
console.log('Debug info');

// ✅ CORRETO
import { logger } from '@/lib/utils/logger';

logger.info('Operação realizada', { data: relevantData });
logger.error('Erro na operação', { error, context });
logger.warn('Aviso importante', { warning });
logger.debug('Info de debug', { debugData });
```

## 🧪 Testes e Desenvolvimento

### Ambientes de Teste

#### 1. Teste de Conversação Sofia
- **Padrão**: `/dashboard/teste`
- **Enhanced Intent**: `/dashboard/teste-enhanced`

#### 2. Variáveis de Ambiente
```bash
# .env.local (não commitado)
TENANT_ID=seu_tenant_id
OPENAI_API_KEY=sua_chave
FIREBASE_*=credenciais_firebase
WHATSAPP_*=credenciais_whatsapp
```

### Fluxo de Desenvolvimento Recomendado

1. **Criar branch**: `git checkout -b feature/minha-feature`
2. **Desenvolver seguindo padrões**
3. **Testar localmente**: `npm run dev`
4. **Verificar tipos**: `npm run type-check`
5. **Lint**: `npm run lint`
6. **Build de produção**: `npm run build`
7. **Commit com mensagem clara**
8. **Push e criar PR**

## 🚀 Comandos Úteis

```bash
# Desenvolvimento
npm run dev              # Servidor de desenvolvimento

# Qualidade de código
npm run lint            # Verificar linting
npm run type-check      # Verificar tipos TypeScript

# Build e Deploy
npm run build           # Build de produção
npm start              # Iniciar servidor de produção
npm run deploy         # Deploy para produção

# Utilidades
npm run clean          # Limpar cache e builds
npm run health         # Verificar saúde do sistema
```

## 💡 Dicas Importantes

### 1. Sempre Mantenha o Contexto Multi-Tenant
- Nunca acesse coleções diretamente do root
- Sempre use `TenantServiceFactory`
- Valide `tenantId` em todas operações

### 2. Performance
- Use o cache de propriedades (5 min TTL)
- Implemente paginação para listas grandes
- Use `parallel-execution-service` para operações concorrentes

### 3. Segurança
- Sanitize todas entradas do usuário
- Use `validation.ts` para validação
- Nunca exponha dados sensíveis em logs

### 4. UI/UX
- Siga o design system do Material-UI
- Use componentes existentes quando possível
- Mantenha responsividade mobile

### 5. IA e WhatsApp
- Rate limiting: 20 mensagens/minuto
- Sempre teste funções novas no `/dashboard/teste`
- Use Enhanced Intent Detection (100% ativo)

## 📚 Referências Rápidas

### Arquivos Chave
- **Agent Principal**: `lib/ai-agent/sofia-agent.ts`
- **Funções do Agent**: `lib/ai/tenant-aware-agent-functions.ts`
- **Serviços Multi-tenant**: `lib/services/tenant-service-factory.ts`
- **Contexto Global**: `contexts/TenantContext.tsx`
- **Logger**: `lib/utils/logger.ts`
- **Tipos Principais**: `lib/types/`

### Padrões de Código
- TypeScript strict mode
- Async/await ao invés de promises
- Destructuring quando possível
- Interfaces ao invés de types para objetos
- Enums para valores fixos

## 🆘 Suporte e Dúvidas

1. Consulte o `CLAUDE.md` para instruções detalhadas
2. Verifique os exemplos existentes no código
3. Use o logger para debug detalhado
4. Teste no ambiente de desenvolvimento primeiro

---

**Bem-vindo à equipe! 🎉**

Este guia é um documento vivo. Sinta-se à vontade para sugerir melhorias conforme você conhece melhor o projeto.