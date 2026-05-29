# 06 — Canal direto IA↔dono (notificações + consultor)

> **Posição no blueprint:** este documento é a versão de implementação concreta do contrato **§4.4 (Canal IA↔Dono)** da FUNDAÇÃO ([`./00-overview.md`](./00-overview.md)). Ele depende de [`./01-agente-proativo-stateful.md`](./01-agente-proativo-stateful.md) (estado `AGUARDANDO_HUMANO`, task `ask_owner`, `/resume`, idempotência de outbound). Faz parte da **Fase 1 (destravamento)**.
>
> **Princípio que governa este doc:** Humano-no-loop (§Princípios 4) — "sempre há alerta com destaque (push + WhatsApp pessoal + deep-link) e takeover". A IA nunca decide sozinha em fechamento; ela **chama o dono** com destaque máximo e **responde o dono** como fonte de verdade conversacional.

---

## 1. O que este canal é (e o que não é)

O **canal direto IA↔dono** tem duas direções, ambas sobre infraestrutura que **já existe**:

1. **IA → dono (alerta proativo):** quando um cliente sinaliza fechamento, escala, ou a IA precisa de uma decisão humana, ela **chama a atenção do dono** por três trilhos simultâneos — **push (dashboard/web push)**, **WhatsApp no número PESSOAL do dono** e **deep-link** que abre exatamente a conversa relevante (`/dashboard/conversas?phone=...`). A mensagem é direta e acionável: _"Cliente X quer fechar, chama AGORA"_.

2. **Dono → IA (consultor conversacional):** o dono **pergunta** em vez de garimpar painéis. A persona **Analista** (já implementada em `agent/app/graph/prompts.py`, `_OPERATOR_BASE`) é a **fonte de verdade conversacional** do negócio — _"como estão as vendas hoje?"_, _"por que o apê X não fechou?"_ — e responde com número real + interpretação + ação. Hoje isso é **reativo** (o dono escreve no console). Este doc define a evolução para **proativo**: o `/operate` pode iniciar conversa com o dono e o dono pode responder pelo próprio WhatsApp pessoal.

**O que NÃO é:** não é um novo motor de mensageria (reusa o microserviço Baileys), não é um novo sistema de notificações (reusa `lib/services/notification-service.ts` + `app/api/notifications/*`), e não é e-signature nem pagamento (docs [`./04-contratos-assinatura.md`](./04-contratos-assinatura.md)/[`./03-pagamentos-caucao-mercadopago.md`](./03-pagamentos-caucao-mercadopago.md)). É a **camada de orquestração e gatilho** que conecta o que já existe ao dono certo, na hora certa, com o link certo.

---

## 2. O que já existe (reuso) vs o que é novo

### 2.1 Reuso (não reconstruir)

| Capacidade | Onde vive hoje | Como este canal reusa |
|---|---|---|
| **Outbound não solicitado** | microserviço Baileys: `POST {WHATSAPP_MICROSERVICE_URL}/api/v1/messages/{tenantId}/send` (já usado por `notify-owner` e `dispatchToAgent`) | mesmo endpoint para mandar ao número **pessoal** do dono |
| **Tool `notify_owner`** | `app/api/agent/tools/notify-owner/route.ts` + `agent/app/tools/registry.py`/`client.py` (`notify_owner → notify-owner`) | base do alerta IA→dono; **estendida** (§4) com push + deep-link + estado |
| **Telefone do dono** | `tenantSettings.company.phone` (lido em `notify-owner`) | canal do dono canônico (`config/owner-channel.ownerWhatsappPhone`, esquema no doc [`./11-settings.md`](./11-settings.md) — §8) |
| **Notificações in-app/push** | `lib/services/notification-service.ts`, `app/api/notifications/*` (CRUD, `mark-all-read`, `[id]`, `preferences`), tipos em `lib/types/notification.ts` (`NotificationType`, `NotificationChannel`, `NotificationPriority`, `NotificationAction`) | trilho **push/dashboard** do alerta; `NotificationAction` carrega o deep-link |
| **Deep-link de conversa** | `app/dashboard/atendimentos/page.tsx → openConversation()`: `router.push('/dashboard/conversas?phone=' + normalizeBrazilPhone(lead.phone))` | **formato canônico do deep-link** — reusado idêntico no push e no WhatsApp |
| **Console consultor** | `app/api/agent/console/route.ts → /operate`, personas `OPERATOR_ANALISTA_SYSTEM`/`OPERATOR_OPERADOR_SYSTEM`, `read_system` resource `insights` | dono pergunta; este doc adiciona o caminho **proativo** e o **inbound do dono via WhatsApp** |
| **Estado de conversa** | `lib/conversation/state.ts` (doc [`./01-agente-proativo-stateful.md`](./01-agente-proativo-stateful.md)), `AGUARDANDO_HUMANO`, compat `isAiBlocked`/`ai_blocked:*` | "IA chama o dono" ⇒ transição para `AGUARDANDO_HUMANO`; takeover ⇒ `MANUAL` |
| **Idempotência outbound** | Redis `SET NX EX` (`deduplication-cache`, `resume_done:*`) | toda mensagem ao dono é idempotente (§4.2/§5.4) |
| **Triagem/urgência** | `lib/utils/triage.ts` (`computeTriageStatus`, `sortLeadsByUrgency`), painel "Receita Perdida" | prioriza quais conversas geram alerta de alto destaque |

