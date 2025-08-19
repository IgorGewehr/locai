# 🏗️ Arquitetura do Sistema LocAI

## 📋 Sumário Executivo

O **LocAI** é uma plataforma enterprise-grade de gestão imobiliária com IA, construída seguindo os mais modernos padrões arquiteturais de 2025. Este documento detalha nossa arquitetura, decisões técnicas e padrões implementados.

## 🎯 Princípios Arquiteturais

### SOLID Principles
- **S**ingle Responsibility: Cada módulo tem uma única responsabilidade
- **O**pen/Closed: Extensível sem modificação do código existente
- **L**iskov Substitution: Interfaces bem definidas e substituíveis
- **I**nterface Segregation: Interfaces específicas e focadas
- **D**ependency Inversion: Dependências via abstrações, não implementações

### Clean Architecture
```
┌─────────────────────────────────────────────────┐
│                   Presentation                   │
│          (UI Components / Pages / Hooks)         │
├─────────────────────────────────────────────────┤
│                   Application                    │
│        (Use Cases / Services / Controllers)      │
├─────────────────────────────────────────────────┤
│                     Domain                       │
│      (Entities / Value Objects / Aggregates)     │
├─────────────────────────────────────────────────┤
│                 Infrastructure                   │
│     (Database / APIs / External Services)        │
└─────────────────────────────────────────────────┘
```

## 🏭 Arquitetura Proposta: Feature-Sliced Design + DDD

### Estrutura de Diretórios Moderna

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Grupo de rotas autenticadas
│   ├── (public)/            # Grupo de rotas públicas
│   └── api/                 # API Routes
│
├── features/                 # Feature-Sliced Design
│   ├── properties/
│   │   ├── domain/          # Entidades e regras de negócio
│   │   ├── application/     # Use cases e serviços
│   │   ├── infrastructure/  # Repositórios e APIs
│   │   ├── presentation/    # UI components
│   │   └── index.ts         # Public API da feature
│   │
│   ├── reservations/
│   ├── clients/
│   ├── ai-agent/
│   └── whatsapp/
│
├── shared/                   # Código compartilhado
│   ├── ui/                  # Design System
│   │   ├── primitives/      # Componentes base
│   │   ├── components/      # Componentes compostos
│   │   └── layouts/         # Templates de layout
│   │
│   ├── lib/                 # Bibliotecas compartilhadas
│   │   ├── utils/          # Utilitários
│   │   ├── hooks/          # Custom hooks globais
│   │   └── constants/      # Constantes globais
│   │
│   └── api/                # Cliente API compartilhado
│       ├── client.ts
│       └── types.ts
│
├── core/                    # Core do sistema
│   ├── domain/             # Modelos de domínio base
│   ├── ports/              # Interfaces (Portas)
│   ├── adapters/           # Implementações (Adaptadores)
│   └── config/             # Configurações centralizadas
│
└── tests/                  # Testes organizados por tipo
    ├── unit/
    ├── integration/
    └── e2e/
```

## 🚀 Padrões Modernos Implementados

### 1. **Feature-Sliced Design (FSD)**
Cada feature é um módulo independente e autocontido:

```typescript
// features/properties/index.ts - Public API
export { PropertyList } from './presentation/PropertyList';
export { useProperties } from './application/hooks/useProperties';
export { PropertyService } from './application/services/PropertyService';
export type { Property } from './domain/entities/Property';
```

### 2. **Domain-Driven Design (DDD)**

```typescript
// features/properties/domain/entities/Property.ts
export class Property {
  private constructor(
    private readonly id: PropertyId,
    private readonly data: PropertyData
  ) {}

  static create(data: CreatePropertyDTO): Result<Property> {
    // Validação e criação com regras de negócio
  }

  calculatePrice(period: DateRange): Money {
    // Lógica de negócio encapsulada
  }
}

// features/properties/domain/value-objects/Money.ts
export class Money {
  constructor(
    private readonly amount: number,
    private readonly currency: Currency
  ) {
    if (amount < 0) {
      throw new InvalidMoneyError('Amount cannot be negative');
    }
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency);
  }
}
```

### 3. **Repository Pattern com Unit of Work**

```typescript
// core/ports/repositories/IPropertyRepository.ts
export interface IPropertyRepository {
  findById(id: PropertyId): Promise<Property | null>;
  save(property: Property): Promise<void>;
  delete(id: PropertyId): Promise<void>;
}

// features/properties/infrastructure/FirebasePropertyRepository.ts
export class FirebasePropertyRepository implements IPropertyRepository {
  constructor(
    private readonly db: Firestore,
    private readonly mapper: PropertyMapper
  ) {}

