# 11 — Settings: hub IA & Atendimento

> **Escopo deste documento.** Como organizar as configurações para o dono configurar **tudo o que os docs 01–10 introduzem** com a **menor fricção possível**: modo de fechamento (toggle), conectar Mercado Pago (OAuth + split), caução/contrato (templates e teto), SLA de resposta, canal de notificação do dono (push / WhatsApp pessoal), orçamento de IA, e ajuste de persona/tom da Sofia. O foco é **reusar a estrutura de settings que já existe** e definir o **modelo de dados de config por tenant** sem renomear nada do que já está no repo. **Este doc é o DONO dos esquemas de config por tenant** (`config/closing`, `config/owner-channel`, `config/ai-budget`, etc.).
>
> Ele respeita à risca os contratos transversais (§4.1–§4.6 da `00-overview.md`) e as 4 decisões travadas. Settings é **transversal contínuo (Fase 4)**: cada seção só fica visível/efetiva quando a feature correspondente (estados, defer/resume, MP, contrato) existe; até lá, o campo persiste mas é inerte.

---

## 1. Princípios de design deste hub

1. **Mínima fricção.** O dono médio é uma imobiliária pequena. Cada tela tem **um objetivo**, defaults sãos (a Sofia funciona sem configurar nada), e o avançado fica recolhido. Nada é obrigatório além do que o onboarding já cobre (imóvel + WhatsApp).
2. **Reuso > greenfield.** A casca de settings (`app/dashboard/settings/layout.tsx` + `page.tsx`), o padrão de rota de API (`app/api/tenant/settings/*`), e os tipos (`lib/types/tenant-settings.ts`, `lib/types/ai-config.ts`) **já existem e são reaproveitados**. Adicionamos seções e documentos de config novos; não reescrevemos o que está lá.
3. **Honestidade na UI (§Princípio 1 da FUNDAÇÃO).** Estado de conexão (MP, contrato) é sempre o estado **real** lido do provedor — nunca um "conectado" otimista. Sem token válido ⇒ "Não conectado".
4. **Copiloto é cidadão de primeira classe.** O toggle de modo de fechamento (`closingMode`) trata IA-finalizadora e Dono-finalizador como iguais; o default é **Dono-finalizador** (`owner`), porque é a modalidade segura e de maior taxa de sucesso na etapa final (Decisão de produto, doc [`02-fechamento-modalidades.md`](./02-fechamento-modalidades.md)).
5. **Multi-tenant sempre.** Toda config vive sob `tenants/{tenantId}/...`, toda rota passa por `validateFirebaseAuth` + `TenantServiceFactory`, todo log mascara PII. Sem exceção.

---

## 2. O que já existe (reuso) vs. o que é novo

### 2.1 Estrutura atual verificada no repo

**UI — `app/dashboard/settings/`:**
- `layout.tsx` — casca com drawer lateral (`SETTINGS_SECTIONS`), breadcrumb e responsividade mobile. **É aqui que registramos as seções novas.**
- `page.tsx` — landing em grid de cards (`SETTINGS_CARDS`). Hoje lista: Empresa, WhatsApp, Inteligência Artificial, Perfil. **É aqui que adicionamos os cards novos.**
- Subpáginas: `ai-config/`, `company/`, `financial/`, `negotiation/`, `policies/`, `profile/`, `whatsapp/`. Note que `financial/page.tsx` é hoje um **redirect** para o landing (banking obsoleto na visão "Sofia só atende"); a **rota de API foi mantida de propósito** — vamos reaproveitar esse padrão.

**API — `app/api/tenant/settings/`:** `company/`, `negotiation/`, `policies/` (cada um `GET`/`PUT`). Padrão consolidado:
- `validateFirebaseAuth(request)` → `tenantId`.
- Leitura/escrita direta de um **doc singleton** via `doc(db, 'tenants', tenantId, <coleção>, <id>)`.
- Zod schema + `sanitizeUserInput`/`removeUndefinedFields` + `handleApiError` + `logger`.
- Merge com `DEFAULT_*` quando o doc não existe.

**Paths de persistência reais (atenção, há duas convenções coexistindo):**

| Config | Path Firestore | Tipo | Observação |
|---|---|---|---|
| Empresa | `tenants/{tid}/config/company-info` | inline em route | `bankInfo` opcional já existe aqui |
| Negociação | `tenants/{tid}/config/negotiation` | `NegotiationSettings` | **fallback legado** `settings/negotiation`, com auto-migração |
| Políticas | `tenants/{tid}/config/policies` | inline em route | inclui `cancellationPolicy`, `termsAndConditions` |
| AI Config (Sofia) | `tenants/{tid}/aiConfig/settings` | `AIConfig` | rota é `/api/ai/config` (não `/api/tenant/settings/*`) — persona/tom moram aqui |