### 2.2 Novo (greenfield neste doc)

- **Tool `notify_owner` v2** — superset compatível: cria notificação push + WhatsApp pessoal + deep-link + transição `AGUARDANDO_HUMANO`, idempotente.
- **Tool `ask_owner`** (consultor proativo da IA durante atendimento) — variante de `defer_and_work` com `task_type='ask_owner'` (contrato doc [`./01-agente-proativo-stateful.md`](./01-agente-proativo-stateful.md)): a IA pergunta algo ao dono, **bufferiza** o cliente e re-engaja via `/resume` quando o dono responde.
- **Inbound do dono via WhatsApp pessoal** — webhook reconhece que o remetente é o **número do dono** e roteia para `/operate` (consultor) em vez de `/process` (Sofia cliente).
- **`ownerAlertedAt` / `activeTaskId`** em `conversations` (campos já reservados na FUNDAÇÃO §4.3) usados para anti-spam de alerta e correlação de resposta.
- **Coleção `owner_alerts`** (greenfield, sob `tenants/{tenantId}/`) — log auditável + SLA de re-ping.
- **Canal do dono em config** (esquema no doc [`./11-settings.md`](./11-settings.md), consumido aqui em §8).
- **Endpoint `notify-owner-alert`** (kebab) e, na Fase 1+, o **worker de SLA de re-ping** como 1º/2º código de `functions/` (doc [`./08-backend-firebase-functions.md`](./08-backend-firebase-functions.md)).

---

## 3. Modelo de dados

Tudo sob `tenants/{tenantId}/`, campos **camelCase** (convenção §4.6). Não renomear nada da FUNDAÇÃO; apenas **adicionar**.

### 3.1 `conversations/{id}` — campos usados/atualizados

Campos já definidos na FUNDAÇÃO §4.3 que este canal **escreve**:

- `state` — transiciona para `AGUARDANDO_HUMANO` quando a IA chama o dono (via `setConversationState()`, doc [`./01-agente-proativo-stateful.md`](./01-agente-proativo-stateful.md)).
- `ownerAlertedAt?: Timestamp` — quando o dono foi alertado pela última vez nesta conversa (anti-spam / base do SLA de re-ping).
- `activeTaskId?: string` — quando há `ask_owner` em curso, aponta para o `deferred_tasks/{taskId}`.
- `closingMode: 'ia' | 'owner' | null` — snapshot por conversa do `config/closing.mode` (modalidades no doc [`./02-fechamento-modalidades.md`](./02-fechamento-modalidades.md), esquema no doc [`./11-settings.md`](./11-settings.md)); o alerta de fechamento só dispara o caminho "dono-finalizador" quando `closingMode === 'owner'`.

`conversationId` canônico = `{tenantId}:{normalizedPhone}` (sempre via `normalizeBlockPhone()`).

### 3.2 `owner_alerts/{alertId}` — NOVO (log + SLA)

```
owner_alerts/{alertId}
  alertId: string
  conversationId: string            // {tenantId}:{normalizedPhone}
  clientPhone: string               // normalizado (normalizeBlockPhone)
  clientName?: string
  propertyId?: string               // opcional, espelha notify_owner
  reason: 'closing' | 'escalation' | 'ask_owner' | 'sla_stale' | 'other'
  severity: 'high' | 'critical'     // mapeia NotificationPriority
  summary: string                   // frase humana ("Cliente X quer fechar...")
  deepLink: string                  // /dashboard/conversas?phone=...
  channels: ('push' | 'whatsapp')[] // trilhos efetivamente disparados
  notificationId?: string           // id em app/api/notifications (trilho push)
  whatsappMessageId?: string        // retorno do microserviço (trilho WhatsApp)
  taskId?: string                   // quando reason='ask_owner' (deferred_tasks)
  status: 'sent' | 'seen' | 'acknowledged' | 'resolved' | 'expired'
  repingCount: number               // quantas vezes já re-pingou (SLA)
  ackedAt?: Timestamp               // dono abriu/assumiu a conversa
  resolvedAt?: Timestamp
  createdAt / updatedAt: Timestamp
  alertEventIds: string[]           // idempotência (SET NX EX espelhado)
```

