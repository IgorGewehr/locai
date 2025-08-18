# 🚀 Guia de Migração para Arquitetura Enterprise

## 📋 Visão Geral

Este guia detalha como migrar o projeto atual para a nova arquitetura enterprise baseada em:
- **Clean Architecture** + **DDD** (Domain-Driven Design)
- **Feature-Sliced Design** para organização de código
- **SOLID Principles** e padrões enterprise
- **Dependency Injection** e **Event-Driven Architecture**

## 🎯 Benefícios da Migração

### Para Recrutadores
- ✅ **Arquitetura de nível sênior/staff engineer**
- ✅ **Padrões enterprise reconhecidos mundialmente**
- ✅ **Código altamente testável e maintível**
- ✅ **Escalabilidade para grandes equipes**

### Para Desenvolvimento
- ✅ **Separação clara de responsabilidades**
- ✅ **Código mais limpo e previsível**
- ✅ **Testes unitários 10x mais fáceis**
- ✅ **Onboarding de novos desenvolvedores mais rápido**

## 📅 Plano de Migração (4 Semanas)

### Semana 1: Fundação
```bash
# 1. Criar nova estrutura de diretórios
mkdir -p src/{core,features,shared,tests}/{domain,application,infrastructure,presentation}

# 2. Configurar path aliases no tsconfig.json
# 3. Setup do container de DI
# 4. Migrar utilitários básicos
```

### Semana 2: Core Domain
```bash
# 1. Implementar entidades de domínio (Property, Reservation, Client)
# 2. Criar value objects (Money, Address, Email, etc.)
# 3. Implementar eventos de domínio
# 4. Criar especificações de negócio
```

### Semana 3: Application Layer
```bash
# 1. Extrair use cases das páginas/componentes
# 2. Implementar command/query handlers
# 3. Criar interfaces de repositório
# 4. Setup do event bus
```

### Semana 4: Infrastructure & UI
```bash
# 1. Implementar repositórios com Firebase
# 2. Migrar componentes para nova estrutura
# 3. Configurar testes unitários
# 4. Documentation e cleanup
```

## 🛠️ Passos Detalhados

### 1. Configuração Inicial