> **Decisão de convenção (travada para os docs novos):** novas configs deste hub vivem sob **`tenants/{tenantId}/config/{docId}`** (mesma coleção `config` de company/negotiation/policies), seguindo o path "novo" já adotado desde Nov/2025. Campos camelCase (§4.6). A persona/tom **continua** em `aiConfig/settings` (`AIConfig.customPrompts`) — não migramos, estendemos.

### 2.2 Mapa do que cada seção do hub configura e onde grava

| Seção (UI) | Doc Firestore | Tipo | Estado | Doc-fonte da feature |
|---|---|---|---|---|
| **Modo de fechamento** | `config/closing` | `ClosingSettings` (novo) | **novo** | [`02-fechamento-modalidades.md`](./02-fechamento-modalidades.md) |
| **Mercado Pago (conectar)** | `config/payments` + `secrets/mercadopago` | `PaymentSettings` (novo) | **novo** | [`03-pagamentos-caucao-mercadopago.md`](./03-pagamentos-caucao-mercadopago.md) |
| **Caução & Contrato** | `config/closing` (caução) + `config/contracts` | `ClosingSettings` + `ContractSettings` (novos) | **novo** | [`03`](./03-pagamentos-caucao-mercadopago.md) (caução), [`04-contratos-assinatura.md`](./04-contratos-assinatura.md) |
| **SLA de resposta** | `config/sla` | `SlaSettings` (novo) | **novo** | [`06-canal-ia-dono.md`](./06-canal-ia-dono.md) |
| **Canal do dono** (push / WhatsApp pessoal) | `config/owner-channel` | `OwnerChannelSettings` (novo) | **novo** | [`06-canal-ia-dono.md`](./06-canal-ia-dono.md) |
| **Orçamento de IA** | `config/ai-budget` | `AiBudgetSettings` (novo) | **novo** | [`09-modelos-custo.md`](./09-modelos-custo.md) (runtime) |
| **Persona / Tom da Sofia** | `aiConfig/settings` (existente) | `AIConfig.customPrompts` (estendido) | **reuso + extensão** | [`12-personas-prompts.md`](./12-personas-prompts.md) (prompts) |
| Empresa / WhatsApp / Perfil / Políticas / Negociação | (existentes) | inalterados | reuso | — |

---

## 3. Modelo de dados de config por tenant (novo)

Todos os tipos abaixo são **novos** em `lib/types/tenant-settings.ts` (mesmo arquivo onde já moram `NegotiationSettings`, `TenantSettings`, etc.). Camelcase, defaults exportados, padrão idêntico ao `DEFAULT_NEGOTIATION_SETTINGS`.

### 3.1 `ClosingSettings` — modo de fechamento, caução e teto

```ts
// lib/types/tenant-settings.ts  (NOVO)
// Persistido em: tenants/{tenantId}/config/closing

export type ClosingMode = 'owner' | 'ia';
// 'owner' = Dono-finalizador (DEFAULT). IA prepara, humano fecha.
// 'ia'    = IA-finalizadora. IA cobra caução, trava iCal, manda contrato.
// NOTA: este é o default global do tenant. Cada conversa tem
// conversations/{id}.closingMode ('ia'|'owner'|null) (§4.3) que herda daqui
// no momento em que entra em FECHAMENTO; null = ainda não decidido.

export interface DepositSettings {
  enabled: boolean;             // exige caução para fechar?
  // teto/valor da caução — em CENTAVOS para casar com deposits.amount (§4.3)
  mode: 'fixed' | 'percentage'; // valor fixo OU % do totalAmount da reserva
  fixedAmount: number;          // centavos (usado se mode==='fixed')
  percentage: number;           // 0-100 (usado se mode==='percentage')
  capAmount: number;            // TETO em centavos (0 = sem teto) — limita o cálculo
  currency: 'BRL';
  refundable: boolean;          // caução reembolsável (informativo p/ contrato/política)
}

export interface ClosingSettings {
  mode: ClosingMode;            // default 'owner'
  deposit: DepositSettings;
  requireContract: boolean;     // contrato obrigatório no fechamento? (liga doc 04-contratos-assinatura.md)
  // Guarda-corpo: se mode==='ia' mas MP não conectado, fechamento IA é
  // rebaixado para 'owner' em runtime (ver §6.3). Aqui só persiste a intenção.
  updatedAt: Date;
  updatedBy?: string;
}

export const DEFAULT_CLOSING_SETTINGS: ClosingSettings = {
  mode: 'owner',
  deposit: {
    enabled: false,
    mode: 'percentage',
    fixedAmount: 0,
    percentage: 20,
    capAmount: 0,
    currency: 'BRL',
    refundable: true,
  },
  requireContract: false,
  updatedAt: new Date(),
};
```

> **Por que `closingMode` é `'ia'|'owner'|null` em `conversations` e `'ia'|'owner'` aqui:** a FUNDAÇÃO (§4.3) fixa `closingMode('ia'|'owner'|null)` no doc de conversa, onde `null` significa "ainda não entrou em fechamento". O default do tenant nunca é `null` — sempre há uma intenção (`'owner'` por padrão). Não renomear nenhum dos dois. **Esquema canônico (este doc é o dono):** `tenants/{tenantId}/config/closing` com `mode: 'ia' | 'owner'` (default `'owner'`); snapshot por conversa em `conversations.closingMode`. Não usar `settings/negotiation` nem `settings/onboarding` para guardar isso.