**Por que coleção própria e não só `notifications`?** `notifications` é genérico e multi-usuário (agenda, tickets, pagamentos). `owner_alerts` é o **canal crítico de fechamento** com semântica própria (SLA de re-ping, correlação com `deferred_tasks`/`/resume`, ack pelo deep-link). O trilho push **usa** `notifications` por baixo; `owner_alerts` é o registro de verdade do canal.

### 3.3 Telefone do dono (config) — ver §8

`config/owner-channel` (esquema no doc [`./11-settings.md`](./11-settings.md)): `ownerWhatsappPhone` (normalizado via `normalizeBlockPhone`), `channel`, `alertOn*`, `quietHours`, thresholds de re-ping. Mantém compat com `company.phone` (fallback).

---

## 4. Direção 1 — IA chama a atenção do dono (alerta proativo)

### 4.1 Gatilhos (quando a IA chama)

A IA dispara um alerta IA→dono em quatro situações, todas convergindo no mesmo orquestrador:

1. **Cliente quer fechar** e `closingMode === 'owner'` (dono-finalizador, doc [`./02-fechamento-modalidades.md`](./02-fechamento-modalidades.md)) → `reason='closing'`, `severity='critical'`. Mensagem: _"Cliente X quer fechar, chama AGORA"_.
2. **Escalonamento explícito** (cliente pede humano / IA não dá conta) → `reason='escalation'`, `severity='high'`. É o caminho atual de `notify_owner`.
3. **IA precisa de uma resposta do dono durante o atendimento** (`ask_owner`, §6) → `reason='ask_owner'`. Aqui o alerta **pede uma resposta** (não só avisa).
4. **SLA de conversa parada** (lead quente sem retorno; reusa `lib/utils/triage.ts`) → `reason='sla_stale'`, gerado por job (Functions, doc [`./08-backend-firebase-functions.md`](./08-backend-firebase-functions.md)), não pelo grafo.

### 4.2 Os três trilhos do alerta

Um único alerta dispara **em paralelo**, com idempotência por `alertEventId`:

**Trilho A — WhatsApp pessoal do dono.** Reusa o outbound existente:
```
POST {WHATSAPP_MICROSERVICE_URL}/api/v1/messages/{tenantId}/send
Authorization: Bearer {WHATSAPP_MICROSERVICE_API_KEY}
body: { to: <ownerWhatsappPhone>, type: 'text', text: <mensagem com deep-link> }
```
A mensagem é curta, direta e **contém o deep-link** (WhatsApp torna URLs clicáveis). Exemplo:
```
🔴 FECHAMENTO — chama AGORA
João Silva quer fechar o "Apto Beira-Mar 2Q".
Check-in 12/06, 4 hóspedes.
Abrir conversa: https://alugazap.tensorroot.com/dashboard/conversas?phone=5511999998888
```
> Único ponto onde emoji é aceitável: alerta crítico no WhatsApp pessoal do dono (sinalização de urgência), **não** na UI do dashboard (preferência registrada: UI sem emoji).

**Trilho B — Push / dashboard.** Reusa `notification-service.ts` + `app/api/notifications`:
- `type: NotificationType.CONVERSATION_MESSAGE_RECEIVED` (ou um novo `OWNER_ALERT_CLOSING` adicionado ao enum — adição, nunca rename).
- `priority: NotificationPriority.CRITICAL` (closing) / `HIGH` (escalation).
- `channels: [NotificationChannel.DASHBOARD, NotificationChannel.WHATSAPP]`.
- `actions: NotificationAction[]` com o deep-link (o tipo já suporta `{ action: 'navigate', label, url }`):
  ```ts
  actions: [
    { id: 'open', label: 'Abrir conversa', action: 'navigate', url: '/dashboard/conversas?phone=5511999998888' },
    { id: 'assume', label: 'Assumir (takeover)', action: 'api_call', url: '/api/ai/block-conversation' },
  ]
  ```
- `entityType: 'conversation'`, `entityId: conversationId`.

**Trilho C — Destaque visual na lista de atendimentos.** A página `app/dashboard/atendimentos/page.tsx` já ranqueia por urgência (`sortLeadsByUrgency`) e tem o filtro **"Precisam de você"**. O alerta marca o lead/conversa para o topo com badge crítico, reusando `computeTriageStatus`. O botão "Abrir" usa o mesmo `openConversation()` que já existe (deep-link idêntico). Nenhuma rota nova de UI — apenas a flag de alerta (de `owner_alerts.status='sent'` não-ackado).

### 4.3 Deep-link canônico