#### 1.1 Atualizar tsconfig.json
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/core/*": ["./src/core/*"],
      "@/features/*": ["./src/features/*"],
      "@/shared/*": ["./src/shared/*"],
      "@/tests/*": ["./src/tests/*"]
    }
  }
}
```

#### 1.2 Configurar Jest
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx)',
    '<rootDir>/src/**/*.(test|spec).(ts|tsx)',
  ],
  collectCoverageFrom: [
    'src/**/*.(ts|tsx)',
    '!src/**/*.d.ts',
    '!src/tests/**/*',
  ],
};
```

### 2. Migração das Features

#### 2.1 Identificar Bounded Contexts
```
Contextos Identificados:
├── Properties (Gestão de Imóveis)
├── Reservations (Gestão de Reservas) 
├── Clients (Gestão de Clientes)
├── AI-Agent (Sofia - Agente de IA)
├── WhatsApp (Integração WhatsApp)
├── Billing (Faturamento)
├── Analytics (Métricas e Relatórios)
└── MiniSite (Sites públicos)
```

#### 2.2 Estrutura de Feature
```
features/properties/
├── domain/
│   ├── entities/
│   │   └── Property.ts
│   ├── value-objects/
│   │   ├── PropertyId.ts
│   │   ├── Money.ts
│   │   └── Address.ts
│   ├── events/
│   │   └── PropertyCreatedEvent.ts
│   └── specifications/
│       └── PropertySpecification.ts
├── application/
│   ├── use-cases/
│   │   ├── CreatePropertyUseCase.ts
│   │   └── SearchPropertiesUseCase.ts
│   └── ports/
│       └── IPropertyRepository.ts
├── infrastructure/
│   ├── FirebasePropertyRepository.ts
│   └── mappers/
│       └── PropertyMapper.ts
├── presentation/
│   ├── components/
│   │   ├── PropertyList.tsx
│   │   └── PropertyCard.tsx
│   └── hooks/
│       └── useProperties.ts
└── index.ts (Public API)
```

### 3. Migração de Componentes Existentes

#### 3.1 Exemplo: PropertyList
```typescript
// ANTES: components/organisms/property/PropertyList.tsx
export function PropertyList({ properties, onSelect }) {
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Business logic misturada com UI
    const fetchProperties = async () => {
      setLoading(true);
      const response = await fetch('/api/properties');
      const data = await response.json();
      // ... more logic
    };
  }, []);

  return (
    <div>
      {properties.map(property => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  );
}

// DEPOIS: features/properties/presentation/components/PropertyList.tsx
export function PropertyList({ onPropertySelect }: PropertyListProps) {
  const { properties, loading, searchProperties } = useProperties();
  
  return (
    <div>
      {properties.map(property => (
        <PropertyCard 
          key={property.id} 
          property={property} 
          onSelect={onPropertySelect}
        />
      ))}
    </div>
  );
}

// features/properties/presentation/hooks/useProperties.ts
export function useProperties() {
  const [state, setState] = useState<PropertyState>({ 
    properties: [], 
    loading: false 
  });
  
  const searchProperties = useCallback(async (filters: PropertyFilters) => {
    setState(prev => ({ ...prev, loading: true }));
    
    // Use case através do container
    const useCase = container.resolve<SearchPropertiesUseCase>(
      TOKENS.SearchPropertiesUseCase
    );
    
    const result = await useCase.execute(filters);
    
    if (result.isSuccess) {
      setState({ properties: result.value, loading: false });
    }
  }, []);

  return { ...state, searchProperties };
}
```

### 4. Migração de APIs

#### 4.1 Exemplo: Properties API
```typescript
// ANTES: app/api/properties/route.ts
export async function GET(request: Request) {
  try {
    // Logic misturada - validação, business logic, persistência
    const url = new URL(request.url);
    const city = url.searchParams.get('city');
    
    const snapshot = await db.collection('properties').get();
    const properties = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return NextResponse.json({ success: true, data: properties });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}

// DEPOIS: app/api/properties/route.ts
export async function GET(request: Request) {
  try {
    // Parse e validação
    const { searchParams } = new URL(request.url);
    const filters = PropertyFiltersSchema.parse({
      city: searchParams.get('city'),
      minPrice: searchParams.get('minPrice'),
      // ... outros filtros
    });

    // Executar use case
    const useCase = container.resolve<SearchPropertiesUseCase>(
      TOKENS.SearchPropertiesUseCase
    );
    
    const result = await useCase.execute(filters);
    
    if (result.isFailure) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Mapper para DTOs
    const propertyDTOs = result.value.map(property => 
      PropertyMapper.toDTO(property)
    );

    return NextResponse.json({ 
      success: true, 
      data: propertyDTOs 
    });
  } catch (error) {
    logger.error('Failed to search properties', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 5. Configuração de Testes

#### 5.1 Setup de Testes
```typescript
// src/tests/setup.ts
import '@testing-library/jest-dom';
import { setupTestContainer } from '@/core/container/setup';

// Configure test container before each test
beforeEach(() => {
  setupTestContainer();
});
```

#### 5.2 Exemplo de Teste de Use Case
```typescript
// src/tests/unit/features/properties/application/CreatePropertyUseCase.test.ts
describe('CreatePropertyUseCase', () => {
  let useCase: CreatePropertyUseCase;
  let mockRepository: jest.Mocked<IPropertyRepository>;
  let mockEventBus: jest.Mocked<IEventBus>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findByNameAndAddress: jest.fn(),
    };
    
    mockEventBus = {
      publish: jest.fn(),
    };
    
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    useCase = new CreatePropertyUseCase(
      mockRepository,
      mockEventBus,
      mockLogger
    );
  });

  it('should create property successfully', async () => {
    // Arrange
    mockRepository.findByNameAndAddress.mockResolvedValue(null);
    
    const dto: CreatePropertyDTO = {
      name: 'Test Property',
      // ... other properties
    };

    // Act
    const result = await useCase.execute(dto);

    // Assert
    expect(result.isSuccess).toBe(true);
    expect(mockRepository.save).toHaveBeenCalled();
    expect(mockEventBus.publish).toHaveBeenCalled();
  });
});
```

## 🔧 Scripts de Migração

### 1. Script de Setup Inicial
```bash
#!/bin/bash
# scripts/setup-new-architecture.sh

echo "🚀 Setting up new architecture..."

# Create directory structure
mkdir -p src/{core,features,shared,tests}/{domain,application,infrastructure,presentation}

# Copy existing files to new structure
echo "📁 Moving existing files..."

# Move components
mv components/* src/shared/ui/
mv lib/* src/shared/lib/

# Create feature directories
mkdir -p src/features/{properties,reservations,clients,ai-agent,whatsapp}

echo "✅ Directory structure created!"
```

### 2. Script de Migração de Componentes
```typescript
// scripts/migrate-components.ts
import fs from 'fs';
import path from 'path';

// Script para migrar componentes automaticamente
// Identifica padrões e move para a nova estrutura
```

## 📈 Métricas de Sucesso

### Antes da Migração
- ❌ Testes unitários: 20%
- ❌ Componentes acoplados
- ❌ Lógica de negócio espalhada
- ❌ Difícil adicionar features

### Depois da Migração
- ✅ Testes unitários: 80%+
- ✅ Componentes desacoplados
- ✅ Lógica de negócio centralizada
- ✅ Features independentes

## 🚀 Próximos Passos

1. **Semana 1**: Executar setup inicial
2. **Semana 2**: Migrar feature Properties
3. **Semana 3**: Migrar features Reservations e Clients
4. **Semana 4**: Migrar AI Agent e WhatsApp

## 📚 Recursos Adicionais

- [Clean Architecture - Uncle Bob](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Feature-Sliced Design](https://feature-sliced.design/)
- [SOLID Principles](https://www.digitalocean.com/community/conceptual_articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design)

---

*"The goal of software architecture is to minimize the human resources required to build and maintain the required system."* - Robert C. Martin