### 3.2 `PaymentSettings` + segredo MP — conexão Mercado Pago (OAuth + split)

```ts
// lib/types/tenant-settings.ts  (NOVO)
// Persistido em: tenants/{tenantId}/config/payments  (campos PÚBLICOS/seguros)

export type PaymentProvider = 'mercadopago' | 'abacatepay';

export interface MercadoPagoConnection {
  connected: boolean;           // estado REAL derivado de ter refreshToken válido
  mpUserId?: string;            // collector id do dono (recebedor do split)
  accountEmail?: string;        // só para exibir "conectado como X"
  scope?: string;
  connectedAt?: Date;
  lastTokenRefreshAt?: Date;
  livemode?: boolean;           // produção vs sandbox
}

export interface PaymentSettings {
  primaryProvider: PaymentProvider; // 'mercadopago' quando conectado; senão 'abacatepay'
  splitTakeRate: number;            // ~0.01 (1%) — espelha deposits.splitTakeRate (§4.3)
  mercadopago: MercadoPagoConnection;
  updatedAt: Date;
  updatedBy?: string;
}

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  primaryProvider: 'abacatepay',    // coexistência: AbacatePay é o fallback atual
  splitTakeRate: 0.01,
  mercadopago: { connected: false },
  updatedAt: new Date(),
};
```

**Segredos (NUNCA em `config/payments`):** os tokens OAuth do MP vão em um doc separado, **nunca lido pelo cliente**:

```
tenants/{tenantId}/secrets/mercadopago   (server-only; regras Firestore negam read do cliente)
  { accessToken, refreshToken, expiresAt, tokenType, raw }
```

- `config/payments` só guarda **flags e metadados não-sensíveis** (é o que a UI lê).
- `secrets/mercadopago` é lido **apenas server-side** (rotas de pagamento, Functions dos docs [`03`](./03-pagamentos-caucao-mercadopago.md)/[`08`](./08-backend-firebase-functions.md)) e protegido por Firestore Rules (`allow read, write: if false;` para cliente).
- Idempotência de webhook de caução (defesa em camada: log de eventos do provedor `mp_webhook_events/{eventId}` como guarda primária + `deposits.webhookEventIds[]` como guarda de "evento já aplicado àquela caução", docs [`03`](./03-pagamentos-caucao-mercadopago.md)/[`08`](./08-backend-firebase-functions.md)) — **não** vive em settings; settings só guarda credencial e take-rate.

### 3.3 `ContractSettings` — templates e provedor de assinatura

```ts
// lib/types/tenant-settings.ts  (NOVO)
// Persistido em: tenants/{tenantId}/config/contracts

export type ESignProvider = 'zapsign' | 'clicksign';

export interface ContractTemplateRef {
  templateId: string;           // casa com contracts.templateId (§4.3)
  templateVersion: string;      // casa com contracts.templateVersion
  label: string;                // nome amigável p/ o dono
  // slots: nomes dos campos que o LLM preenche (LLM só preenche slots — Decisão 3)
  slots: string[];              // ex.: ['nomeLocatario','cpf','checkIn','valorCaucao']
  isDefault: boolean;
}

export interface ContractSettings {
  enabled: boolean;             // assinatura digital ligada?
  provider: ESignProvider;      // casa com contracts.provider (§4.3)
  // conexão com o provedor — segredo de API vai em secrets/ (não aqui)
  providerConnected: boolean;
  templates: ContractTemplateRef[];
  defaultTemplateId?: string;
  storageRetentionDays: number; // retenção do PDF assinado (compliance)
  updatedAt: Date;
  updatedBy?: string;
}

export const DEFAULT_CONTRACT_SETTINGS: ContractSettings = {
  enabled: false,
  provider: 'zapsign',
  providerConnected: false,
  templates: [],
  storageRetentionDays: 1825,   // 5 anos
  updatedAt: new Date(),
};
```

> O **template é determinístico e versionado** (Decisão 3): o dono escolhe/edita o template no provedor (ZapSign/Clicksign); aqui guardamos só a **referência** (`templateId`+`templateVersion`+`slots`). A chave de API do provedor mora em `tenants/{tid}/secrets/esign` (server-only), nunca em `config/contracts`.

### 3.4 `SlaSettings` — SLA de resposta