Formato **único** em todos os trilhos (já é o formato real do repo):
```
/dashboard/conversas?phone={normalizeBrazilPhone(clientPhone)}
```
Em WhatsApp/push, prefixar com a base pública (`alugazap.tensorroot.com` em prod). A página de conversas deve ler `?phone=` e auto-selecionar a conversa (a página de atendimentos já gera esse link; a de conversas precisa **honrar** o query param — verificar/ajustar em `app/dashboard/conversas/page.tsx`, fora do escopo deste doc mas pré-requisito).

Abrir o deep-link → marca `owner_alerts.status='seen'` e, ao assumir, `'acknowledged'` + `ackedAt` (mata o re-ping).

### 4.4 Tool `notify_owner` v2 (estendida, compatível)

Superset da atual `notify-owner/route.ts`. Mantém a assinatura existente e **adiciona** campos opcionais. Args (LLM, snake_case):

```jsonc
notify_owner({
  tenant_id, property_id?,        // property_id agora opcional (escalar sem imóvel — já previsto no prompt)
  client_summary,                 // frase humana ("Cliente X quer fechar...")
  conversation_id?,               // {tenantId}:{normalizedPhone}
  contact?: { name?, phone? },
  reason?: 'closing'|'escalation'|'other',   // default 'escalation' (compat)
  severity?: 'high'|'critical'               // default deriva de reason
})
```

Efeitos do endpoint `notify-owner` v2 (ordem):
1. Resolve o **número do dono** (`config/owner-channel.ownerWhatsappPhone` → fallback `company.phone`).
2. Monta `deepLink` a partir de `conversation_id`/`contact.phone` (`normalizeBlockPhone`).
3. **Idempotência:** `SET NX EX alert_sent:{tenantId}:{conversationId}:{reason}` (janela curta, ex. 90s) — evita alerta duplicado do mesmo turno/retry.
4. Cria `owner_alerts/{alertId}` (`status='sent'`).
5. Dispara **Trilho A** (WhatsApp pessoal) e **Trilho B** (notification push) — falha parcial é tolerada e logada por trilho em `channels`/`deliveryStatus`.
6. `setConversationState(conversationId, 'AGUARDANDO_HUMANO')` (doc [`./01-agente-proativo-stateful.md`](./01-agente-proativo-stateful.md); escreve Firestore+Redis atômico) e grava `ownerAlertedAt`.
7. Retorna `{ ok, alertId, channels }`.

Tudo multi-tenant via `TenantServiceFactory`; auth HMAC via `validateAgentRequest` (idêntico ao route atual). Logging com PII mascarado.

### 4.5 Diagrama de sequência — alerta de fechamento (dono-finalizador)

```
Cliente (WhatsApp): "fechado, quero esse!"
   │
   ▼ inbound
webhook whatsapp-microservice ── dedup SET NX EX ──▶ /process (agente)
   │
   ▼ grafo: router=close_deal → planner
planner decide: closingMode==='owner' ⇒ chama notify_owner(reason='closing', severity='critical')
   │
   ▼ executor → POST /api/agent/tools/notify-owner (HMAC)
notify-owner v2:
   ├─ resolve ownerWhatsappPhone (config/owner-channel)
   ├─ SET NX EX alert_sent:{tenant}:{conv}:closing
   ├─ cria owner_alerts (status=sent)
   ├─ Trilho A → microserviço /send → WhatsApp PESSOAL do dono (com deep-link)
   ├─ Trilho B → notification-service → push/dashboard (NotificationAction deep-link)
   └─ setConversationState(AGUARDANDO_HUMANO) + ownerAlertedAt
   │
   ▼ Sofia responde ao CLIENTE (turno normal, outbound existente):
        "Perfeito! Já avisei nosso time, em instantes alguém te chama pra fechar 🙌"
   │
   ▼ (assíncrono) Dono recebe push + WhatsApp pessoal
Dono toca deep-link → /dashboard/conversas?phone=...
   ├─ owner_alerts.status=seen
   └─ dono dá takeover → POST /api/ai/block-conversation ⇒ state=MANUAL (ai_blocked)
       owner_alerts.status=acknowledged, ackedAt  (cancela SLA de re-ping)
```

Pontos-chave: a IA **não fecha**; ela alerta com destaque máximo e entrega ao humano (Princípio 2, Copiloto > autônomo). A conversa fica `AGUARDANDO_HUMANO` até o takeover (`MANUAL`), e o cliente recebe uma resposta de ponte natural.

### 4.6 SLA de re-ping (dono não viu)