  async findById(id: PropertyId): Promise<Property | null> {
    const doc = await this.db.collection('properties').doc(id.value).get();
    return doc.exists ? this.mapper.toDomain(doc.data()) : null;
  }
}
```

### 4. **Use Cases (Application Layer)**

```typescript
// features/properties/application/use-cases/CreatePropertyUseCase.ts
export class CreatePropertyUseCase {
  constructor(
    private readonly propertyRepo: IPropertyRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  async execute(dto: CreatePropertyDTO): Promise<Result<PropertyId>> {
    try {
      // 1. Validação
      const validation = await this.validate(dto);
      if (validation.isFailure) return Result.fail(validation.error);

      // 2. Criar entidade
      const property = Property.create(dto);
      if (property.isFailure) return Result.fail(property.error);

      // 3. Persistir
      await this.propertyRepo.save(property.value);

      // 4. Publicar evento
      await this.eventBus.publish(
        new PropertyCreatedEvent(property.value)
      );

      return Result.ok(property.value.id);
    } catch (error) {
      this.logger.error('Failed to create property', error);
      return Result.fail('Internal error');
    }
  }
}
```

### 5. **Dependency Injection Container**

```typescript
// core/container/Container.ts
export class Container {
  private static instance: Container;
  private services = new Map<symbol, any>();

  register<T>(token: symbol, factory: () => T): void {
    this.services.set(token, factory);
  }

  resolve<T>(token: symbol): T {
    const factory = this.services.get(token);
    if (!factory) throw new Error(`Service ${token.toString()} not found`);
    return factory();
  }
}

// core/container/tokens.ts
export const TOKENS = {
  PropertyRepository: Symbol('PropertyRepository'),
  PropertyService: Symbol('PropertyService'),
  Logger: Symbol('Logger'),
  EventBus: Symbol('EventBus'),
};

// core/container/setup.ts
container.register(TOKENS.PropertyRepository, () => 
  new FirebasePropertyRepository(db, new PropertyMapper())
);
```

### 6. **Event-Driven Architecture**

```typescript
// core/events/EventBus.ts
export class EventBus implements IEventBus {
  private handlers = new Map<string, EventHandler[]>();

  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);
  }

  async publish<T extends DomainEvent>(event: T): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];
    await Promise.all(handlers.map(h => h.handle(event)));
  }
}
```

### 7. **Result Pattern para Error Handling**

```typescript
// shared/lib/Result.ts
export class Result<T> {
  private constructor(
    public readonly isSuccess: boolean,
    public readonly error?: string,
    private readonly _value?: T
  ) {}

  get value(): T {
    if (!this.isSuccess) {
      throw new Error('Cannot get value of failed result');
    }
    return this._value!;
  }

  static ok<U>(value?: U): Result<U> {
    return new Result<U>(true, undefined, value);
  }

  static fail<U>(error: string): Result<U> {
    return new Result<U>(false, error);
  }

  map<U>(fn: (value: T) => U): Result<U> {
    if (!this.isSuccess) return Result.fail(this.error!);
    return Result.ok(fn(this.value));
  }
}
```

### 8. **Specification Pattern**

```typescript
// features/properties/domain/specifications/AvailablePropertySpec.ts
export class AvailablePropertySpecification implements ISpecification<Property> {
  constructor(private readonly dateRange: DateRange) {}

  isSatisfiedBy(property: Property): boolean {
    return property.isAvailableFor(this.dateRange);
  }

  and(spec: ISpecification<Property>): ISpecification<Property> {
    return new AndSpecification(this, spec);
  }
}
```

### 9. **Command Query Responsibility Segregation (CQRS)**

```typescript
// features/properties/application/commands/CreatePropertyCommand.ts
export class CreatePropertyCommand implements ICommand {
  constructor(public readonly data: CreatePropertyDTO) {}
}

// features/properties/application/queries/GetPropertiesQuery.ts
export class GetPropertiesQuery implements IQuery<PropertyDTO[]> {
  constructor(public readonly filters: PropertyFilters) {}
}

// core/cqrs/CommandBus.ts
export class CommandBus {
  async execute<T>(command: ICommand): Promise<Result<T>> {
    const handler = this.resolver.resolve(command);
    return handler.handle(command);
  }
}
```

### 10. **Design System com Tokens**

```typescript
// shared/ui/tokens/index.ts
export const tokens = {
  colors: {
    primary: {
      50: '#e3f2fd',
      500: '#2196f3',
      900: '#0d47a1',
    },
    semantic: {
      error: '#f44336',
      success: '#4caf50',
      warning: '#ff9800',
    }
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  typography: {
    h1: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.2,
    }
  }
} as const;
```

## 🧪 Estratégia de Testes

### Pirâmide de Testes
```
         /\
        /  \  E2E (10%)
       /────\
      /      \  Integration (30%)
     /────────\
    /          \  Unit (60%)
   /────────────\
