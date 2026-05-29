# 08 — Backend: migração incremental para Firebase Functions

> **Decisão travada (#2):** o backend migra para **Firebase Functions de forma INCREMENTAL**. O novo/pesado/assíncrono/sensível vai primeiro; o resto continua no Next.js (App Router, `app/api/*`) e migra aos poucos. **Não é big-bang.**
>
> **Estado real do repo (verificado):** **não existe** pasta `functions/` hoje. Toda a lógica server-side está em rotas Next.js sob `app/api/*`. Crons rodam pela Vercel (`vercel.json`) e por rota (`app/api/cron/sync-abacatepay`, `app/api/calendar/sync/cron`). `firebase.json` configura apenas `storage`, `hosting` e `firestore` — **sem bloco `functions`**. O acesso a dados no Next.js usa o **Firebase client SDK** (`firebase/firestore`) via `TenantServiceFactory` (`lib/firebase/firestore-v2.ts`). Deploy de produção é **Docker + Cloudflare Tunnel** (container `7070` → host `8084`, `alugazap.tensorroot.com`).
>
> Este documento define **o que vai pras Functions primeiro e por quê**, a **arquitetura** (estrutura de pastas, runtime, Admin SDK, HMAC, Cloud Tasks), **idempotência**, **segurança**, **fila de tasks**, **observabilidade**, **o que fica no Next.js por ora**, e o **plano incremental** fase a fase.

---

## 1. Por que Firebase Functions, por que incremental

### 1.1 O problema que o Next.js não resolve bem

As rotas Next.js são feitas para **request→response síncrono e curto**. O produto Locai precisa, a partir de agora, de quatro coisas que brigam com esse modelo:

1. **Tasks longas e proativas** (`property_research` até 120s, `ask_owner` sem timeout) que rodam **fora** do turno do WhatsApp e depois **re-engajam** o cliente (defer/resume, doc [`01`](./01-agente-proativo-stateful.md)).
2. **Webhooks de terceiros** (pagamento MP/AbacatePay, assinatura ZapSign/Clicksign) que exigem **idempotência durável**, **retry automático** e **resposta rápida** ao provedor.
3. **Geração de artefatos pesados/sensíveis** (PDF de contrato, preenchimento de template, chamada ao provedor de assinatura) que não podem inflar o frontend nem bloquear o request.
4. **Jobs/cron e re-engajamento** (re-ping de `ask_owner`, follow-ups, reconciliação) que precisam de **agendamento confiável** independente da Vercel.

Esses quatro casos são **assíncronos, longos e/ou sensíveis** — exatamente o critério da FUNDAÇÃO (princípio 3: "pesado/assíncrono migra a Functions, não infla o frontend").

### 1.2 Por que NÃO big-bang

- O Next.js já tem **dezenas de rotas estáveis** (CRM, reservas, iCal, dashboard, tools do agente). Migrar tudo de uma vez = risco enorme, zero ganho de produto.
- O agente, o webhook de WhatsApp, as tools (`/api/agent/tools/*`), o console (`/operate`) e o painel **não mudam** — continuam no Next.js.
- A migração segue a **Sequência de Implementação** da FUNDAÇÃO: o **1º código de `functions/` é o worker de tasks + `/resume`** (Fase 1), e cada doc subsequente declara onde sua lógica vive.

### 1.3 Critério de decisão — "vai pra Function?"

Uma lógica vai (ou nasce) em Functions quando satisfaz **qualquer** destes:

| Critério | Exemplo | Vai pra Function? |
|---|---|---|
| Dura mais que ~25s | `property_research` (até 120s) | **Sim** |
| É disparada por terceiro e precisa de retry/idempotência | webhook MP, webhook ZapSign | **Sim** |
| Re-engaja o cliente fora do turno | `/resume` após task | **Sim** |
| Agendada (cron) e crítica | re-ping `ask_owner`, reconciliação | **Sim** (migra de Vercel cron) |
| Gera artefato pesado/sensível | PDF de contrato | **Sim** |
| É request→response curto do painel/agente | CRUD reserva, tool `read_system` | **Não — fica no Next.js** |

---

## 2. O que vai pras Functions PRIMEIRO (e por quê)

Ordem de migração ancorada na FUNDAÇÃO (Fase 1 destrava o resto).

### 2.1 Worker de tasks proativas + `/resume` (1º código de `functions/`)

**Por quê primeiro:** Decisão #4 (prioridade = agente proativo + stateful) e Sequência Fase 1. É o gap central do produto: hoje a IA só fala quando o cliente fala. O worker é o que permite "espera um segundinho que vou pesquisar" → rodar task em background → re-engajar.

- **Gatilho:** tool `defer_and_work` (endpoint `defer-task`) cria `deferred_tasks/{taskId}` (`status:queued`) e **enfileira** (doc [`01`](./01-agente-proativo-stateful.md)).
- **Function:** worker consome `{tenantId, conversationId, taskId}`, executa a task (`property_research` = busca pesada com tier **`DEEP`** em background; `ask_owner` = canal IA↔Dono do doc [`06`](./06-canal-ia-dono.md)), grava `result`/`status:done` e chama **`/resume`** no agente.
- **Assíncrono/longo/sensível:** longo (até 120s), assíncrono (fora do turno), e re-engaja sozinho.

### 2.2 Webhooks de pagamento (MP split + AbacatePay)

**Por quê:** sensível (dinheiro, caução) e disparado por terceiro com retries. A FUNDAÇÃO exige **webhook idempotente** para confirmar caução (Decisão #1). Hoje o webhook AbacatePay vive em `app/api/webhooks/abacatepay` (Next.js) e a reconciliação roda por **Vercel cron** (`/api/cron/sync-abacatepay`, a cada 30 min). Migram para Functions:

- `paymentWebhook` (HTTP) — recebe MP **e** AbacatePay; idempotência em **defesa em camada** (igual ao doc [`03`](./03-pagamentos-caucao-mercadopago.md)): coleção de log de eventos do provedor `mp_webhook_events/{eventId}` (e análoga p/ AbacatePay) como guarda **primária** de "evento já visto", **mais** `deposits/{depositId}.webhookEventIds[]` (SET-like, append condicional) como guarda de "evento já aplicado àquela caução"; grava `deposits.status`. Detalhe em [`03`](./03-pagamentos-caucao-mercadopago.md).
- `reconcileDeposits` (scheduled) — substitui `sync-abacatepay`, reusando `abacatepay-reconciliation-service.ts`.

### 2.3 Geração de contrato + webhook de assinatura

**Por quê:** pesado (PDF/template), sensível (documento jurídico, storage seguro) e assíncrono (provedor responde por webhook). Decisão #3: **provedor** de assinatura (ZapSign/Clicksign), template determinístico, LLM só preenche slots. Greenfield (doc [`04`](./04-contratos-assinatura.md), entidade `contracts`).

- `generateContract` (Task/callable) — monta `slots`, renderiza template versionado, envia ao provedor, grava `contracts/{contractId}` (`status:draft|sent`).
- `signatureWebhook` (HTTP) — idempotente por `contracts.webhookEventIds[]`; ao `signed`, salva `signedPdfUrl` no Storage e atualiza `contracts.status`.

### 2.4 Jobs / cron / re-engajamento

**Por quê:** agendamento confiável e desacoplado da Vercel; re-engajamento é a alma do agente proativo.

- `askOwnerSLA` (scheduled) — re-ping de `ask_owner` sem resposta (SLA do doc [`06`](./06-canal-ia-dono.md)).
- `reEngagement` (scheduled) — follow-ups de leads frios (tier **`MAIN`**), reusando `crm-insights-core.ts` para decidir quem.
- `reconcileDeposits` (scheduled) — ver 2.2.
- `calendarSyncCron` (scheduled) — **migra depois** (Fase 2/3) o `app/api/calendar/sync/cron`; iCal lock no doc [`05`](./05-ical-disponibilidade.md).

> **Trade-off de agendamento:** Vercel crons hoje funcionam, mas vivem fora do Firebase e dependem do deploy Vercel. Cloud Scheduler + Functions centraliza tudo no mesmo projeto Firebase (multi-tenant, mesmo logging, mesma auth). Migrar crons **um a um**, mantendo o antigo até validar o novo.

### 2.5 O que NÃO vai agora (fica no Next.js)

- Webhook de **inbound** WhatsApp (`app/api/webhook/whatsapp-microservice/route.ts`) — orquestra dispatch, dedup e estado; baixa latência, já estável. **Fica.** (A extração de `dispatchToAgent` → `lib/whatsapp/outbound.ts` do doc [`01`](./01-agente-proativo-stateful.md) é **refactor interno**, não migração.)
- **Tools do agente** (`/api/agent/tools/*`) e **console** (`/api/agent/console` → `/operate`) — request→response curto chamado pelo agente via HMAC. **Ficam.**
- **CRUD do painel** (reservas, transações, propriedades, leads, settings). **Ficam.**
- **Export iCal** (`/api/ical/...`) e **dashboard/BI** (`crm-insights-core`). **Ficam** (BI é client-side hoje, doc [`07`](./07-atendimentos-bi.md)).
- **Agente Python** (`agent/`, LangGraph) — serviço separado, **não** é Function. Functions **chamam** o agente (`/resume`), não o substituem.

---

## 3. Arquitetura

### 3.1 Estrutura de pastas (`functions/`, greenfield)

Criada na raiz do repo, deploy via `firebase deploy --only functions`. **TypeScript + Admin SDK** (a Function tem credencial de servidor; **não** usa o client SDK de `lib/firebase/firestore-v2.ts`, que assume browser/auth de usuário).

```
functions/
  package.json                 # deps próprias (firebase-functions, firebase-admin, @google-cloud/tasks)
  tsconfig.json
  .eslintrc.js
  src/
    index.ts                   # registra/exporta todas as Functions
    config.ts                  # env: AGENT_SERVICE_URL, AGENT_SHARED_SECRET, secrets MP/ZapSign...
    lib/
      admin.ts                 # initializeApp() + getFirestore() (Admin SDK, singleton)
      tenant.ts                # AdminTenantServiceFactory — espelha caminhos de firestore-v2 com Admin SDK
      hmac.ts                  # sign/verify HMAC "{ts}.{body}" 60s (idêntico a agent-auth.ts/auth.py)
      idempotency.ts           # claimOnce() (transação Firestore) + helpers de webhookEventIds[]
      logger.ts                # logger com PII mascarado (mesma convenção de lib/utils/logger.ts)
      queue.ts                 # enqueue() Cloud Tasks (Pub/Sub fallback)
      agent.ts                 # callResume() → POST {AGENT_SERVICE_URL}/resume (HMAC)
      outbound.ts              # sendWhatsApp() → POST {microserviceUrl}/api/v1/messages/{tenantId}/send
    tasks/
      taskWorker.ts            # onTaskDispatched — consome deferred_tasks, executa, chama /resume
      research.ts              # property_research (tier DEEP, timeout 120s)
      askOwner.ts              # ask_owner (canal IA↔Dono, doc 06)
    webhooks/
      paymentWebhook.ts        # onRequest — MP + AbacatePay (idempotente)
      signatureWebhook.ts      # onRequest — ZapSign/Clicksign (idempotente)
    contracts/
      generateContract.ts      # onTaskDispatched/callable — template + provedor
    scheduled/
      reconcileDeposits.ts     # onSchedule — substitui sync-abacatepay
      askOwnerSLA.ts           # onSchedule — re-ping ask_owner
      reEngagement.ts          # onSchedule — follow-up de leads frios
```

### 3.2 Runtime e gen

- **Firebase Functions Gen 2** (Cloud Run por baixo): permite `timeoutSeconds` até 3600s (cobre `property_research`=120s com folga), concorrência, min/max instances.
- **Node 20**, TypeScript, build `tsc` → `lib/`.
- Por Function, declarar `region` (mesma do Firestore: `nam5` é multi-região US; usar `us-central1` para as Functions), `timeoutSeconds`, `memory`, `maxInstances` (controle de custo), e `secrets` (Secret Manager) para `AGENT_SHARED_SECRET`, tokens MP/ZapSign.

`firebase.json` ganha o bloco `functions` (novo, ao lado dos existentes):

```jsonc
{
  // ... storage, hosting, firestore (já existem, não mexer) ...
  "functions": {
    "source": "functions",
    "runtime": "nodejs20",
    "predeploy": ["npm --prefix functions run build"]
  }
}
```

### 3.3 Acesso a dados — Admin SDK, mesmos caminhos

As Functions **não importam** `lib/firebase/firestore-v2.ts` (client SDK). Criamos `functions/src/lib/tenant.ts` = `AdminTenantServiceFactory`, que **espelha os mesmos caminhos** (`tenants/{tenantId}/{collection}/{docId}`, camelCase, `createdAt/updatedAt`, sempre `tenantId` no doc) usando `firebase-admin/firestore`. Assim a estrutura de dados é **idêntica**; muda só o SDK.

```ts
// functions/src/lib/tenant.ts (assinaturas)
class AdminCollection<T> {
  constructor(tenantId: string, name: string);
  doc(id: string): DocumentReference;
  async get(id: string): Promise<T | null>;
  async set(id: string, data: T): Promise<void>;
  async update(id: string, patch: Partial<T>): Promise<void>;
  async runIdempotent<R>(claimKey: string, fn: () => Promise<R>): Promise<R>;
}
class AdminTenantServiceFactory {
  constructor(tenantId: string);
  deferredTasks: AdminCollection<DeferredTask>;   // tenants/{t}/deferred_tasks
  deposits: AdminCollection<Deposit>;             // tenants/{t}/deposits
  contracts: AdminCollection<Contract>;           // tenants/{t}/contracts
  conversations: AdminCollection<Conversation>;   // tenants/{t}/conversations
}
```

> **Trade-off:** manter dois acessos (client SDK no Next.js, Admin SDK nas Functions) duplica um pouco de mapeamento. Aceitável: o client SDK respeita `firestore.rules` (segurança do painel); o Admin SDK bypassa rules (server). Forçar o mesmo SDK nos dois lados quebraria um dos modelos de segurança. **Os nomes de coleção/campo permanecem a única fonte de verdade compartilhada** ([`00` §4.3](./00-overview.md)).

### 3.4 Diagrama de sequência — defer → worker → resume (caminho principal)

```
Cliente (WhatsApp)
  │  "tem algo pé na areia até 800/noite?"
  ▼
whatsapp_microservice ──webhook──▶ Next.js /api/webhook/whatsapp-microservice
  │ dedup (SET NX EX) + persist + checa state (Redis conv_state→Firestore)
  └─ dispatchToAgent() ──HMAC──▶ agent POST /process
                                   │ grafo router→planner⇄executor
                                   │ planner decide diferir → tool defer_and_work
                                   │ (endpoint defer-task no Next.js):
                                   │   - setConversationState(IA_TRABALHANDO)  [Firestore+Redis]
                                   │   - sendWhatsApp(client_message "já te trago!")  [outbound existente]
                                   │   - cria deferred_tasks/{taskId} status:queued
                                   │   - enqueue Cloud Tasks {tenantId,conversationId,taskId}
                                   └─ turno termina (sem 2ª resposta)
  ...                                (Cliente pode mandar msgs; são persistidas, NÃO disparam /process)
Cloud Tasks ──HTTP+OIDC──▶ FUNCTION taskWorker
  │ claim idempotente do taskId (running)
  │ executa property_research (tier DEEP, ≤120s) — tools de busca via HMAC no Next.js
  │ grava result + status:done (startedAt/finishedAt)
  └─ callResume() ──HMAC──▶ agent POST /resume
                              │ idempotência: Redis resume_done:{tenantId}:{taskId} (SET NX EX)
                              │ monta estado+histórico+bloco de sistema com result, roda grafo
                              └─ retorna {final_response, media_urls}
                                   │
  ◀── POST /api/v1/messages/{tenantId}/send ──┤ outbound (mesmo orquestrador)
  ▼                                            └─ setConversationState(IA_TRABALHANDO→ATIVA|FECHAMENTO|AGUARDANDO_HUMANO)
Cliente recebe a resposta proativa
```

### 3.5 Diagrama de sequência — webhook de pagamento (caução)

```
Mercado Pago / AbacatePay ──POST──▶ FUNCTION paymentWebhook (onRequest)
  │ valida assinatura do provedor (MP signature / AbacatePay)
  │ guarda PRIMÁRIA: claim em mp_webhook_events/{eventId} (transação) → se já existe, 200 (no-op)
  │ resolve {tenantId, depositId} pelo providerRef
  │ guarda da caução: se eventId ∈ deposits.webhookEventIds[] → 200 (no-op)
  │ transação: append eventId em deposits.webhookEventIds[]; deposits.status = paid; paidAt = now
  │ 200 OK rápido ao provedor
  └─ (assíncrono) se status FECHAMENTO aguardava pagamento:
        callResume()/notify → agente avança o fluxo (doc 02/04)
```

---

## 4. Fila de tasks

### 4.1 Cloud Tasks (preferencial), Pub/Sub (fallback)

A FUNDAÇÃO (§4.2) fixa **Cloud Tasks preferencial, Pub/Sub fallback**. Cloud Tasks dá:

- **Idempotência de entrega por nome de task** (`taskId` como nome → dedup nativa de enfileiramento).
- **Retry configurável** (`maxAttempts`, backoff) — casa com `deferred_tasks.attempts`.
- **`scheduleTime`** (delay) — útil para SLA de re-ping (`ask_owner`).
- **Despacho HTTP autenticado por OIDC** para a Function worker (sem expor endpoint público).

```ts
// functions/src/lib/queue.ts (assinatura)
async function enqueueTask(args: {
  tenantId: string;
  conversationId: string;
  taskId: string;            // vira o NOME da Cloud Task → dedup de enfileiramento
  scheduleDelaySec?: number; // p/ SLA/re-ping
}): Promise<void>;
```

> **Onde o enqueue é chamado:** pelo endpoint `defer-task` (Next.js) **ou** por uma Function. Para manter a fila no mesmo plano da Function, o `defer-task` pode delegar o enqueue a uma thin callable Function; alternativa mais simples no curto prazo: o Next.js chama a Cloud Tasks API direto com Service Account. Doc `02` fixa o detalhe; aqui o contrato do payload `{tenantId, conversationId, taskId}` é canônico.

### 4.2 Timeouts e SLA

- `property_research`: `timeoutSeconds=120` na Function + Cloud Tasks `dispatchDeadline` alinhado. Estouro → `deferred_tasks.status=failed`, `error` preenchido, e **resume de fallback** ("não consegui agora, posso te chamar já já?").
- `ask_owner`: **sem timeout** de execução, mas com **SLA de re-ping** (`askOwnerSLA` scheduled, doc [`06`](./06-canal-ia-dono.md)): se o dono não respondeu em N min, re-enfileira com `scheduleDelaySec`.

### 4.3 Ciclo de vida em `deferred_tasks` ([`00` §4.3](./00-overview.md) + doc [`01`](./01-agente-proativo-stateful.md))

`queued → running → done | failed | cancelled`. Campos de tempo: `createdAt/startedAt/finishedAt/resumedAt`. `attempts` incrementa a cada retry. `cancelled` quando humano faz takeover (`MANUAL`) ou conversa `ENCERRADA` no meio.

---

## 5. Idempotência (transversal — não-negociável)

Toda a superfície assíncrona é idempotente, **reusando o padrão SET NX EX da FUNDAÇÃO** (§4.6). Quatro pontos:

1. **Criação de task** — idempotente por `(conversationId, originMessageId)`. Antes de criar, busca `deferred_tasks` com esse par; se existe `queued/running`, retorna o mesmo `taskId`. Evita task dupla quando o webhook de inbound é reentregue.
2. **Entrega ao worker** — Cloud Tasks usa `taskId` como nome → não enfileira duas vezes. No worker, `claimOnce(taskId)` via **transação Firestore** (`queued→running` só se ainda `queued`); segunda entrega vira no-op.
3. **`/resume`** — idempotente por `resume_done:{tenantId}:{taskId}` (Redis SET NX EX). Se já marcado, o agente não re-processa nem reenvia.
4. **Webhooks (pagamento/assinatura)** — **defesa em camada** (igual ao doc [`03`](./03-pagamentos-caucao-mercadopago.md)): (a) guarda **primária** = coleção de log de eventos do provedor (`mp_webhook_events/{eventId}`, e análoga p/ AbacatePay) com claim em transação — se o `eventId` já foi visto, responde 200 no-op antes de qualquer efeito; (b) guarda da entidade = `webhookEventIds[]` em `deposits`/`contracts` — dentro da transação que aplica o efeito, só aplica se o `eventId` ainda não está no array daquela caução/contrato; senão 200 no-op. As duas camadas existem; nem uma nem outra basta sozinha.

```ts
// functions/src/lib/idempotency.ts (assinaturas)
async function claimOnce(ref: DocumentReference, from: string, to: string): Promise<boolean>;
// true se transicionou (este worker "ganhou"), false se já estava em 'to'/adiante

async function applyWebhookEventOnce(
  ref: DocumentReference,
  eventId: string,
  mutate: (current: any) => any   // só chamado se eventId é novo
): Promise<'applied' | 'duplicate'>;
```

---

## 6. Segurança

Mesmas garantias do resto do sistema, **sem inventar esquema novo** (FUNDAÇÃO §4.6).

- **HMAC idêntico** ao existente: `HMAC-SHA256("{timestamp}.{body}")`, janela **60s**, headers `X-Agent-Signature`/`X-Agent-Timestamp`; `Bearer <secret>` aceito em dev. `functions/src/lib/hmac.ts` deve ser **byte-a-byte compatível** com `lib/middleware/agent-auth.ts` e `agent/app/auth.py`. A Function **assina** ao chamar `/resume` e o agente verifica; e qualquer chamada Function→Next.js (tools) também assina.
- **Webhooks de terceiros** validam a **assinatura do provedor** (MP signature, AbacatePay token, ZapSign/Clicksign HMAC) — **não** a HMAC interna (o provedor não a conhece). Cada um conforme docs [`03`](./03-pagamentos-caucao-mercadopago.md) (pagamento) / [`04`](./04-contratos-assinatura.md) (assinatura).
- **Worker invocado por Cloud Tasks** com **OIDC token** + verificação de issuer/audience; endpoint não-público para internet aberta.
- **Crons** (`onSchedule`) só são acionáveis pelo Cloud Scheduler do projeto — substituem o `Bearer CRON_SECRET` que o `sync-abacatepay` usa hoje (não precisa mais de segredo manual de cron).
- **Multi-tenant sempre** via `AdminTenantServiceFactory`; `tenantId` em todo payload e em toda chave Redis. **Nunca** uma Function opera fora do escopo de um `tenantId`.
- **Secrets** em **Secret Manager** (não em env de texto): `AGENT_SHARED_SECRET`, tokens MP/ZapSign. Declarados por Function via `secrets: [...]`.
- **PII mascarado** no logging (telefone, tenantId truncados) — `functions/src/lib/logger.ts` segue `lib/utils/logger.ts`.
- **Storage do PDF de contrato** com `storage.rules` restritivas (já há `storage` no `firebase.json`); URLs assinadas de vida curta (doc [`04`](./04-contratos-assinatura.md)).

---

## 7. Observabilidade

Alinhado ao doc [`09`](./09-modelos-custo.md) (custo/observabilidade), com a regra de **honestidade de dados** (sem dado → `null`/flag).

- **Logging estruturado** em toda Function (`logger.info/error` com `tenantId`, `taskId`, `eventId`, `durationMs` — PII mascarado). Cloud Logging agrega tudo no projeto Firebase.
- **Métricas de task:** logar `taskType`, `attempts`, `status`, `startedAt/finishedAt` → permite dashboard de taxa de sucesso/latência por tipo (`property_research` vs `ask_owner`).
- **Custo de LLM:** tasks `DEEP` logam `total_tokens_in/out` e modelo (FUNDAÇÃO §4.5). `DEEP` **só** em background, **nunca** no caminho síncrono do WhatsApp. `max_tokens ≤ 1024`, histórico `[-20:]`.
- **LangSmith** no agente para o `/resume` (mesma trilha do `/process`).
- **Idempotência observável:** logar `duplicate` em webhooks/resume para detectar reentregas anômalas.
- **Alertas:** Cloud Monitoring sobre taxa de `failed` em `deferred_tasks` e sobre webhooks com muitas duplicatas/erros de assinatura.

---

## 8. O que fica no Next.js por ora (resumo)

| Continua no Next.js (`app/api/*`) | Razão |
|---|---|
| Webhook inbound WhatsApp + `dispatchToAgent` | Baixa latência, estável; só refatora outbound p/ `lib/whatsapp/outbound.ts` |
| Tools do agente `/api/agent/tools/*` | Request→response curto chamado pelo agente (HMAC) |
| Console `/api/agent/console` → `/operate` | Idem |
| `defer-task` (cria task + enqueue) | É o gatilho síncrono dentro do turno; só o **worker** é Function |
| CRUD painel (reservas, transações, propriedades, leads, settings) | Curto, autenticado por usuário, usa client SDK + rules |
| Export iCal `/api/ical/*` | Curto, público com token |
| BI `crm-insights-core` / painel Atendimentos | Client-side hoje (doc [`07`](./07-atendimentos-bi.md)) |
| Webhook AbacatePay atual + cron Vercel | **Coexistem** até `paymentWebhook`/`reconcileDeposits` validarem |

O **agente Python** (`agent/`) permanece serviço separado em Docker — Functions **chamam** o agente, não o substituem.

---

## 9. Plano incremental (sem big-bang)

Ancorado na Sequência de Implementação da FUNDAÇÃO.

### Fase 0 — Andaime (1 PR, sem mudar comportamento)
- Criar `functions/` (package, tsconfig, Admin SDK singleton, `hmac.ts`, `idempotency.ts`, `logger.ts`, `outbound.ts`, `agent.ts`, `AdminTenantServiceFactory`).
- Adicionar bloco `functions` ao `firebase.json`.
- Deploy de uma Function `health` (onRequest) só pra validar pipeline (`firebase deploy --only functions`).
- **Risco/trade-off:** convivência Docker+Tunnel (Next.js) **e** Functions (GCP). São planos de deploy distintos; documentar env (`AGENT_SERVICE_URL` deve apontar pro tunnel do agente a partir da Function).

### Fase 1 — destravamento (núcleo do produto)
- **`taskWorker`** (1º código real) + `property_research` + `ask_owner`; integração com `defer-task` (Next.js) via Cloud Tasks; `callResume()` → `/resume` no agente. Docs [`01`](./01-agente-proativo-stateful.md) (estado/defer/resume) / [`06`](./06-canal-ia-dono.md) (ask_owner).
- Idempotência completa (criação de task, claim, resume, ver §5).
- `askOwnerSLA` (scheduled) para re-ping (doc [`06`](./06-canal-ia-dono.md)).
- **Validação:** rodar com 1 tenant piloto; comparar com o caminho reativo antigo (que continua intacto).

### Fase 2 — fechamento
- `calendarSyncCron` migra de `app/api/calendar/sync/cron` para `onSchedule` (iCal lock, doc [`05`](./05-ical-disponibilidade.md)). Manter o cron Vercel até paridade.

### Fase 3 — pagamento/contrato
- `paymentWebhook` (MP split + AbacatePay) + `reconcileDeposits` (substitui `sync-abacatepay`); desligar o cron Vercel só após paridade. Doc [`03`](./03-pagamentos-caucao-mercadopago.md).
- `generateContract` + `signatureWebhook` (ZapSign/Clicksign) + storage seguro do PDF. Doc [`04`](./04-contratos-assinatura.md).

### Fase 4 — transversais contínuos
- `reEngagement` (scheduled) — follow-up de leads frios (tier `MAIN`), reusando `crm-insights-core`. Doc [`07`](./07-atendimentos-bi.md) (BI/insights) / [`09`](./09-modelos-custo.md) (tier).
- Tiers/custo/observabilidade consolidados (doc [`09`](./09-modelos-custo.md)); `DEEP` acompanha as tasks pesadas.
- Migração **oportunista** de rotas Next.js restantes **só quando** baterem no critério da §1.3 — nunca por migrar.

### Riscos e mitigação

| Risco | Mitigação |
|---|---|
| HMAC divergir entre Function/Next.js/agente | `hmac.ts` testado contra vetores compartilhados; mesma janela 60s |
| Dois SDKs (client vs admin) divergirem nos caminhos | Nomes de coleção/campo são fonte única ([`00` §4.3](./00-overview.md)); `AdminTenantServiceFactory` espelha `firestore-v2.ts` |
| Reentrega de webhook/Task causar efeito duplo | Idempotência em 4 pontos (§5) antes de qualquer escrita |
| Custo de Functions/Cloud Tasks subir | `maxInstances` por Function; `DEEP` só background; `max_tokens≤1024` |
| Cron duplicado (Vercel + Functions) durante migração | Manter os dois rodando idempotentes; desligar Vercel só após paridade verificada |
| Tunnel/agente indisponível no `/resume` | Retry Cloud Tasks + resume de fallback ("te chamo já já") + `deferred_tasks.failed` |