Se `owner_alerts.status` continua `'sent'` após `repingThresholdMinutes` (settings, default 5 min em `severity='critical'`), um **worker** (Cloud Tasks/Pub/Sub, doc [`./08-backend-firebase-functions.md`](./08-backend-firebase-functions.md)) re-dispara o Trilho A com escalada de tom (_"Ainda esperando — cliente quente"_), incrementa `repingCount` até `maxRepings`. Idempotente por `alert_reping:{alertId}:{n}` (SET NX EX). Para quando `acknowledged`/`resolved` ou `maxRepings`. `reason='ask_owner'` **não tem timeout** mas tem re-ping com SLA (doc [`./01-agente-proativo-stateful.md`](./01-agente-proativo-stateful.md)).

---

## 5. Direção 2 — Dono pergunta à IA (consultor conversacional / fonte de verdade)

### 5.1 Hoje (reativo, já existe)

`app/api/agent/console/route.ts` recebe `{ message, mode }` do dashboard, assina HMAC `"{ts}.{body}"` e chama `agent /operate`. A persona **Analista** (`_OPERATOR_BASE` + `OPERATOR_ANALISTA_SYSTEM`) responde com `read_system` (resource `insights`, `dashboard`, etc.), seguindo **honestidade de dados** (sem dado → diz que não tem, nunca inventa). Modo `analista` é read-only por construção; `operador` pode escrever.

Este é o "ele pergunta em vez de checar painéis" da visão do produto — **já funciona** dentro do dashboard.

### 5.2 Novo — dono pergunta pelo WhatsApp pessoal (inbound)

Para o dono não precisar abrir o dashboard, o **mesmo número pessoal** que recebe alertas pode receber perguntas: o dono responde _"e as vendas hoje?"_ no WhatsApp e a Analista responde ali.

**Roteamento (no webhook `whatsapp-microservice`):**
1. Normaliza o remetente (`normalizeBlockPhone`).
2. Se `from === config/owner-channel.ownerWhatsappPhone` (e a feature `ownerInboundConsultant` está ligada) → **não** é cliente: roteia para `console`→`/operate` (modo `analista` por padrão; `operador` só com confirmação explícita, §5.4), **não** para `/process` (Sofia cliente).
3. Caso contrário, fluxo normal de cliente.

A resposta volta pelo mesmo microserviço (`/send` para o número do dono). Reusa 100% o outbound; o que muda é o **destino do grafo** e a **persona**.

### 5.3 Correlação alerta ↔ resposta do dono

Se o dono responde a um alerta no WhatsApp pessoal com uma **instrução de ação** (ex.: _"pode mandar o link de pagamento e coletar contrato"_), e há `owner_alerts` recente apontando para uma conversa (`activeTaskId`/`ownerAlertedAt`), o `/operate` recebe esse contexto e pode:
- responder como consultor (analista), ou
- com `mode='operador'` e instrução clara, disparar a parte "chata" do fechamento (iCal lock, gerar contrato, link de pagamento — docs [`./05-ical-disponibilidade.md`](./05-ical-disponibilidade.md)/[`./04-contratos-assinatura.md`](./04-contratos-assinatura.md)/[`./03-pagamentos-caucao-mercadopago.md`](./03-pagamentos-caucao-mercadopago.md)).

A passagem do alerta para fechamento delegado é o handoff descrito no doc [`./02-fechamento-modalidades.md`](./02-fechamento-modalidades.md); aqui garantimos o **canal** e a **correlação** (qual conversa o dono está respondendo).

### 5.4 Segurança do inbound do dono

- **Autenticação do remetente:** o "login" é o número pessoal cadastrado em settings (configurado pelo dono autenticado no dashboard). Spoofing de número WhatsApp é o vetor de risco → **trade-off** em §9.
- **Modo padrão = `analista` (read-only).** Ações que mutam (`operador`) exigem **confirmação explícita** na própria conversa (ex.: _"confirma enviar o link de R$ X para o João? responda SIM"_) antes de executar. Espelha a cautela do `OPERATOR_OPERADOR_SYSTEM` ("trate escritas com cautela e confirme").
- Idempotência inbound: mesmo dedup `SET NX EX` do webhook atual.
- Multi-tenant: o número do dono resolve o `tenantId` (lookup reverso phone→tenant já necessário; ver `lead-lookup`/settings).

---

## 6. `/operate` evoluindo para proativo + a tool `ask_owner`

Hoje `/operate` é **puxado** pelo dono. A evolução para proativo tem duas faces:

### 6.1 A IA pergunta ao dono durante um atendimento (`ask_owner`)

É o caso da visão: _"checar info num chat interno com o humano da imobiliária"_. Implementado como **variante de `defer_and_work`** (contrato no doc [`./01-agente-proativo-stateful.md`](./01-agente-proativo-stateful.md)), `task_type='ask_owner'`:

1. Durante `/process`, Sofia precisa de algo que só o dono sabe (_"o apê X aceita pet?"_, _"esse desconto pode?"_).
2. Chama `defer_and_work({ client_message: "Deixa eu confirmar uma coisinha rapidinho e já te falo!", task_type: 'ask_owner', task_payload: { question, conversationId }, resume_hint })`.
3. Efeitos (§4.2): estado da conversa do **cliente** → `IA_TRABALHANDO`; envia `client_message` agora; cria `deferred_tasks/{taskId}` (`status:queued`); `conversations.activeTaskId = taskId`. Mensagens do cliente nesse meio-tempo são **persistidas mas não disparam `/process`** (bufferizadas).
4. O **worker** (Function, doc [`./08-backend-firebase-functions.md`](./08-backend-firebase-functions.md)) ao processar `ask_owner` **não** roda LLM pesado — ele dispara um **alerta IA→dono** (§4) com `reason='ask_owner'`, pedindo a resposta, e fica aguardando (sem timeout, com SLA de re-ping). `owner_alerts.taskId = taskId`.
5. O dono responde **no WhatsApp pessoal** (§5.2) ou no dashboard. A resposta é capturada e correlacionada via `activeTaskId`/`owner_alerts.taskId`.
6. A resposta do dono vira `deferred_tasks.result` (`status:done`) e chama **`/resume`** (FastAPI, espelha `/process`, mesma HMAC): monta histórico + bloco de sistema com `result`, roda o grafo, Sofia **re-engaja o cliente** com a info do dono. Estado `IA_TRABALHANDO → ATIVA` (ou `FECHAMENTO`/`AGUARDANDO_HUMANO`).
7. **Idempotência:** `/resume` por `resume_done:{tenantId}:{taskId}` (SET NX EX).

```
Cliente: "esse apê aceita meu cachorro?"
   │ /process → Sofia não sabe → defer_and_work(ask_owner)
   ├─ envia AGORA ao cliente: "deixa eu confirmar rapidinho!"
   ├─ conv(cliente).state = IA_TRABALHANDO, activeTaskId=T1
   └─ deferred_tasks/T1 (queued)
        │ worker (Function)
        ▼
   alerta IA→dono (reason=ask_owner, owner_alerts.taskId=T1):
     WhatsApp pessoal: "Sofia pergunta: o 'Apto X' aceita pet? (responde aqui)"
        │
        ▼ Dono responde no WhatsApp pessoal: "aceita sim, até 10kg"
   inbound webhook → reconhece dono → correlaciona activeTaskId=T1
   deferred_tasks/T1.result = "aceita até 10kg", status=done
        │
        ▼ POST /resume {task_id:T1, result, ...}  (idempotente)
   grafo roda → Sofia re-engaja o CLIENTE:
     "Boa notícia! Pode trazer o doguinho sim, até 10kg 🐶"
   conv(cliente).state = ATIVA
```

### 6.2 `/operate` proativo (consultor que puxa conversa)

Além de responder, a Analista pode **iniciar** contato com o dono — não só por alerta de fechamento, mas como **briefing proativo**: digest diário/semanal ("3 leads quentes sem retorno há +24h", "receita perdida estimável: null sem ad-spend"). Implementação:
- Job agendado (Function, doc [`./08-backend-firebase-functions.md`](./08-backend-firebase-functions.md); insights/BI no doc [`./07-atendimentos-bi.md`](./07-atendimentos-bi.md)) computa via `crm-insights-core.ts`/`read_system insights`.
- Se houver algo acionável, dispara mensagem ao dono pelo trilho WhatsApp/push com deep-links para as conversas em risco.
- O dono pode **responder** o digest (vira inbound consultor, §5.2) — a conversa com a IA continua naturalmente.
- **Honestidade:** o digest nunca fabrica número; métricas sem dado vêm `null`/`costDataAvailable:false` (já em `crm-insights-core.ts` e na persona).

> **Tier de modelo:** o `ask_owner` worker e o disparo de digest são **leves** (montagem de mensagem) → `FAST`. A computação de funil sob pedido pesada (análise profunda) é `DEEP` e **só em background** (tiers/`MODEL_DEEP` definidos no doc [`./09-modelos-custo.md`](./09-modelos-custo.md)). O caminho síncrono do WhatsApp nunca usa `DEEP`.

---

## 7. Persona Analista como fonte de verdade (ajustes de prompt)

A persona já está madura (`_OPERATOR_BASE` em `prompts.py`). Ajustes para o canal proativo (adições, sem reescrever):

- **Consciência de canal:** quando a conversa chega pelo WhatsApp pessoal do dono, a Analista sabe que está em chat (mensagens curtas, sem markdown pesado — já é regra) e que ações de escrita exigem confirmação explícita.
- **Correlação de alerta:** quando o turno traz contexto de `owner_alerts`/`activeTaskId`, a Analista entende que o dono está respondendo a um alerta específico (ex.: a pergunta do `ask_owner`) e foca nisso.
- **Fonte de verdade:** reforçar que ela é o ponto único onde o dono pergunta sobre o negócio — sempre `read_system` antes de afirmar, sempre número + interpretação + ação, sempre honestidade (null quando não há dado).