```ts
// lib/types/tenant-settings.ts  (NOVO)
// Persistido em: tenants/{tenantId}/config/sla

export interface SlaSettings {
  // SLA da Sofia respondendo o cliente (alerta o dono se estourar)
  firstResponseTargetSeconds: number;   // ex.: 120
  // SLA do canal IA↔Dono: re-ping do dono quando AGUARDANDO_HUMANO (doc 06-canal-ia-dono.md)
  ownerReplyTargetMinutes: number;       // ex.: 15
  ownerRepingEnabled: boolean;           // re-ping automático ao dono?
  ownerRepingEveryMinutes: number;       // intervalo entre re-pings (ex.: 10)
  ownerMaxRepings: number;               // teto de re-pings (ex.: 3)
  // SLA de task diferida 'ask_owner' (defer/resume, §4.2): sem timeout duro,
  // mas com re-ping; 'property_research' usa timeout fixo de 120s (não editável aqui).
  businessHoursOnly: boolean;            // só conta SLA em horário comercial
  updatedAt: Date;
  updatedBy?: string;
}

export const DEFAULT_SLA_SETTINGS: SlaSettings = {
  firstResponseTargetSeconds: 120,
  ownerReplyTargetMinutes: 15,
  ownerRepingEnabled: true,
  ownerRepingEveryMinutes: 10,
  ownerMaxRepings: 3,
  businessHoursOnly: false,
  updatedAt: new Date(),
};
```

> **Trava de custo (§4.5):** o SLA **não** controla escolha de modelo. O `property_research` timeout de 120s é fixado na fila (doc [`08`](./08-backend-firebase-functions.md)), não exposto aqui — evita o dono se dar um tiro no pé estendendo um job `DEEP` caro (tier `DEEP`/`MODEL_DEEP` é definido no doc [`09`](./09-modelos-custo.md)). Apenas o re-ping do dono (`ask_owner`) é configurável.

### 3.5 `OwnerChannelSettings` — canal de notificação do dono (push / WhatsApp pessoal)

```ts
// lib/types/tenant-settings.ts  (NOVO)
// Persistido em: tenants/{tenantId}/config/owner-channel

export type OwnerNotifChannel = 'push' | 'whatsapp' | 'both';

export interface OwnerChannelSettings {
  // número PESSOAL do dono (DIFERENTE do número de atendimento do WhatsApp microservice)
  ownerWhatsappPhone?: string;     // E.164; normalizado via normalizeBlockPhone no uso
  channel: OwnerNotifChannel;      // push, whatsapp pessoal, ou ambos
  pushEnabled: boolean;            // push web/app (token em config/owner-channel/pushTokens)
  // gatilhos: quando a IA "chama o dono" (doc 06-canal-ia-dono.md / estado AGUARDANDO_HUMANO)
  alertOnClosingSignal: boolean;   // cliente sinalizou fechamento
  alertOnEscalation: boolean;      // IA escalou (notify_owner)
  alertOnSlaBreach: boolean;       // SLA de resposta estourado
  quietHoursEnabled: boolean;
  quietHoursStart?: string;        // "22:00"
  quietHoursEnd?: string;          // "08:00"
  updatedAt: Date;
  updatedBy?: string;
}

export const DEFAULT_OWNER_CHANNEL_SETTINGS: OwnerChannelSettings = {
  channel: 'both',
  pushEnabled: true,
  alertOnClosingSignal: true,
  alertOnEscalation: true,
  alertOnSlaBreach: true,
  quietHoursEnabled: false,
  updatedAt: new Date(),
};
```

> **Reuso (§4.4):** "IA chama o dono" reusa `notify_owner` + estado `AGUARDANDO_HUMANO`. Este doc só guarda **para onde** e **quando** notificar; o **como** (push + WhatsApp pessoal + deep-link, outbound idempotente) é o doc [`06`](./06-canal-ia-dono.md). **Esquema canônico (este doc é o dono):** `tenants/{tenantId}/config/owner-channel` com `ownerWhatsappPhone` (string normalizada via `normalizeBlockPhone`), `channel`, `alertOn*`, `quietHours`. Não usar `settings/owner-channel` nem o campo `personalPhone`. O número pessoal do dono é **distinto** do número de atendimento (que vive em `settings/whatsapp`). Push tokens em subdoc separado para não inflar o doc de config.

### 3.6 `AiBudgetSettings` — orçamento de IA (limites de custo)

```ts
// lib/types/tenant-settings.ts  (NOVO)
// Persistido em: tenants/{tenantId}/config/ai-budget

export interface AiBudgetSettings {
  monthlyLimitUsd: number;      // teto de gasto mensal com IA (USD); 0 = sem teto
  softLimitPct: number;         // 0-100; % do teto que dispara alerta ao dono (ex.: 80)
  modelDeep: boolean;           // permite usar o tier DEEP (jobs caros)? default false
  updatedAt: Date;
  updatedBy?: string;
}

export const DEFAULT_AI_BUDGET_SETTINGS: AiBudgetSettings = {
  monthlyLimitUsd: 0,
  softLimitPct: 80,
  modelDeep: false,
  updatedAt: new Date(),
};
```

