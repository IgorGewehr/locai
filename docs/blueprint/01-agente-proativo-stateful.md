# 01 — Agente proativo e com estado

> **Prioridade 1 (o CORAÇÃO).** Este é o gap central do produto e o que destrava
> todo o resto do roadmap (Decisão do Fundador #4). Leia primeiro a
> [FUNDAÇÃO](./00-overview.md) — este documento segue à risca os contratos
> transversais (§4.x), os nomes de coleções/estados e as 4 decisões travadas, e
> **não diverge nem renomeia** nada definido lá.

Documentos vizinhos que detalham peças mencionadas aqui:
- **[00 — Fundação §4.3 (Modelo de dados consolidado)](./00-overview.md)**: esquema completo de `deferred_tasks`, campos novos de `conversations`, índices.
- **[06 — Canal IA↔Dono](./06-canal-ia-dono.md)**: a task `ask_owner` (IA pergunta ao dono), SLAs, botões de deep-link.
- **[12 — Personas e prompts](./12-personas-prompts.md)**: evolução dos prompts/personas; a evolução do grafo/tools vive aqui e neste doc (01).
- **[08 — Firebase Functions](./08-backend-firebase-functions.md)**: estrutura de `functions/`, deploy, auth/logging.
- **[09 — Modelos e custo](./09-modelos-custo.md)**: tier `DEEP`, token logging.

---

## 1. O problema, em uma frase

Hoje a Sofia **só fala quando o cliente fala**. O grafo é REATIVO e STATELESS:
`POST /process` recebe 1 mensagem do cliente e devolve 1 resposta; o histórico é
reconstruído do Firestore a cada turno (`agent/app/graph/graph.py::run_agent`,
`history[-20:]`). Não existe task em background nem capacidade de re-engajar
sozinha.

A visão do produto exige o oposto disso em três movimentos:

1. **"Show, espera um segundinho que vou pesquisar pra você"** — a IA manda uma
   frase humana agora, **PARA de responder**, e dispara uma task paralela.
2. **A task roda em background** — filtro pesado de imóvel (`property_research`) ou
   uma consulta interna ao humano da imobiliária (`ask_owner`).
3. **Quando a task conclui, a IA RE-ENGAJA** — manda mensagem pro cliente
   **mesmo sem ele ter mandado nada**, reusando o canal de saída que já existe.

Para isso precisamos de duas coisas que não existem hoje e estão acopladas:

- **Estado de conversa** (`ConversationState`) — para saber que a conversa está
  "esperando uma task" e **não responder** mensagens do cliente nesse intervalo.
- **Protocolo defer/resume** — a tool `defer_and_work`, a fila de tasks, o worker
  em Firebase Functions, e o endpoint `/resume` no agente.

Este documento cobre os dois, com foco no protocolo (o coração).

---

## 2. Máquina de estados de conversa (`ConversationState`)

Contrato canônico: FUNDAÇÃO §4.1. Reproduzido e detalhado aqui porque o
defer/resume é construído inteiramente sobre estas transições.

### 2.1 Estados

| Estado | Significado | IA responde inbound? |
|---|---|---|
| **`ATIVA`** | Reativo normal (comportamento de hoje). | Sim — dispara `/process`. |
| **`IA_TRABALHANDO`** | Task diferida em curso. Msgs do cliente são **persistidas mas bufferizadas** (não disparam `/process`). | Não — só o `/resume` fala. |
| **`AGUARDANDO_HUMANO`** | Escalado / cliente sinalizou fechamento; aguarda o dono. | Não automaticamente (ver docs `06`/`02`). |
| **`MANUAL`** | Takeover humano. **É exatamente o `ai_blocked` de hoje.** | Não. |
| **`FECHAMENTO`** | Coleta de pagamento/caução/contrato (doc `02`). | Sim, mas em fluxo de fechamento. |
| **`ENCERRADA`** | Conversa finalizada/arquivada. | Não. |

### 2.2 Fonte de verdade e cache de roteamento

- **Durável:** Firestore `tenants/{tenantId}/conversations/{id}.state`
  (`conversationId` canônico = `{tenantId}:{normalizedPhone}` — o mesmo já usado
  em `dispatchToAgent`: `conversation_id: \`${tenantId}:${clientPhone}\``).
- **Cache quente:** Redis `conv_state:{tenantId}:{normalizedPhone}` (com TTL).
- O webhook **lê o Redis primeiro** (caminho quente, baixa latência) e cai em
  Firestore se faltar. Telefone **sempre** via `normalizeBlockPhone()`
  (`lib/utils/ai-block.ts`) — nunca normalizar à mão.

### 2.3 Compatibilidade com `isAiBlocked` (o embrião já implementado)

`MANUAL` ⇔ `ai_blocked:{tenant}:{phone}`. Regra dura:
**`isAiBlocked === true ⇒ estado lógico é `MANUAL``**, independente do que o Firestore
diga. O módulo novo `lib/conversation/state.ts` é um **superset** que escreve em
**ambos**: ao entrar/sair de `MANUAL`, ele também seta/limpa a flag de
`ai-block.ts`, para não duplicar lógica nem deixar os dois desincronizarem.

```
isAiBlocked(true)   ─────────────▶  state = MANUAL
state = MANUAL      ─── escreve ──▶  ai_blocked flag = true
state != MANUAL     ─── limpa  ──▶  ai_blocked flag = false (se existir)
```

`ConversationStatus` legado (`active | waiting_client | waiting_approval |
escalated | completed | abandoned`, em `lib/types/conversation.ts`) **permanece
para UI/CRM**. `state` é o campo **novo de roteamento**. Mapeamento de referência:

| `ConversationState` (novo, roteamento) | `ConversationStatus` (legado, UI/CRM) |
|---|---|
| `ATIVA` | `active` |
| `IA_TRABALHANDO` | `active` (badge "IA trabalhando" na UI) |
| `AGUARDANDO_HUMANO` | `waiting_approval` / `escalated` |
| `MANUAL` | `active` (com flag de takeover) |
| `FECHAMENTO` | `waiting_approval` |
| `ENCERRADA` | `completed` / `abandoned` |

### 2.4 Transição única: `setConversationState()`

Toda transição passa por **uma** função em `lib/conversation/state.ts`. Ela é a
única autorizada a escrever `state`. Assinatura proposta:

```ts
// lib/conversation/state.ts  (NOVO)
export type ConversationState =
  | 'ATIVA' | 'IA_TRABALHANDO' | 'AGUARDANDO_HUMANO'
  | 'MANUAL' | 'FECHAMENTO' | 'ENCERRADA';

export async function setConversationState(
  tenantId: string,
  phone: string,                 // bruto; normalizado internamente
  next: ConversationState,
  patch?: {                      // campos novos de conversations (§4.3)
    activeTaskId?: string | null;
    closingMode?: 'ia' | 'owner' | null;
    ownerAlertedAt?: Date | null;
  },
): Promise<void>;

export async function getConversationState(
  tenantId: string,
  phone: string,
): Promise<ConversationState>;    // Redis → fallback Firestore → default 'ATIVA'
```

`setConversationState` faz, **atomicamente do ponto de vista do chamador**:
1. `update` no Firestore (`state`, `stateUpdatedAt`, e o `patch`).
2. `set` no Redis `conv_state:{tenantId}:{normalizedPhone}` (com TTL).
3. **Seta** a flag `ai_blocked` quando `next === 'MANUAL'` (mantém `isAiBlocked` coerente com o estado). NÃO limpa a flag em transições que saem de `MANUAL` — o **desbloqueio é ação explícita do operador** (rota `/api/ai/block-conversation`), para não derrubar um takeover humano por engano. (Implementado em `lib/conversation/state.ts`.)

> **Trade-off / risco:** não há transação distribuída entre Firestore e Redis.
> Mitigação: Firestore é a fonte de verdade durável; o Redis é cache best-effort
> com TTL e o webhook sempre tem o fallback Firestore. Se o Redis ficar
> desatualizado, no pior caso a IA responde algo durante `IA_TRABALHANDO` (ver
> §6 sobre o gate redundante no `/resume` e idempotência).

### 2.5 Onde o webhook checa o estado

No `dispatchToAgent` (`app/api/webhook/whatsapp-microservice/route.ts`), **antes**
de assinar e chamar `/process`. Hoje o webhook só checa `isAiBlocked`. A mudança:
substituir essa checagem isolada por uma leitura de estado.

```ts
// dispatchToAgent(), substituindo o bloco atual de isAiBlocked
const state = await getConversationState(tenantId, clientPhone)  // NOVO

switch (state) {
  case 'MANUAL':
  case 'AGUARDANDO_HUMANO':
  case 'ENCERRADA':
    // humano cuida / conversa fechada → persiste (já feito pelo caller) e NÃO responde
    return
  case 'IA_TRABALHANDO':
    // task em curso → a msg JÁ foi persistida pelo caller; ela será lida no /resume.
    // NÃO dispara /process (evita 2ª resposta concorrente).
    logger.info('🛠️ Conversa em IA_TRABALHANDO — msg bufferizada para o /resume')
    return
  case 'ATIVA':
  case 'FECHAMENTO':
    break // segue para /process normalmente
}
```

**Reuso:** o `isAiBlocked` continua funcionando — `getConversationState` retorna
`MANUAL` sempre que a flag está setada, então o comportamento de takeover de hoje
é preservado bit a bit. A mensagem continua sendo **persistida** pelo
`persistIncomingMessage` (que roda antes do dispatch e não muda); só o
*disparo da resposta* é suprimido.

### 2.6 Diagrama de estados

```
                       cliente fala / 1ª msg
                ┌───────────────────────────────┐
                ▼                                │
            ┌────────┐  defer_and_work       ┌───────────────┐
   ┌───────▶│ ATIVA  │──────────────────────▶│ IA_TRABALHANDO│
   │        └────────┘                       └───────────────┘
   │           │  ▲                              │      │
   │ /resume   │  │ /resume (task done)          │      │ /resume + escala
   │ (volta)   │  └──────────────────────────────┘      │  ou cliente quer fechar
   │           │                                         ▼
   │           │ cliente quer fechar              ┌──────────────────┐
   │           ├─────────────────────────────────▶│ AGUARDANDO_HUMANO│
   │           ▼                                  └──────────────────┘
   │       ┌────────────┐  dono: "manda o link"        │  dono assume
   │       │ FECHAMENTO │◀─────────────────────────────┘  (deep-link)
   │       └────────────┘                                 │
   │             │                                        ▼
   │             │ concluído                          ┌────────┐
   │             └───────────────────────────────────▶│ MANUAL │ (ai_blocked)
   │                                                  └────────┘
   │   operador desbloqueia                               │
   └──────────────────────────────────────────────────────┘
                          tudo pode terminar em → ENCERRADA
```

---

## 3. Protocolo defer/resume — visão geral

Contrato canônico: FUNDAÇÃO §4.2. Três peças novas + um worker:

| Peça | Onde vive | Novo ou reuso |
|---|---|---|
| Tool `defer_and_work` (endpoint `defer-task`) | agente `registry.py`/`client.py` + locai `/api/agent/tools/defer-task` | **NOVO** |
| Coleção `deferred_tasks` | Firestore `tenants/{tenantId}/deferred_tasks/{taskId}` | **NOVO** (modelo em 00 §4.3) |
| Worker de tasks | **Firebase Functions** (1º código de `functions/`) | **NOVO** (doc `08`) |
| Endpoint `/resume` | agente FastAPI (`api/routes.py`), espelha `/process` | **NOVO** |
| Outbound (enviar ao cliente) | `lib/whatsapp/outbound.ts` (extraído de `dispatchToAgent`) | **REUSO** do `/api/v1/messages/{tenantId}/send` |
| Gate de estado no webhook | `setConversationState`/`getConversationState` | NOVO módulo, **reusa** `ai-block.ts` |
| Idempotência | Redis `SET NX EX` | **REUSO** do padrão de `deduplication-cache.ts` |

### 3.1 Fluxo passo a passo (o caso "espera um segundinho")

1. Cliente: "Quero algo bem isolado, com vista pro mar, pet friendly e até R$400 a noite."
2. Webhook → `getConversationState` = `ATIVA` → `/process`.
3. O **planner** (grafo) entende que isso é uma busca pesada/curada e chama a tool
   nova **`defer_and_work`** com:
   - `client_message`: "Show! Deixa eu garimpar as melhores opções pra você, te chamo já já 😊" *(frase humana que JÁ vai ser enviada)*
   - `task_type`: `property_research`
   - `task_payload`: `{ criteria: { pet: true, view: "mar", maxNightly: 400, isolated: true } }`
   - `resume_hint`: "Apresente no máximo 2 opções curadas; se nada bater 100%, ofereça a mais próxima e explique."
4. O endpoint `defer-task` (locai), executado **dentro do turno do `/process`**:
   a. `setConversationState(tenant, phone, 'IA_TRABALHANDO', { activeTaskId })`.
   b. **Envia `client_message` agora** via `lib/whatsapp/outbound.ts` (o mesmo
      `POST /api/v1/messages/{tenantId}/send`) e persiste como msg da Sofia.
   c. Cria `deferred_tasks/{taskId}` com `status: 'queued'` (idempotente por
      `(conversationId, originMessageId)`).
   d. **Enfileira** o job (Cloud Tasks → worker em Functions).
   e. Retorna ao agente um resultado de tool tipo
      `{ deferred: true, taskId, state: 'IA_TRABALHANDO' }`.
5. O grafo, ao ver esse resultado, **encerra o turno sem produzir uma 2ª
   resposta** (ver §7 — o que muda no grafo). O `/process` devolve
   `final_response: null` (ou vazio) e o webhook **não envia nada além** do que o
   `defer-task` já mandou.
6. Worker (Functions) processa a task (até 120s para `property_research`), grava
   `result` + `status: 'done'`, e chama o agente **`POST /resume`**.
7. `/resume` monta histórico + um **bloco de sistema com o `result`**, roda o
   grafo, e produz a re-engagement message ("Achei duas que são a sua cara…").
8. `/resume` envia ao cliente pelo **mesmo orquestrador de saída** e transiciona
   `IA_TRABALHANDO → ATIVA` (ou `FECHAMENTO`/`AGUARDANDO_HUMANO`, conforme o
   resultado).

### 3.2 Diagrama de sequência — `property_research` (caminho feliz)

```
Cliente   Microservice   Webhook(locai)   /process(agente)   defer-task(locai)   CloudTasks   Worker(Functions)   /resume(agente)
  │            │              │                  │                   │                │              │                  │
  │── msg ────▶│── webhook ──▶│                  │                   │                │              │                  │
  │            │              │ getConvState=ATIVA                   │                │              │                  │
  │            │              │── /process ─────▶│                   │                │              │                  │
  │            │              │                  │ planner → tool    │                │              │                  │
  │            │              │                  │  defer_and_work   │                │              │                  │
  │            │              │                  │── POST defer-task▶│                │              │                  │
  │            │              │                  │                   │ setState=IA_TRABALHANDO       │                  │
  │◀───────────│◀─ send ──────│──────────────────│── "espera um segundinho" (outbound)│              │                  │
  │            │              │                  │                   │ create deferred_task(queued)  │                  │
  │            │              │                  │                   │── enqueue ────▶│              │                  │
  │            │              │                  │◀─ {deferred,taskId}│                │              │                  │
  │            │              │◀ final_response=∅ │ (turno encerra)   │                │              │                  │
  │            │              │ (não envia nada)  │                   │                │── invoke ───▶│                  │
  │            │              │                  │                   │                │              │ pesquisa (≤120s) │
  │            │              │                  │                   │                │              │ result+status=done│
  │            │              │                  │                   │                │              │── POST /resume ──▶│
  │            │              │                  │                   │                │              │                  │ resume_done NX?
  │            │              │                  │                   │                │              │                  │ grafo + result
  │◀───────────│◀─ send ───────────────────────────────────────────────────────────────────────────────────────────│ re-engaja
  │            │              │                  │                   │                │              │                  │ setState=ATIVA
```

### 3.3 Diagrama de sequência — `ask_owner` (consulta interna ao humano)

```
Cliente        defer-task(locai)     Worker(Functions)     Dono(WhatsApp pessoal)    /resume(agente)     Cliente
  │ "esse aceita pet mesmo?"  │              │                      │                       │
  │── via /process → defer_and_work(task_type=ask_owner) ─────────▶ │                       │
  │◀ "deixa eu confirmar isso rapidinho com a equipe!" (outbound)   │                       │
  │   setState=IA_TRABALHANDO; create task(queued)                  │                       │
  │                            │── enqueue ──▶│                      │                       │
  │                            │              │ notify_owner (reuso) │                       │
  │                            │              │── push+WhatsApp+deep-link ──▶│ (doc 06)       │
  │                            │              │ (SEM timeout; SLA de re-ping — doc 06)        │
  │                            │              │   ⏳ aguarda resposta do dono                 │
  │                            │              │◀── dono responde via /operate console ───────│
  │                            │              │ result={ownerAnswer}; status=done            │
  │                            │              │── POST /resume ─────────────────────────────▶│
  │◀──────────────────────────────────────────────────────────────────── re-engaja cliente │
```

> `ask_owner` é detalhada no **[doc 06](./06-canal-ia-dono.md)**: reusa
> `notify_owner` (já existe como tool/endpoint `notify-owner`) e o console
> `/operate` para o dono responder. Aqui só fixamos que ela é um `task_type` do
> mesmo protocolo defer/resume, **sem timeout** mas com **SLA de re-ping**.

---

## 4. A tool nova: `defer_and_work`

### 4.1 Schema no `registry.py` (agente)

Adicionar ao array `TOOLS` em `agent/app/tools/registry.py`. **Não** é read-only
(muta estado), então **não** entra em `READ_ONLY_TOOL_NAMES`.

```python
{
    "type": "function",
    "function": {
        "name": "defer_and_work",
        "description": (
            "Use quando a próxima resposta exigir um trabalho que demora "
            "(garimpar/curar imóveis com critérios exigentes, ou confirmar uma "
            "informação com a equipe humana da imobiliária). "
            "Você manda AGORA uma frase curta e calorosa avisando que vai "
            "verificar ('deixa eu garimpar/confirmar, já te chamo'), e o sistema "
            "faz o trabalho em background. Quando terminar, VOCÊ MESMA volta a "
            "falar com a pessoa — não precisa esperar ela mandar outra mensagem. "
            "NÃO use para buscas simples (use search_available_properties direto). "
            "Use só quando realmente valer a pena segurar a pessoa um instante."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "client_message": {
                    "type": "string",
                    "description": (
                        "A frase humana e curta que será enviada AGORA ao cliente "
                        "(ex.: 'Show! Deixa eu achar as melhores opções e já te chamo 😊'). "
                        "Escreva no tom da Sofia."
                    ),
                },
                "task_type": {
                    "type": "string",
                    "enum": ["property_research", "ask_owner", "closing_prep", "other"],
                    "description": (
                        "property_research: garimpo/curadoria pesada de imóveis. "
                        "ask_owner: confirmar algo com a equipe humana. "
                        "closing_prep: preparar fechamento (doc 02). other: genérico."
                    ),
                },
                "task_payload": {
                    "type": "object",
                    "description": "Dados estruturados para a task (critérios, pergunta ao dono, etc.).",
                },
                "resume_hint": {
                    "type": "string",
                    "description": "Dica para você mesma de como apresentar o resultado quando voltar a falar.",
                },
            },
            "required": ["client_message", "task_type", "task_payload"],
        },
    },
},
```

### 4.2 Mapa de rota no `client.py` (agente)

Em `agent/app/tools/client.py`, adicionar ao `_TOOL_PATHS`
(snake_case → kebab-case, conforme convenção §4.6):

```python
_TOOL_PATHS = {
    ...
    "defer_and_work": "defer-task",
}
```

`call_tool` já injeta `conversation_id` e `contact` no `args` (ver
`executor_node` em `nodes.py`), então o endpoint recebe tudo que precisa.

### 4.3 Endpoint `POST /api/agent/tools/defer-task` (locai) — NOVO

Segue o padrão de `/api/agent/tools/*` (auth HMAC via `validateAgentRequest`,
multi-tenant via `TenantServiceFactory`). Recebe do executor:

```jsonc
{
  "tenant_id": "...",
  "conversation_id": "{tenantId}:{normalizedPhone}",
  "contact": { "phone": "55..." },
  "client_message": "Show! Deixa eu garimpar...",
  "task_type": "property_research",
  "task_payload": { "criteria": {...} },
  "resume_hint": "Apresente no máximo 2 opções..."
}
```

Lógica (idempotente por `(conversationId, originMessageId)`):

```ts
// 1) derivar phone do conversation_id (parte após o ':') ou do contact.phone
// 2) idempotência de criação: SET NX no Redis
const created = await taskCreateOnce(tenantId, conversationId, originMessageId)
if (!created.firstTime) return { deferred: true, taskId: created.taskId, dedup: true }

// 3) transicionar estado
await setConversationState(tenantId, phone, 'IA_TRABALHANDO', { activeTaskId: taskId })

// 4) enviar a frase humana AGORA (reuso do outbound)
await sendWhatsAppText(tenantId, phone, client_message)   // lib/whatsapp/outbound.ts
await persistSofiaMessage(tenantId, conversationId, client_message)

// 5) persistir a task
await services.deferredTasks.create({
  taskId, conversationId, clientPhone: normalizeBlockPhone(phone),
  taskType: task_type, status: 'queued', payload: task_payload,
  clientMessage: client_message, resumeHint: resume_hint,
  attempts: 0, originMessageId, createdAt: now,
})

// 6) enfileirar no worker (Cloud Tasks) — doc 08
await enqueueDeferredTask({ tenantId, conversationId, taskId })

return { deferred: true, taskId, state: 'IA_TRABALHANDO' }
```

> `originMessageId` = o `message_id` do turno corrente. Como o executor não recebe
> hoje o `message_id` nos `args`, **incluí-lo** no merge feito por `call_tool` (ou
> passá-lo no estado) é a mudança mínima necessária (ver §7.3).

### 4.4 `lib/whatsapp/outbound.ts` — extração (REUSO)

Hoje a lógica de enviar texto/mídia ao cliente está **embutida** em
`dispatchToAgent` (linhas ~393–422: `POST {microserviceUrl}/api/v1/messages/{tenantId}/send`).
Extrair para um módulo reutilizável **sem mudar o comportamento**:

```ts
// lib/whatsapp/outbound.ts  (NOVO — extraído de dispatchToAgent)
export async function sendWhatsAppText(tenantId: string, to: string, message: string): Promise<void>
export async function sendWhatsAppMedia(tenantId: string, to: string, urls: string[]): Promise<void> // slice(0,5), detecta vídeo
```

`dispatchToAgent`, o `defer-task` e o `/resume`-handler passam todos a chamar
essas funções. Assim o canal de re-engajamento outbound **não é código novo** — é
o mesmíssimo `send` do microserviço que já manda mensagem não solicitada.

> **Risco:** o `/resume` precisa de um endpoint locai para enviar ao cliente,
> porque o agente não tem o `WHATSAPP_MICROSERVICE_API_KEY`. Solução: o
> `/resume` (no agente) devolve `final_response`/`media_urls`, e quem chama o
> `/resume` (o **worker em Functions**) repassa isso para um endpoint locai
> `/api/agent/internal/resume-dispatch` que usa `lib/whatsapp/outbound.ts`. OU —
> mais simples — o **próprio worker** chama `outbound` direto (worker e locai
> compartilham o microservice). Decisão: **o worker chama `/resume` e, com a
> resposta, dispara o outbound via locai** (mantém o agente sem segredos de
> WhatsApp). Fixado no doc `08`.

---

## 5. Endpoint `/resume` no agente — NOVO

Espelha `/process` (`agent/app/api/routes.py`), **mesma auth HMAC**
(`verify_request`), mesma estrutura de resposta.

### 5.1 Request/response

```python
# agent/app/api/routes.py  (NOVO)
class ResumeRequest(BaseModel):
    tenant_id: str
    conversation_id: str
    task_id: str
    task_type: str
    result: dict          # o que o worker apurou (imóveis curados, resposta do dono, etc.)
    resume_hint: str | None = None
    history: list[dict[str, str]] = []   # reconstruído por quem chama, como no /process

class ResumeResponse(BaseModel):
    run_id: str
    status: str
    final_response: str | None
    media_urls: list[str] = []
    next_state: str | None           # ATIVA | FECHAMENTO | AGUARDANDO_HUMANO
    error: str | None

@router.post("/resume", response_model=ResumeResponse)
async def resume(request: Request) -> ResumeResponse:
    tenant_id, raw_body = await verify_request(request)
    req = ResumeRequest.model_validate(json.loads(raw_body))
    result = await run_resume(
        tenant_id=req.tenant_id,
        conversation_id=req.conversation_id,
        task_id=req.task_id,
        task_type=req.task_type,
        task_result=req.result,
        resume_hint=req.resume_hint,
        history=req.history,
    )
    return ResumeResponse(...)
```

### 5.2 `run_resume()` — monta estado + bloco de sistema com o resultado

Análogo a `run_agent` (`graph.py`), com uma diferença central: **não há mensagem
nova do cliente**. O turno é iniciado por um **bloco de sistema** que injeta o
`result` da task e o `resume_hint`, e instrui a Sofia a **re-engajar
proativamente** no seu tom.

```python
async def run_resume(*, tenant_id, conversation_id, task_id, task_type,
                     task_result, resume_hint, history) -> AgentRunResult:
    lc_messages = []
    for h in history[-20:]:               # mesma janela de hoje
        lc_messages.append(AIMessage(content=h["content"]) if h["role"] == "assistant"
                           else HumanMessage(content=h["content"]))

    # Bloco de sistema que carrega o resultado da task — NÃO é mensagem do cliente.
    resume_directive = (
        f"[TASK CONCLUÍDA: {task_type}] Você pediu um instante ao cliente e agora "
        f"tem o resultado abaixo. Volte a falar com ele de forma natural e calorosa, "
        f"como quem prometeu retorno e está cumprindo. NÃO comece com 'oi' do zero — "
        f"retome o fio da conversa.\n"
        f"DICA DE APRESENTAÇÃO: {resume_hint or '—'}\n"
        f"RESULTADO (use só o que for verdade; nunca invente): "
        f"{json.dumps(task_result, ensure_ascii=False)}"
    )
    lc_messages.append(SystemMessage(content=resume_directive))
    # ... initial_state idêntico ao run_agent, roda _GRAPH.ainvoke com timeout
```

A Sofia então pode **chamar tools normalmente** dentro do `/resume` (ex.:
`get_property_media` para mandar fotos das opções curadas, `notify_owner` para
escalar). As `media_urls` saem por `final_state.get("media_urls")` exatamente
como no `/process`.

### 5.3 Transição de saída

Após o `/resume`, quem orquestra (worker → locai) chama
`setConversationState`:
- caso normal → `IA_TRABALHANDO → ATIVA`.
- se a Sofia escalou no `/resume` (`ask_owner` cujo resultado pede humano, ou o
  cliente já quer fechar) → `AGUARDANDO_HUMANO` ou `FECHAMENTO`.

O `next_state` retornado pelo `/resume` é uma **sugestão** derivada do
intent/tool-calls do turno; a transição efetiva é aplicada pelo locai (fonte de
verdade do estado).

---

## 6. Idempotência, timeouts e buffer de mensagens

### 6.1 Idempotência (reuso do padrão `SET NX EX`)

| Operação | Chave | Mecanismo |
|---|---|---|
| Criação de task | `(conversationId, originMessageId)` → `task_create:{tenantId}:{conversationId}:{originMessageId}` | `SET NX EX` (mesmo padrão de `deduplication-cache.ts`) |
| Execução do `/resume` | `resume_done:{tenantId}:{taskId}` | `SET NX EX` — se já existe, `/resume` é **no-op** e devolve o resultado anterior |
| Webhook inbound | `messageId` | já existe (`deduplicationCache.checkAndMark`) |
| Webhooks de pagamento/contrato | `webhookEventIds[]` | docs `03`/`08` |

O gate `resume_done` é o que protege contra **re-entrega do Cloud Tasks** (o
worker pode ser invocado mais de uma vez) — garante que o cliente **nunca recebe
a re-engagement duas vezes**.

### 6.2 Timeouts

- `property_research`: **120s** (timeout do worker). Excedeu → `status: 'failed'`,
  `attempts++`, e o worker chama `/resume` com um `result` de fallback
  (`{ found: false, reason: 'timeout' }`) para a Sofia dizer algo gracioso em vez
  de deixar o cliente no vácuo em `IA_TRABALHANDO`.
- `ask_owner`: **sem timeout** de execução, mas **SLA de re-ping** ao dono (doc
  `06`) — a conversa pode ficar legitimamente em `IA_TRABALHANDO`/
  `AGUARDANDO_HUMANO` por horas.
- O timeout síncrono do grafo permanece `AGENT_REQUEST_TIMEOUT_S=30`
  (`config.py`) para `/process` **e** `/resume` — o trabalho pesado nunca roda
  dentro do grafo, só no worker.

> **Watchdog (risco de tasks órfãs):** uma conversa pode ficar presa em
> `IA_TRABALHANDO` se o worker morrer antes de chamar `/resume`. Mitigação: um
> cron (Functions) varre `deferred_tasks` com `status in (queued,running)` e
> `startedAt` muito antigo, marca `failed` e força um `/resume` de fallback +
> `setConversationState(..., 'ATIVA')`. Detalhado no doc `08`.

### 6.3 Buffer de mensagens durante `IA_TRABALHANDO`

Mensagens do cliente que chegam **enquanto a task roda** são **persistidas**
(o `persistIncomingMessage` roda sempre, antes do gate) mas **não disparam
`/process`** (§2.5). Elas entram no histórico normal do Firestore. Quando o
`/resume` reconstrói o `history` (mesma query que `dispatchToAgent` usa — leia
`clientMessage`/`sofiaMessage` ordenado por `createdAt`), **essas mensagens
bufferizadas aparecem naturalmente** no contexto, e a Sofia as leva em conta ao
re-engajar.

> **Risco:** se o cliente disser algo que muda tudo ("na verdade desisti") durante
> `IA_TRABALHANDO`, a Sofia só vai reagir no `/resume`. Aceitável para a v1 (a
> janela é curta para `property_research`). Para `ask_owner` longo, o doc `06`
> prevê cancelamento da task (`status: 'cancelled'`) se o cliente sinalizar
> desistência — exigiria reabrir o gate para detectar intents de cancelamento;
> marcado como melhoria futura.

---

## 7. O que muda no grafo LangGraph

### 7.1 A tool é "terminal" no turno

`defer_and_work` é executada pelo `executor_node` como qualquer outra tool (em
paralelo, via `call_tool`). A diferença é o que acontece **depois**: o turno deve
**encerrar sem uma 2ª resposta** (a frase humana já foi enviada pelo
`defer-task`).

Hoje o roteamento pós-executor é `_should_continue` (`graph.py`):
volta ao `planner` a menos que haja `final_response` ou estouro de iterações. Se
deixarmos como está, o planner rodaria de novo e poderia gerar uma resposta
indevida. Mudança mínima — detectar o resultado de `defer_and_work` no executor e
**curto-circuitar** para `END`:

```python
# graph.py — novo conditional após o executor
def _should_continue(state: AgentState) -> str:
    if state.get("deferred"):            # NOVO — task diferida, turno acabou
        return "end"
    if state.get("iterations", 0) >= get_settings().agent_max_iterations:
        return "end"
    if state.get("final_response"):
        return "end"
    return "planner"
```

E o `executor_node` (`nodes.py`) seta a flag ao ver o resultado da tool:

```python
# dentro de _run_one / agregação: se name == "defer_and_work" e result.get("deferred"):
#   marcar state["deferred"] = True  (novo campo opcional no AgentState)
```

### 7.2 Novo campo no `AgentState`

Em `agent/app/graph/state.py`, adicionar (TypedDict `total=False`, sem quebrar
nada):

```python
class AgentState(TypedDict, total=False):
    ...
    deferred: bool          # NOVO — sinaliza que o turno terminou via defer_and_work
    resume_context: dict    # NOVO — usado pelo run_resume para carregar o result da task
```

`final_response` fica `None` quando `deferred` é `True`; `run_agent` já trata
`final_response` nulo (o webhook envia fallback só se não houver nada — por isso
o `defer-task` é quem garante que a frase humana já saiu **antes** do turno
terminar).

### 7.3 `message_id` disponível no executor

Para a idempotência de criação de task por `originMessageId` (§4.3), o executor
precisa propagar o `message_id` (já existe em `AgentState`) para o `args` da tool.
Hoje `_run_one` injeta `conversation_id` e `contact`; adicionar `message_id`:

```python
result = await call_tool(
    name,
    {**args, "conversation_id": conversation_id, "contact": contact,
     "message_id": state.get("message_id", "")},   # NOVO
    tenant_id,
)
```

### 7.4 Prompt da Sofia (planner)

Adicionar um bloco curto ao `PLANNER_SYSTEM` (`prompts.py`) ensinando **quando**
usar `defer_and_work` — sem virar regra rígida (a Sofia é encantadora, não
robótica). Resumo do que entra:

- Use `defer_and_work` quando a próxima resposta exigir garimpo/curadoria mais
  trabalhosa **ou** confirmar algo com a equipe — manda uma frase curta e
  calorosa avisando, e volta sozinha depois.
- **Não** use para busca simples (continua sendo `search_available_properties`
  direto, síncrono).
- Nunca prometa retorno que não vai cumprir — o sistema garante o re-engajamento.

> Reforça a honestidade da FUNDAÇÃO: no `/resume` a Sofia só fala de imóveis que
> a task realmente retornou (`result`); nunca inventa.

### 7.5 Tier de modelo (FUNDAÇÃO §4.5)

- `/process` e `/resume` (caminho conversacional) → **`MAIN`** (`gpt-4o-mini`),
  o re-engajamento é diálogo, não trabalho pesado.
- O **trabalho pesado** de `property_research` roda **no worker (Functions)** e é o
  único lugar onde o tier **`DEEP`** pode ser usado — **jamais no caminho síncrono
  do WhatsApp**. `max_tokens ≤ 1024`, histórico `[-20:]`, logar
  `total_tokens_in/out` (já feito nos nós). Tier `DEEP` fixado no doc `09`.

---

## 8. Modelo de dados (resumo; consolidado em 00 §4.3)

`tenants/{tenantId}/deferred_tasks/{taskId}` (camelCase):

```
taskId, conversationId, clientPhone (normalizado), taskType,
status: queued|running|done|failed|cancelled,
payload, clientMessage, resumeHint?, result?, error?, attempts,
createdAt, startedAt?, finishedAt?, resumedAt?, originMessageId
```

Campos **novos** em `tenants/{tenantId}/conversations/{id}`:

```
state, stateUpdatedAt, activeTaskId?, closingMode('ia'|'owner'|null), ownerAlertedAt?
```

`conversationId` canônico = `{tenantId}:{normalizedPhone}`. Entidades legadas
(`Lead`, `Conversation`, `Message`, `Reservation`) **permanecem**; referência por
id. Índices necessários (worker/watchdog): `deferred_tasks` por
`(status, startedAt)` e por `conversationId`.

---

## 9. Inventário: novo vs. reuso

**Novo:**
- `lib/conversation/state.ts` (`ConversationState`, `setConversationState`,
  `getConversationState`) — superset de `ai-block.ts`.
- Coleção `deferred_tasks` + campos novos em `conversations` (modelo em 00 §4.3).
- Tool `defer_and_work` (`registry.py`) + mapa em `client.py`.
- Endpoint locai `POST /api/agent/tools/defer-task`.
- Endpoint agente `POST /resume` + `run_resume()` (`graph.py`).
- Worker de tasks em **Firebase Functions** (1º código de `functions/`, doc `08`).
- Campos `deferred`/`resume_context` em `AgentState`; curto-circuito em `graph.py`.

**Reuso (não reinventar):**
- Canal de saída → `/api/v1/messages/{tenantId}/send`, extraído para
  `lib/whatsapp/outbound.ts` (mesmo `send` que já manda msg não solicitada).
- Takeover → `isAiBlocked`/`ai-block.ts`/Redis `ai_blocked:*` (mapeado em `MANUAL`).
- Idempotência → padrão `SET NX EX` de `deduplication-cache.ts`.
- Auth → HMAC `"{ts}.{body}"`, janela 60s (`agent-auth.ts`/`auth.py`).
- Escalonamento ao dono → tool `notify_owner` + `/operate` (doc `06`).
- Grafo router→planner⇄executor, `call_tool`, token logging — preservados.
- Multi-tenant → `TenantServiceFactory`.

---

## 10. Trade-offs e riscos (consolidado)

1. **Firestore + Redis não são transacionais.** Mitigação: Firestore é fonte de
   verdade; Redis é cache com TTL; webhook tem fallback; `/resume` é idempotente
   por `resume_done`.
2. **Tasks órfãs em `IA_TRABALHANDO`.** Mitigação: timeout do worker +
   watchdog cron (doc `08`) que força `/resume` de fallback e volta a `ATIVA`.
3. **Cliente muda de ideia durante `IA_TRABALHANDO`.** v1: a Sofia só reage no
   `/resume` (com o histórico bufferizado). Cancelamento por intent fica para
   melhoria futura (mais relevante em `ask_owner` longo).
4. **Re-entrega de Cloud Tasks.** Mitigação: `resume_done:{tenantId}:{taskId}`
   `SET NX EX` torna o `/resume` e o envio outbound idempotentes.
5. **`DEEP` é o tier mais caro.** Confinado ao worker em background; nunca no
   caminho síncrono; teto de tokens e janela de histórico (doc `09`).
6. **Sofia inventar resultado.** Mitigação: o `/resume` injeta o `result` real
   num bloco de sistema com instrução explícita de "use só o que for verdade" —
   alinhado ao princípio de honestidade da FUNDAÇÃO.

---

## 11. Sequência de implementação (Fase 1, item 2 do roadmap)

Pré-requisito: item 1 da Fase 1 (máquina de estados — §2 deste doc +
`lib/conversation/state.ts` + webhook checando `state`).

1. Extrair `lib/whatsapp/outbound.ts` de `dispatchToAgent` (refactor sem mudança
   de comportamento).
2. Criar `deferred_tasks` + campos novos de `conversations` (modelo em 00 §4.3).
3. Implementar `POST /api/agent/tools/defer-task` (idempotente).
4. Adicionar `defer_and_work` ao `registry.py`/`client.py` e curto-circuito no
   grafo (`state.py`/`graph.py`/`nodes.py`); atualizar `PLANNER_SYSTEM`.
5. Implementar `/resume` + `run_resume()` no agente.
6. Implementar o worker em Functions + Cloud Tasks + watchdog (doc `08`).
7. Telemetria: logar transições de estado, lifecycle de task e `total_tokens_*`
   (doc `09`).