Sofia (cliente) ganha apenas a noção de **defer** (cobertura nos docs [`./01-agente-proativo-stateful.md`](./01-agente-proativo-stateful.md) e [`./12-personas-prompts.md`](./12-personas-prompts.md)): pode dizer "espera um segundinho" e parar, em vez de inventar/responder no escuro.

---

## 8. Preferências e canais do dono (esquema no doc [`./11-settings.md`](./11-settings.md))

Documento `config/owner-channel` (sob `tenants/{tenantId}/config/`) — o esquema é **dono do doc [`./11-settings.md`](./11-settings.md)** (settings); aqui apenas o consumimos. Editável em `app/dashboard/settings/*` (segue o padrão dos grupos existentes: `company`, `whatsapp`, `ai-config`, `negotiation`, `policies`, `profile`, `financial`). API espelha `app/api/tenant/settings/*` + reusa `app/api/notifications/preferences`.

Campos:
```
config/owner-channel:
  ownerWhatsappPhone: string       // número do dono (normalizado via normalizeBlockPhone, separado de company.phone)
  channels:
    whatsapp: boolean              // default true
    push: boolean                  // default true (NotificationChannel.DASHBOARD)
  ownerInboundConsultant: boolean  // dono pode perguntar pela IA via WhatsApp pessoal (default false até validar segurança)
  consultantDefaultMode: 'analista' | 'operador'   // default 'analista'
  requireConfirmForWrites: boolean // default true
  alertSeverityFloor: 'high' | 'critical'          // o que vira WhatsApp pessoal vs só push
  reping:
    enabled: boolean               // default true
    thresholdMinutes: number       // default 5 (critical) / 15 (high)
    maxRepings: number             // default 3
  quietHours:                      // reusa shape de NotificationPreferences.quietHours
    enabled, start, end, timezone
  proactiveDigest:
    enabled: boolean               // default false
    frequency: 'daily' | 'weekly'
```

Regras:
- **Quiet hours** suprime push e WhatsApp **exceto** `severity='critical'` (fechamento sempre fura quiet hours — é o momento que mais importa). Trade-off em §9.
- `ownerWhatsappPhone` ausente → fallback `company.phone` (compat com `notify-owner` atual), com aviso no onboarding/settings para configurar o número do dono.
- Mínima fricção (visão do produto): o onboarding (`RevolutionaryOnboarding`) pode coletar o número pessoal junto do passo WhatsApp; o resto tem defaults sãos.

---

## 9. Onde a lógica vive (Functions incremental, doc [`./08-backend-firebase-functions.md`](./08-backend-firebase-functions.md))

Seguindo Decisão 2 (Functions incremental, novo/pesado/assíncrono primeiro):

| Componente | Onde vive | Justificativa |
|---|---|---|
| `notify_owner` v2 (disparo síncrono no turno) | Next.js `app/api/agent/tools/notify-owner` (estendido) | é chamado dentro do `/process`; latência baixa; já existe |
| Inbound do dono (roteamento) | Next.js `app/api/webhook/whatsapp-microservice` (estendido) | já é o ponto de entrada |
| Console/`/operate` proativo | agente FastAPI + Next.js `console` | já existe |
| **Worker de `ask_owner`** | **Function** (Cloud Tasks/Pub/Sub) | assíncrono, é o 1º/2º código de `functions/` (FUNDAÇÃO §4.2) |
| **SLA de re-ping** | **Function** (Cloud Tasks com schedule/retry) | assíncrono, fora do request |
| **Digest proativo** | **Function** (cron) | batch, fora do caminho síncrono; usa `DEEP` só aqui |

Todas as Functions usam a **mesma HMAC** (`"{ts}.{body}"`, janela 60s) e o mesmo `logger` com PII mascarado (§4.6).

---

## 10. Compatibilidade e migração

- `notify_owner` **continua funcionando** com a assinatura atual; os campos novos são opcionais → zero quebra no agente até atualizar `registry.py`.
- `MANUAL ⇔ ai_blocked` preservado: takeover do dono via `/api/ai/block-conversation` continua sendo o caminho de assumir.
- O deep-link já é o formato real (`atendimentos/page.tsx`); nenhuma migração de URL.
- `notifications`/`preferences` reusados; `owner_alerts` é aditivo.
- Quando `config/owner-channel` não tem `ownerWhatsappPhone`, comportamento idêntico ao de hoje (`company.phone`).