> **Divisão de responsabilidade (este doc só expõe os limites):** `config/ai-budget`
> guarda apenas a **intenção** do dono (`monthlyLimitUsd`, `softLimitPct`, `modelDeep`).
> A **contabilidade em runtime** — coleção `ai_usage`, rollup por período, e a decisão
> de quando o tier `DEEP`/`MODEL_DEEP` é elegível — é definida no doc
> [`09-modelos-custo.md`](./09-modelos-custo.md), que é a **única fonte de verdade**
> do tier DEEP e do nome `MODEL_DEEP`. Settings só consome/referencia.
>
> **Kill-switch de custo:** ao estourar `monthlyLimitUsd` (hard limit), o runtime
> dispara a transição `* -> MANUAL` (já consta no `00-overview.md` §4.1) — a IA para
> e o atendimento cai para o dono. `softLimitPct` apenas **alerta** o dono (via canal
> do dono, doc [`06`](./06-canal-ia-dono.md)) sem interromper. `modelDeep=false`
> impede que jobs `DEEP` sejam disparados independentemente do teto.

### 3.7 Persona / Tom — extensão de `AIConfig.customPrompts` (reuso)

**Não criar tipo novo.** A persona/tom da Sofia já vive em `lib/types/ai-config.ts` → `AIConfig.customPrompts` (`tone: 'formal'|'casual'|'friendly'`, `welcome`, `companyName`, `companyValues`, `specialInstructions`), persistido em `tenants/{tid}/aiConfig/settings` via `/api/ai/config`. A página `ai-config/page.tsx` **já edita esses campos**.

Extensão mínima sugerida (aditiva, nunca renomear — §4.3/§4.6):

```ts
// lib/types/ai-config.ts  — adicionar a CustomPrompts (OPCIONAL, retrocompatível)
export interface CustomPrompts {
  welcome?: string;
  companyName?: string;
  companyValues?: string;
  tone?: 'formal' | 'casual' | 'friendly';
  specialInstructions?: string;
  // NOVOS (opcionais):
  warmth?: 'low' | 'medium' | 'high';   // intensidade do "fofinho/atencioso" da Sofia
  emojiUsage?: 'none' | 'light';         // controle de emoji na voz da Sofia (cliente)
}
```

> O agente lê esses campos via `read_system`/`get-tenant-config` no boot do turno e injeta no prompt da Sofia (doc [`12-personas-prompts.md`](./12-personas-prompts.md)/`prompts.py`). Tom afeta **só** a voz da Sofia para o cliente — a persona **Analista** (canal do dono) permanece factual e honesta (§Princípio 1), não herda `warmth`.

---

## 4. Estrutura de navegação do hub (UI)

### 4.1 Reorganização proposta do drawer (`SETTINGS_SECTIONS` em `layout.tsx`)

Mantemos as seções atuais e **agrupamos** as novas sob duas famílias claras, para reduzir fricção cognitiva:

```
Configurações
├─ Atendimento (IA)
│   ├─ Sofia (persona/tom)        → /dashboard/settings/ai-config        [REUSO]
│   ├─ Modo de fechamento         → /dashboard/settings/closing          [NOVO]
│   ├─ SLA de resposta            → /dashboard/settings/sla              [NOVO]
│   ├─ Canal do dono              → /dashboard/settings/owner-channel     [NOVO]
│   └─ Orçamento de IA            → /dashboard/settings/ai-budget         [NOVO]
├─ Fechamento & Cobrança
│   ├─ Mercado Pago               → /dashboard/settings/payments          [NOVO]
│   ├─ Caução                     → (dentro de closing)                   [NOVO]
│   └─ Contrato & Assinatura      → /dashboard/settings/contracts         [NOVO]
└─ Conta & Negócio
    ├─ Empresa                    → /dashboard/settings/company           [REUSO]
    ├─ WhatsApp                   → /dashboard/settings/whatsapp          [REUSO]
    ├─ Políticas                  → /dashboard/settings/policies          [REUSO]
    ├─ Negociação                 → /dashboard/settings/negotiation       [REUSO]
    └─ Perfil                     → /dashboard/settings/profile           [REUSO]
```

Implementação: estender o array `SETTINGS_SECTIONS` (e os `SETTINGS_CARDS` do `page.tsx`) com as entradas novas. O `layout.tsx` já suporta `badge`/`badgeColor` por seção — usamos para sinalizar estado de conexão (ver §4.3). A estética segue o padrão atual (cards `#111827`, indigo escuro, sem emojis na UI; remover a dica com emoji do footer do `layout.tsx` para aderir à preferência de UI).

### 4.2 Páginas novas (todas client components MUI, padrão `ai-config/page.tsx`)

Cada página: `useTenant()` → `fetch(GET)` no mount → estado local → `fetch(PUT)` no salvar, com `CircularProgress` no load e toast de sucesso/erro. Sem libs novas.