```

### Exemplo de Teste

```typescript
// tests/unit/features/properties/domain/Property.test.ts
describe('Property Entity', () => {
  describe('create', () => {
    it('should create a valid property', () => {
      const result = Property.create({
        name: 'Beach House',
        price: 1000,
        bedrooms: 3,
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value.name).toBe('Beach House');
    });

    it('should fail with negative price', () => {
      const result = Property.create({
        name: 'Beach House',
        price: -100,
        bedrooms: 3,
      });

      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Price must be positive');
    });
  });
});
```

## 📊 Métricas de Qualidade

### Code Coverage Targets
- Statements: > 80%
- Branches: > 75%
- Functions: > 80%
- Lines: > 80%

### Performance Metrics
- First Contentful Paint: < 1.2s
- Time to Interactive: < 3.5s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1

## 🔄 CI/CD Pipeline

```yaml
# .github/workflows/main.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm ci
      - name: Lint
        run: npm run lint
      - name: Type Check
        run: npm run type-check
      - name: Unit Tests
        run: npm run test:unit
      - name: Integration Tests
        run: npm run test:integration
      - name: Build
        run: npm run build
      - name: E2E Tests
        run: npm run test:e2e
```

## 🚦 Feature Flags

```typescript
// core/feature-flags/FeatureFlags.ts
export class FeatureFlags {
  private flags = new Map<string, boolean>();

  isEnabled(feature: string): boolean {
    return this.flags.get(feature) ?? false;
  }

  // Usage
  if (featureFlags.isEnabled('new-pricing-engine')) {
    return newPricingEngine.calculate();
  }
  return legacyPricingEngine.calculate();
}
```

## 📈 Observabilidade

### Structured Logging
```typescript
// core/observability/Logger.ts
export class StructuredLogger implements ILogger {
  info(message: string, context?: LogContext): void {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...context,
    }));
  }
}
```

### Distributed Tracing
```typescript
// core/observability/Tracer.ts
export class Tracer {
  startSpan(name: string): Span {
    return new Span(name, generateTraceId());
  }
}
```

## 🔐 Security Patterns

### Input Validation
```typescript
// shared/lib/validation/Validator.ts
export class Validator {
  static validate<T>(
    data: unknown,
    schema: Schema<T>
  ): Result<T> {
    const result = schema.safeParse(data);
    if (!result.success) {
      return Result.fail(result.error.message);
    }
    return Result.ok(result.data);
  }
}
```

### Rate Limiting
```typescript
// core/security/RateLimiter.ts
export class RateLimiter {
  private requests = new Map<string, number[]>();

  async checkLimit(
    identifier: string,
    limit: number,
    window: number
  ): Promise<boolean> {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    const recent = requests.filter(t => t > now - window);
    
    if (recent.length >= limit) {
      return false;
    }
    
    recent.push(now);
    this.requests.set(identifier, recent);
    return true;
  }
}
```

## 🎨 Design Patterns Utilizados

1. **Factory Pattern**: Criação de entidades complexas
2. **Repository Pattern**: Abstração de acesso a dados
3. **Unit of Work**: Transações atômicas
4. **Specification Pattern**: Regras de negócio reutilizáveis
5. **Strategy Pattern**: Algoritmos intercambiáveis
6. **Observer Pattern**: Event-driven architecture
7. **Decorator Pattern**: Extensão de funcionalidades
8. **Adapter Pattern**: Integração com serviços externos
9. **Facade Pattern**: Simplificação de APIs complexas
10. **Command Pattern**: Encapsulamento de operações

## 🔄 Migration Strategy

### Phase 1: Structure (Week 1)
- [ ] Criar nova estrutura de diretórios
- [ ] Configurar paths aliases
- [ ] Setup dependency injection

### Phase 2: Core Domain (Week 2)
- [ ] Migrar entidades para DDD
- [ ] Implementar value objects
- [ ] Criar aggregates

### Phase 3: Use Cases (Week 3)
- [ ] Extrair lógica de negócio
- [ ] Implementar command handlers
- [ ] Criar query handlers

### Phase 4: Infrastructure (Week 4)
- [ ] Implementar repositories
- [ ] Configurar event bus
- [ ] Setup observability

## 📚 Referências e Inspirações

- **Clean Architecture** - Robert C. Martin
- **Domain-Driven Design** - Eric Evans
- **Feature-Sliced Design** - Architectural methodology
- **Hexagonal Architecture** - Alistair Cockburn
- **SOLID Principles** - Robert C. Martin
- **Enterprise Integration Patterns** - Gregor Hohpe

## 🎯 Benefícios da Nova Arquitetura

1. **Escalabilidade**: Features independentes e modulares
2. **Testabilidade**: 100% testável com injeção de dependências
3. **Manutenibilidade**: Código organizado e previsível
4. **Performance**: Lazy loading e code splitting otimizados
5. **Developer Experience**: Estrutura clara e intuitiva
6. **Type Safety**: TypeScript rigoroso com validação runtime
7. **Business Focus**: Lógica de negócio isolada e protegida

## 🏆 Impressionando Recrutadores

Esta arquitetura demonstra:
- **Conhecimento de padrões enterprise**
- **Experiência com sistemas complexos**
- **Preocupação com qualidade e manutenibilidade**
- **Visão de longo prazo**
- **Capacidade de liderança técnica**
- **Alinhamento com práticas modernas de 2025**

---

*"Architecture is about the important stuff. Whatever that is."* - Ralph Johnson