---

## 11. Trade-offs e riscos

1. **Spoofing do número do dono (inbound consultor).** Reconhecer o dono só pelo número WhatsApp é frágil — número pode ser falsificado/portado. **Mitigação:** `ownerInboundConsultant` desligado por default; modo `analista` (read-only) por default; escritas exigem confirmação; ações sensíveis (pagamento/contrato) podem exigir confirmação no dashboard, não só no chat. **Aceito** para Fase 1 com defaults conservadores.
2. **Fadiga de alerta.** WhatsApp pessoal demais vira ruído e o dono ignora o crítico. **Mitigação:** `alertSeverityFloor` (só `critical` no WhatsApp por padrão), anti-spam (`ownerAlertedAt` + `SET NX EX`), quiet hours, re-ping limitado (`maxRepings`).
3. **Quiet hours vs urgência.** Fechamento fura quiet hours — pode incomodar de madrugada. É **decisão consciente** (Princípio 4: humano-no-loop, o momento de fechar é o que mais importa). Configurável via `alertSeverityFloor`.
4. **`ask_owner` sem timeout.** Cliente fica em `IA_TRABALHANDO` esperando o dono; se o dono nunca responde, a conversa trava. **Mitigação:** SLA de re-ping + um **escape** (após N re-pings, `/resume` com `result` "sem resposta do dono" → Sofia dá uma saída educada e cai em `AGUARDANDO_HUMANO`). Bufferização das mensagens do cliente (§4.2) evita perder contexto.
5. **Entrega WhatsApp não garantida.** Baileys pode falhar/sessão cair. **Mitigação:** trilho push é redundante; `owner_alerts.channels`/`deliveryStatus` registra falha por trilho; re-ping cobre não-entrega.
6. **Falha parcial entre trilhos.** Push ok, WhatsApp falha (ou vice-versa). **Aceito:** alerta é best-effort multi-trilho; o que importa é pelo menos um chegar; tudo logado.
7. **Lookup reverso phone→tenant** (necessário para inbound do dono multi-tenant). Precisa ser eficiente e isolado. **Risco** de colisão de número entre tenants — `ownerWhatsappPhone` deve ser único por tenant (validar no settings).
8. **Custo.** Re-ping e digest geram outbound/LLM. **Mitigação:** tudo `FAST`/sem-LLM no caminho de alerta; `DEEP` só no digest em background; `maxRepings` limita; logar `total_tokens_*` (doc [`./09-modelos-custo.md`](./09-modelos-custo.md)).

---

## 12. Checklist de implementação (Fase 1)

- [ ] Estender `app/api/agent/tools/notify-owner/route.ts` → v2 (push + deep-link + `owner_alerts` + `setConversationState(AGUARDANDO_HUMANO)` + idempotência).
- [ ] Adicionar `notify_owner` args novos em `agent/app/tools/registry.py` (opcionais, compat).
- [ ] Criar coleção/serviço `owner_alerts` (`TenantServiceFactory`).
- [ ] Garantir que `app/dashboard/conversas/page.tsx` honra `?phone=` (auto-seleção) — pré-requisito do deep-link.
- [ ] Marcar destaque crítico em `app/dashboard/atendimentos/page.tsx` a partir de `owner_alerts` não-ackados (reusa `sortLeadsByUrgency`/filtro "Precisam de você").
- [ ] `ask_owner` como `task_type` de `defer_and_work` (depende do doc [`./01-agente-proativo-stateful.md`](./01-agente-proativo-stateful.md)); worker dispara alerta `reason='ask_owner'`.
- [ ] Inbound do dono no webhook (`from === ownerWhatsappPhone` → `/operate` analista).
- [ ] `config/owner-channel` + UI em settings + coleta no onboarding (esquema no doc [`./11-settings.md`](./11-settings.md)).
- [ ] Worker de re-ping (1º/2º código de `functions/`, doc [`./08-backend-firebase-functions.md`](./08-backend-firebase-functions.md)).
- [ ] (Fase posterior) digest proativo (`DEEP` em background, doc [`./09-modelos-custo.md`](./09-modelos-custo.md)).

---

**Resumo de contratos honrados:** estados `AGUARDANDO_HUMANO`/`IA_TRABALHANDO`/`MANUAL` (§4.1), `defer_and_work`/`ask_owner`/`/resume`/idempotência `resume_done` (§4.2), campos `state`/`ownerAlertedAt`/`activeTaskId`/`closingMode` em `conversations` (§4.3), canal IA↔dono reusando `notify_owner` + `/operate` + persona Analista (§4.4), tiers `FAST`/`DEEP` (§4.5), HMAC/`TenantServiceFactory`/`SET NX EX`/camelCase/kebab-case (§4.6). Nada renomeado.