- `app/dashboard/settings/closing/page.tsx` — toggle `mode` (segmented `owner`/`ia`) + bloco de caução (enabled, mode fixed/%, valor, **teto**) + `requireContract`.
- `app/dashboard/settings/payments/page.tsx` — card "Mercado Pago": estado de conexão + botão **Conectar** (inicia OAuth) / **Desconectar** + linha "AbacatePay (ativo como fallback)".
- `app/dashboard/settings/contracts/page.tsx` — toggle `enabled`, seletor de provedor, lista de templates (`templateId`/`version`/`slots`), default, retenção.
- `app/dashboard/settings/sla/page.tsx` — alvos de resposta e re-ping do dono.
- `app/dashboard/settings/owner-channel/page.tsx` — número pessoal, canal, gatilhos, quiet hours, botão "Enviar teste".
- `app/dashboard/settings/ai-budget/page.tsx` — teto mensal (USD), alerta soft (%), toggle de tier DEEP; mostra consumo do período lido de `ai_usage` (runtime do doc [`09`](./09-modelos-custo.md)).

### 4.3 Badges de estado (honestidade visual)

O drawer mostra badge por seção, computado do estado **real**:
- Mercado Pago: `connected===true` → badge "Conectado" (success); senão "Não conectado" (warning).
- Contrato: `enabled && providerConnected` → "Ativo"; senão "Inativo".
- Modo de fechamento: badge "IA" ou "Dono" refletindo `closingMode`.

---

## 5. APIs novas (padrão `app/api/tenant/settings/*`)

Cada nova config singleton ganha uma rota `GET`/`PUT` espelhando exatamente o padrão de `company`/`negotiation`/`policies`. Assinaturas:

```ts
// app/api/tenant/settings/closing/route.ts        → config/closing      (ClosingSettings)
// app/api/tenant/settings/payments/route.ts        → config/payments     (PaymentSettings, SEM segredos)
// app/api/tenant/settings/contracts/route.ts       → config/contracts    (ContractSettings)
// app/api/tenant/settings/sla/route.ts             → config/sla          (SlaSettings)
// app/api/tenant/settings/owner-channel/route.ts   → config/owner-channel(OwnerChannelSettings)
// app/api/tenant/settings/ai-budget/route.ts        → config/ai-budget    (AiBudgetSettings)

export async function GET(request: NextRequest): Promise<NextResponse>;  // → { success, data, isDefault }
export async function PUT(request: NextRequest): Promise<NextResponse>;   // body validado por Zod, merge + setDoc
```

Regras em todas:
1. `validateFirebaseAuth(request)` → 401 se `!authenticated || !tenantId`.
2. Zod schema espelhando o tipo; `sanitizeUserInput` em texto livre; `removeUndefinedFields` antes do `setDoc`.
3. `setDoc(doc(db,'tenants',tenantId,'config',<id>), {...merged, updatedAt: serverTimestamp(), updatedBy: userId})`.
4. `logger.info` com `tenantId` mascarado; `handleApiError` no catch.
5. **`payments` PUT nunca aceita token.** Tokens só entram pelo callback OAuth (§6.1). O PUT de `payments` só edita `splitTakeRate`/`primaryProvider` (flags).

### 5.1 Rotas OAuth do Mercado Pago (novas — não são `settings/*` puras)

```ts
// app/api/payments/mercadopago/connect/route.ts
//   GET  → autentica dono, gera state (CSRF) atrelado ao tenantId em Redis (SET NX EX),
//          redireciona para a tela de autorização OAuth do MP (scope: read+write+offline_access).

// app/api/payments/mercadopago/callback/route.ts
//   GET  → MP redireciona com ?code&state. Valida state↔tenantId (Redis), troca code por
//          access/refresh token, grava em tenants/{tid}/secrets/mercadopago (server-only),
//          atualiza config/payments.mercadopago.{connected:true,mpUserId,accountEmail,...},
//          seta primaryProvider='mercadopago'. Redireciona p/ /dashboard/settings/payments.

// app/api/payments/mercadopago/disconnect/route.ts
//   POST → revoga/limpa secrets/mercadopago, config/payments.mercadopago.connected=false,
//          primaryProvider volta a 'abacatepay'.
```

> O **refresh** do token e o **split** em si pertencem ao doc [`03`](./03-pagamentos-caucao-mercadopago.md) (idealmente já em Firebase Functions, doc [`08`](./08-backend-firebase-functions.md), Decisão 2). Settings só **inicia/encerra** a conexão e expõe o estado.

---

## 6. Fluxos passo a passo

### 6.1 Conectar Mercado Pago (OAuth) — diagrama de sequência

```
Dono            UI(payments)        locai /connect        Mercado Pago        locai /callback     Firestore
 |  clica          |                    |                      |                   |                  |
 |  "Conectar" ───▶|                    |                      |                   |                  |
 |                 | GET /connect ─────▶|                      |                   |                  |
 |                 |                    | state=rand; Redis SET NX EX               |                  |
 |                 |                    |  mp_oauth:{state}={tid} (TTL 10min)       |                  |
 |                 |                    | 302 → MP authorize?client_id&state&scope  |                  |
 |                 |◀────────── redirect to MP ───────────────▶|                   |                  |
 |  autoriza ─────────────────────────────────────────────────▶|                   |                  |
 |                 |                    |                      | 302 → /callback?code&state           |
 |                 |                    |                      |───────────────────▶|                  |
 |                 |                    |                      |                   | validate state↔tid|
 |                 |                    |                      |◀─ POST /oauth/token (code) ──         |
 |                 |                    |                      |── {access,refresh,mpUserId} ─▶|        |
 |                 |                    |                      |                   | setDoc secrets/mercadopago
 |                 |                    |                      |                   | update config/payments ─▶ |
 |                 |◀───────── 302 → /settings/payments (badge "Conectado") ───────|                  |
```

Idempotência/segurança: `state` é one-time (Redis `SET NX EX`, consumido no callback). Token nunca toca o cliente. Estado de conexão lido sempre de `config/payments` (que é derivado de `secrets/`).

### 6.2 Alternar modo de fechamento (toggle)

```
Dono ─ toggle owner⇄ia ─▶ UI closing ─ PUT /api/tenant/settings/closing ─▶ Zod ─▶ merge ─▶
  setDoc config/closing {mode} ─▶ 200.
Efeito: a partir daqui, NOVAS conversas que entram em FECHAMENTO herdam
conversations/{id}.closingMode = config/closing.mode (no momento da transição, doc 02-fechamento-modalidades.md).
Conversas JÁ em FECHAMENTO mantêm seu closingMode (não reescreve histórico).
```

### 6.3 Guarda-corpo: modo `ia` sem MP conectado

```
Conversa entra em FECHAMENTO + config/closing.mode === 'ia'
        │
        ▼
  config/payments.mercadopago.connected === true ?
        │ sim → segue IA-finalizadora (cobra caução via MP split, doc 03-pagamentos-caucao-mercadopago.md)
        │
        └ não → REBAIXA para 'owner' nesta conversa:
                 conversations/{id}.closingMode='owner',
                 estado → AGUARDANDO_HUMANO, dispara canal do dono (doc 06-canal-ia-dono.md),
                 loga warning. (Honestidade: nunca prometer cobrança sem provedor.)
```

> Trade-off explícito: rebaixar silenciosamente vs. bloquear o toggle `ia` na UI até MP conectado. **Recomendação:** permitir salvar a intenção `ia` (menos fricção no onboarding), mas (a) mostrar aviso inline na página `closing` ("Conecte o Mercado Pago para ativar o fechamento pela IA") e (b) rebaixar em runtime. Assim o dono configura na ordem que quiser.

### 6.4 Definir caução com teto

```
Dono em closing: deposit.enabled=true, mode='percentage', percentage=20, capAmount=300000 (R$3.000)
No fechamento (doc 02-fechamento-modalidades.md / 03-pagamentos-caucao-mercadopago.md) o valor da caução é:
  base = (mode==='fixed') ? fixedAmount
                          : round(reservation.totalAmount_centavos * percentage/100)
  amount = (capAmount>0) ? min(base, capAmount) : base
  → cria deposits/{depositId} com amount, currency 'BRL', provider, splitTakeRate (§4.3).
```

### 6.5 Configurar canal do dono + teste

```
Dono em owner-channel: preenche ownerWhatsappPhone, channel='both', gatilhos.
PUT /api/tenant/settings/owner-channel → config/owner-channel.
Botão "Enviar teste" → POST /api/tenant/settings/owner-channel/test
  → reusa o orquestrador de outbound do canal do dono (doc 06-canal-ia-dono.md): envia push + 1 msg
    WhatsApp ao número pessoal com deep-link de exemplo. Idempotente por um testId.
```

---

## 7. Como settings alimenta o runtime (leitura pelo agente e webhook)

- **Webhook / dispatch** (`app/api/webhook/whatsapp-microservice`): já checa `isAiBlocked`. Passa a também respeitar, quando as features existirem, `config/sla` (start do timer de SLA) e, na transição para `FECHAMENTO`, herdar `config/closing.mode`.
- **Agente (Sofia)**: lê persona/tom de `aiConfig/settings.customPrompts` (via `read_system`/`get-tenant-config`) e injeta no prompt (doc [`12`](./12-personas-prompts.md)/`prompts.py`). Nada de modelo é escolhido por settings — tiers (`MODEL_DEEP`) são fixados em `config.py` (§4.5), fonte de verdade no doc [`09`](./09-modelos-custo.md).
- **Canal do dono** (doc [`06`](./06-canal-ia-dono.md)): lê `config/owner-channel` para decidir push vs WhatsApp pessoal, quiet hours e gatilhos; lê `config/sla` para re-ping.
- **Orçamento de IA** (doc [`09`](./09-modelos-custo.md)): lê `config/ai-budget` (`monthlyLimitUsd`, `softLimitPct`, `modelDeep`) e contabiliza em `ai_usage`; estourar o hard limit dispara `* -> MANUAL` (§4.1).
- **Pagamentos** (doc [`03`](./03-pagamentos-caucao-mercadopago.md)): lê `secrets/mercadopago` (server-only) + `config/payments.splitTakeRate`; nunca lê token do cliente.
- **Contrato** (doc [`04`](./04-contratos-assinatura.md)): lê `config/contracts` para template/versão/slots e `secrets/esign` para a chave.

Tudo via `TenantServiceFactory`/`tenantId` (§4.6). Functions incrementais (doc [`08`](./08-backend-firebase-functions.md)) leem os mesmos docs com a mesma HMAC/logging.

---

## 8. Trade-offs e riscos

1. **Duas convenções de path coexistindo** (`config/*` novo vs `settings/*` legado, e `aiConfig/settings` à parte). **Risco:** confusão e leitura no path errado. **Mitigação:** docs novos sempre em `config/*` (decidido §2.1); persona permanece em `aiConfig/settings` por compat; a migração negotiation→config já tem precedente de auto-migração no GET. Não unificar agora (big-bang arriscado, Decisão 2 = incremental).
2. **Segredos no Firestore.** Tokens MP/e-sign em `secrets/*`. **Risco:** vazamento se Rules estiverem frouxas. **Mitigação:** Rules `if false` para cliente; acesso só server-side/Functions; considerar Secret Manager quando migrar a Functions (doc [`08`](./08-backend-firebase-functions.md)).
3. **Default `closingMode='owner'`.** Pode frustrar quem quer automação total. **Mitigação:** onboarding pergunta a preferência em 1 toque; copiloto é decisão de produto travada (Princípio 2).
4. **Toggle `ia` salvável sem MP** (§6.3). **Risco:** dono acha que está cobrando e não está. **Mitigação:** aviso inline + badge "Não conectado" + rebaixamento honesto em runtime + log.
5. **Número pessoal do dono confundido com número de atendimento.** **Mitigação:** campos/telas separados, label explícito ("seu WhatsApp pessoal, onde a Sofia te chama").
6. **Quiet hours vs urgência de fechamento.** Silenciar pode atrasar um lead quente. **Mitigação:** `alertOnClosingSignal` pode furar quiet hours (decisão do doc [`06`](./06-canal-ia-dono.md)); deixar isso explícito na UI.
7. **`updatedAt: Date` no tipo vs `serverTimestamp()` na escrita.** Mesma divergência já existente em `TenantSettings`. **Mitigação:** manter o padrão atual (tipo `Date`, grava `serverTimestamp`, lê via conversão) para consistência — não introduzir um padrão novo.

---

## 9. Checklist de implementação (Fase 4, incremental)

- [ ] Estender `lib/types/tenant-settings.ts`: `ClosingSettings`, `PaymentSettings`, `ContractSettings`, `SlaSettings`, `OwnerChannelSettings`, `AiBudgetSettings` + `DEFAULT_*`.
- [ ] Estender `lib/types/ai-config.ts`: `CustomPrompts.warmth`, `emojiUsage` (opcionais).
- [ ] Rotas API: `closing`, `payments`, `contracts`, `sla`, `owner-channel`, `ai-budget` (`GET`/`PUT`) sob `app/api/tenant/settings/`.
- [ ] Rotas OAuth MP: `connect`, `callback`, `disconnect` sob `app/api/payments/mercadopago/`.
- [ ] Firestore Rules: negar cliente em `tenants/{tid}/secrets/**`.
- [ ] UI: páginas novas + registrar em `SETTINGS_SECTIONS` (`layout.tsx`) e `SETTINGS_CARDS` (`page.tsx`); badges de estado; remover emoji do footer.
- [ ] Onboarding: passo opcional "modo de fechamento" (1 toque) + CTA "conectar Mercado Pago".
- [ ] Wiring runtime: webhook herda `closingMode` na transição p/ `FECHAMENTO`; canal do dono lê `owner-channel`/`sla`; pagamentos lê `secrets/mercadopago`.

---

### Referências cruzadas
[`00-overview.md`](./00-overview.md) (contratos §4.1–§4.6, 4 decisões) · [`02-fechamento-modalidades.md`](./02-fechamento-modalidades.md) (modos de fechamento, caução) · [`03-pagamentos-caucao-mercadopago.md`](./03-pagamentos-caucao-mercadopago.md) (Mercado Pago split, caução, webhook) · [`04-contratos-assinatura.md`](./04-contratos-assinatura.md) (contratos/assinatura) · [`06-canal-ia-dono.md`](./06-canal-ia-dono.md) (canal do dono, SLA, alertas) · [`08-backend-firebase-functions.md`](./08-backend-firebase-functions.md) (Functions, fila/worker) · [`09-modelos-custo.md`](./09-modelos-custo.md) (tiers, `MODEL_DEEP`, `ai_usage` runtime) · [`12-personas-prompts.md`](./12-personas-prompts.md) (persona/tom). Código real ancorado: `app/dashboard/settings/{layout,page,ai-config,company,...}.tsx`, `app/api/tenant/settings/{company,negotiation,policies}/route.ts`, `app/api/ai/config/route.ts`, `lib/types/{tenant-settings,ai-config}.ts`.
