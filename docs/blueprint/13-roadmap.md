# 13 — Roadmap faseado

> **🎯 Recorte MVP (ver [`00-overview.md §6`](./00-overview.md)):** o **MVP** = IA
> atende tudo + handoff pro humano fechar (Fases 1-2: docs `01`,`02` Dono-finalizador,
> `06`,`07`,`08`,`09`,`10`,`11`,`12`). O **finalizador automático** (pagamento `03`,
> contrato `04`, iCal/chaves `05`, modo IA-finalizadora) é **PÓS-MVP** (Fase 3),
> só após o produto converter.

> **Documento de implementação.** Este é o plano de execução do blueprint Locai.
> Ele consolida a §6 do [`00-overview.md`](./00-overview.md) (Sequência de
> Implementação) e a transforma num roadmap acionável: priorização por **ICE**,
> dependências entre módulos, riscos com mitigação e marcos verificáveis.
>
> **Regra de ouro:** este doc NÃO redefine nenhum nome canônico. Todos os
> estados, coleções, tools, endpoints e tiers usados aqui vêm da §4 do
> [`00-overview.md`](./00-overview.md) (contratos transversais) e das 4 Decisões
> travadas. Onde algo é detalhado, aponto para o doc-fonte por nome de arquivo.

---

## 0. Princípios que governam a ordem das fases

A ordem das fases não é arbitrária — ela decorre diretamente das 4 Decisões e dos
princípios inegociáveis:

1. **Decisão 4 (proativo+stateful primeiro)** dita que a Fase 1 entrega a
   máquina de estados + defer/resume + canal IA↔dono. É o gap central: sem
   estado durável e sem capacidade de re-engajar, nada de fechamento,
   pagamento ou contrato funciona de ponta a ponta.
2. **Copiloto > autônomo** (princípio 2): a modalidade Dono-finalizador é
   cidadã de primeira classe. Por isso o **canal IA↔dono** (`06`) entra já na
   Fase 1, antes mesmo de pagamentos — o humano precisa estar no loop desde o
   primeiro fechamento.
3. **Custo sob controle** (princípio 3) e **Functions incremental** (Decisão 2)
   são transversais: começam na Fase 1 (o worker de tasks é o 1º código de
   `functions/`) e permeiam todas as fases. Não são uma fase no fim — são uma
   fundação que cresce.
4. **Reuso** (princípio 5): cada item do roadmap declara o que reusa do que já
   existe no repo vs. o que é greenfield. Reuso reduz I (impacto de erro) e C
   (custo de implementação), subindo o ICE.

---

## 1. Como leio a priorização (ICE)

**ICE = Impact × Confidence ÷ Effort.** Cada item recebe nota 1–5 em cada eixo.
ICE alto = fazer primeiro.

- **Impact (I):** quanto o item destrava produto/receita. Re-engajar cliente e
  fechar negócio pontuam alto.
- **Confidence (C):** quão certo estou de que a abordagem funciona. Reuso de
  código existente sobe C; integração com provedor externo novo baixa C.
- **Effort (E):** esforço de engenharia. Greenfield com infra nova (Functions,
  OAuth MP, provedor de assinatura) sobe E.

> ICE aqui é guia de sequência, não estimativa de prazo. Marcos (§6) são os
> pontos de verificação objetivos.

---

## 2. Mapa de dependências entre módulos

Diagrama de dependências (texto). `A → B` lê-se "B depende de A".

```
                    ┌─────────────────────────────────────────┐
                    │  TRANSVERSAIS (permeiam tudo, Fase 1→4)   │
                    │                                           │
                    │   Functions (08) ──────────┐              │
                    │   Tiers/Custo (09) ─────┐   │             │
                    │   BI/Atendimentos (07)  │   │             │
                    └─────────────────────────┼───┼─────────────┘
                                              │   │
   [F1] Máquina de estados (01) ──────────────┼───┤
        │  lib/conversation/state.ts          │   │
        │  campo conversations.state          │   │
        ▼                                     │   │
   [F1] Defer/resume (01) ◀────────────── DEEP tier (09)   1º código functions/ (08)
        │  defer_and_work, deferred_tasks,    │
        │  Function worker, /resume           │
        ▼                                     │
   [F1] Canal IA↔Dono (06) ◀── notify_owner (existe) + estado AGUARDANDO_HUMANO
        │  alertas + dono pergunta (/operate)
        ▼
   [F2] Modalidades de fechamento (02) ── estado FECHAMENTO
        │  closingMode 'ia'|'owner'
        ├──────────────► [F2] iCal lock (05)  ◀── export/import iCal (existe)
        │
        ▼
   [F3] MP split + caução (03) ◀── AbacatePay (existe, coexiste) + webhook (Function 08)
        │  deposits, OAuth MP em settings (11)
        ▼
   [F3] Contrato + assinatura (04) ◀── provedor ZapSign/Clicksign + template (Function 08)
        │  contracts, slots preenchidos via FAST tier (09)
        ▼
   [F4 contínuo] Onboarding/Settings (10/11) expõe: conectar MP, modalidade, número do dono
```

**Leitura das arestas críticas:**

- **`01` é a raiz.** A máquina de estados (`ConversationState` em
  `conversations/{id}.state` + cache Redis `conv_state:{tenantId}:{normalizedPhone}`)
  é pré-requisito de TUDO. Sem ela, o webhook não sabe se deve despachar ou
  bufferizar (estado `IA_TRABALHANDO`), nem reconhece `FECHAMENTO`.
- **Defer/resume depende de `01`.** O `defer_and_work` transiciona para
  `IA_TRABALHANDO` e o `/resume` volta para `ATIVA`/`FECHAMENTO`/`AGUARDANDO_HUMANO`.
  Sem os estados, não há para onde transicionar. (Defer/resume é detalhado no
  próprio `01`.)
- **Defer/resume é o primeiro a tocar `functions/` (`08`).** O worker de tasks +
  `/resume` é o 1º código greenfield em Functions (Decisão 2). Logo, `08`
  arranca junto com a Fase 1, não depois.
- **`06` depende de `01`.** O canal IA↔dono usa o estado `AGUARDANDO_HUMANO` e,
  em parte, o protocolo defer/resume (`task_type:ask_owner` é uma task diferida
  que aguarda resposta do dono).
- **`02` (fechamento) depende de `01`+`06`.** O estado `FECHAMENTO` e a escolha
  `closingMode` ('ia' vs 'owner') exigem estados duráveis e o canal de
  intervenção do dono.
- **`05` (iCal lock) depende de `02`.** Travar datas só faz sentido dentro de um
  fluxo de fechamento; reusa export/import iCal já existentes.
- **`03` (MP split) depende de `02`+`05`+`11`.** Caução só é cobrada num
  fechamento; o OAuth MP é conectado em settings (`11`); a confirmação chega via
  webhook idempotente que vive em `functions/` (`08`).
- **`04` (contrato) depende de `02`+`03`.** Geração/assinatura ocorre no
  fechamento, normalmente após (ou junto de) a caução; slots preenchidos via
  tier `FAST`.
- **`07`, `09`, `10`/`11` permeiam.** BI já existe e evolui; tiers/custo entram
  com o tier `DEEP` na Fase 1; settings expõe cada feature conforme aterrissa.

---

## 3. Tabela mestra de priorização (ICE)

| # | Módulo | Doc | Fase | I | C | E | ICE | Reuso vs Greenfield |
|---|--------|-----|------|---|---|---|-----|---------------------|
| 1 | Máquina de estados de conversa | `01` | 1 | 5 | 5 | 2 | **12.5** | Reusa `isAiBlocked`/Redis, `normalizeBlockPhone`, dedup. Greenfield: `lib/conversation/state.ts`, campo `state`. |
| 2 | Defer/resume (agente proativo) | `01`, `08` | 1 | 5 | 4 | 4 | **5.0** | Reusa outbound (`/api/v1/messages/{tenantId}/send`), HMAC, grafo. Greenfield: `defer_and_work`, `deferred_tasks`, `functions/` worker, `/resume`. |
| 3 | Canal IA↔Dono | `06` | 1 | 4 | 5 | 2 | **10.0** | Reusa `notify_owner`, `/operate` (operator console), persona Analista. Greenfield: deep-links, push, número pessoal em settings. |
| 4 | Modalidades de fechamento | `02` | 2 | 5 | 4 | 3 | **6.7** | Reusa estado `FECHAMENTO`, canal IA↔dono, `closingMode`. Greenfield: handoff dono↔IA. |
| 5 | iCal lock no fechamento | `05` | 2 | 3 | 5 | 2 | **7.5** | Reusa export/import/sync iCal (`ical-generator-service`, `calendar-sync-service`). Greenfield: lock transacional na reserva. |
| 6 | Mercado Pago split + caução | `03`, `11` | 3 | 5 | 3 | 4 | **3.75** | Reusa padrão AbacatePay (webhook/reconciliação idempotente), `deposits`. Greenfield: OAuth MP, split, webhook em Function. |
| 7 | Contrato + assinatura | `04` | 3 | 4 | 3 | 4 | **3.0** | Reusa storage seguro, webhook idempotente, FAST tier p/ slots. Greenfield: `contracts`, provedor ZapSign/Clicksign, template versionado. |
| 8 | Functions incremental | `08` | 1→4 | 4 | 4 | 3 | **5.3** | Greenfield: pasta `functions/`. Reusa HMAC (`auth.py`/`agent-auth.ts`), `logger` PII-masked. Habilitada já no item 2. |
| 9 | Tiers/custo/observabilidade | `09` | 1→4 | 3 | 5 | 2 | **7.5** | Reusa `config.py` (`MODEL_FAST`/`MODEL_MAIN`). Greenfield: tier `DEEP`, token logging, LangSmith. Chega com o item 2. |
| 10 | BI / Atendimentos | `07` | 1→4 | 3 | 5 | 1 | **15.0** | Já construído: `crm-insights-core.ts`, resource `insights`, painel Receita Perdida. Evolui com dados das tasks. |
| 11 | Onboarding / Settings | `10`, `11` | 1→4 | 3 | 4 | 2 | **6.0** | Reusa `RevolutionaryOnboarding`, `settings/*`. Greenfield: conectar MP (OAuth), escolher modalidade, número do dono. |

> **Leitura do ranking:** itens 1, 3, 10 e 9 têm ICE altíssimo (baixo esforço,
> alta confiança) — são quick wins que ancoram a Fase 1. O item 2 (defer/resume)
> tem ICE moderado por causa do esforço (infra de fila + Function nova), mas é
> **não negociável na Fase 1** por Decisão 4: é o coração do produto. Itens 6 e 7
> têm ICE mais baixo (provedores externos novos, baixa C) — por isso ficam nas
> Fases 3, depois do destravamento e do fechamento estarem sólidos.

---

## 4. As fases em detalhe

### Fase 1 — Estado + Proatividade (o destravamento central)

**Objetivo:** transformar a Sofia de reativa+stateless em proativa+stateful, com
o humano no loop. É a fase que "destrava o resto" (Decisão 4).

**Entrega 1.1 — Máquina de estados (`01`)**
- Novo módulo `lib/conversation/state.ts` (superset que escreve Firestore +
  Redis atomicamente). Função canônica `setConversationState()`.
- Campo novo `conversations/{id}.state` (`ConversationState`:
  `ATIVA | IA_TRABALHANDO | AGUARDANDO_HUMANO | MANUAL | FECHAMENTO | ENCERRADA`)
  + `stateUpdatedAt`, `activeTaskId?`, `closingMode`, `ownerAlertedAt?`.
  `conversationId` canônico = `{tenantId}:{normalizedPhone}`.
- Cache quente Redis `conv_state:{tenantId}:{normalizedPhone}` (TTL). Webhook lê
  Redis → fallback Firestore.
- **Compat travada:** `MANUAL ⇔ ai_blocked:{tenant}:{phone}`; `isAiBlocked===true
  ⇒ MANUAL`. Mapeamento de `ConversationStatus` legado documentado em `01`.
- **Reuso:** `isAiBlocked`/`aiBlockKey`/`normalizeBlockPhone`
  (`lib/utils/ai-block.ts`), dedup (`lib/cache/deduplication-cache.ts`).
- **Wiring no webhook** (`app/api/webhook/whatsapp-microservice/route.ts`):
  antes de `dispatchToAgent`, ler `state`. Se `IA_TRABALHANDO`, persistir a msg
  do cliente mas NÃO despachar `/process` (será lida no `/resume`).

**Entrega 1.2 — Defer/resume (`01`) + 1º código em `functions/` (`08`)**
- **Tool nova `defer_and_work`** (endpoint `defer-task`, registrada em
  `registry.py` e mapeada em `client.py _TOOL_PATHS`). Args: `client_message`,
  `task_type` (`property_research | ask_owner | closing_prep | other`),
  `task_payload`, `resume_hint?`.
- Efeitos: estado → `IA_TRABALHANDO`; envia `client_message` agora (outbound
  existente, extraído para `lib/whatsapp/outbound.ts`); cria
  `deferred_tasks/{taskId}` (`status:queued`) e enfileira; turno termina sem 2ª
  resposta.
- **Fila:** Firebase Function (1º código de `functions/`), **Cloud Tasks**
  (preferencial; Pub/Sub fallback — `08` fixa). Worker recebe
  `{tenantId, conversationId, taskId}`.
- **Endpoint `/resume`** no agente (FastAPI, espelha `/process`, MESMA HMAC).
  Body: `{tenant_id, conversation_id, task_id, task_type, result, resume_hint}`.
  Monta estado+histórico+bloco de sistema com `result`, roda grafo, devolve
  `final_response`/`media_urls`. Depois `IA_TRABALHANDO → ATIVA`
  (ou `FECHAMENTO`/`AGUARDANDO_HUMANO`).
- **Idempotência (travada):** `/resume` idempotente por `taskId` via Redis
  `resume_done:{tenantId}:{taskId}` (SET NX EX). Criação de task idempotente por
  `(conversationId, originMessageId)`.
- **Tier `DEEP` chega aqui** (`09`): `property_research` roda em `DEEP`, **só** em
  background, nunca no caminho síncrono do WhatsApp.

**Entrega 1.3 — Canal IA↔Dono (`06`)**
- IA chama o dono: push + WhatsApp pessoal + deep-link para a conversa. Reusa
  `notify_owner` + estado `AGUARDANDO_HUMANO`.
- Dono pergunta: reusa operator console (`/operate`, persona Analista). Ele
  consulta em vez de checar painéis ("é a fonte de verdade conversacional").
- `task_type:ask_owner` é uma task diferida sem timeout, mas com SLA de re-ping
  (detalhe em `06`). Outbound ao dono idempotente (§4.2 do overview).

**Diagrama de sequência — re-engajamento proativo (Fase 1 completa):**

```
Cliente        Webhook(locai)     Agente(/process)    Function(worker)   Agente(/resume)   Cliente
  │  "tem algo com vista pro mar?"  │                      │                   │
  │──────────────▶ lê state=ATIVA   │                      │                   │
  │               dispatchToAgent ──▶ router→planner       │                   │
  │                                  │ chama defer_and_work │                   │
  │                                  │  (task=property_research)                │
  │               state→IA_TRABALHANDO                      │                   │
  │ ◀── "Show! Espera um segundinho que vou pesquisar 💛"  (client_message)     │
  │                                  │ cria deferred_tasks  │                   │
  │                                  │ enfileira Cloud Tasks│                   │
  │  "ah, e aceita pet?"            │                      │                   │
  │──────────────▶ state=IA_TRABALHANDO → persiste, NÃO despacha               │
  │                                  │            ◀─────────│ worker pega task  │
  │                                  │            roda DEEP (search top imóveis)│
  │                                  │            grava result, status:done     │
  │                                  │            POST /resume ──────────────▶ │
  │                                  │   resume_done SET NX EX (idempotente)   │
  │                                  │   monta histórico+result, roda grafo    │
  │                                  │   lê msg bufferizada ("aceita pet?")    │
  │                                  │   state→ATIVA                           │
  │ ◀────────── "Achei 3 com vista pro mar! E sim, o Apê Maré aceita pet 🐾"  │
```

**Critérios de aceite da Fase 1:**
- Webhook respeita `state` (não despacha em `IA_TRABALHANDO`/`MANUAL`).
- `defer_and_work` cria task, envia frase-ponte, e `/resume` re-engaja o cliente
  sem ele ter falado.
- `/resume` é idempotente (reentrega da fila não duplica mensagem).
- Dono recebe alerta com deep-link e consegue assumir (takeover → `MANUAL`).

---

### Fase 2 — Fechamento

**Objetivo:** introduzir o estado `FECHAMENTO` e as duas modalidades escolhíveis,
com trava de datas. Não há cobrança de dinheiro ainda — isso é Fase 3.

**Entrega 2.1 — Modalidades de fechamento (`02`)**
- Estado `FECHAMENTO` ativado quando cliente sinaliza fechar.
- `conversations.closingMode`: `'ia'` (IA-finalizadora) | `'owner'`
  (Dono-finalizador) | `null` (lido de settings `11`, doc `02` é dono da semântica).
- **IA-finalizadora:** prepara cobrança/caução/contrato (Fase 3 fornece as
  peças), agenda, trava iCal.
- **Dono-finalizador (cidadã de primeira classe):** IA faz processamento
  inicial, transiciona `FECHAMENTO`→`AGUARDANDO_HUMANO` com DESTAQUE visual
  enorme + push + WhatsApp pessoal; o dono fecha; depois o dono diz "pode mandar
  o link e coletar o contrato" e a IA faz só a parte chata (iCal, contrato,
  garantir pagamento).
- Reusa o canal IA↔dono (`06`) e o protocolo defer/resume (`closing_prep` é uma
  `task_type`).

**Entrega 2.2 — iCal lock (`05`)**
- Travar/destravar datas reusando `ical-generator-service.ts` (export) e
  `calendar-sync-service.ts` (import/sync). Greenfield: lock transacional na
  reserva ao entrar em `FECHAMENTO` (evitar double-booking durante a negociação).

**Diagrama de sequência — Dono-finalizador:**

```
Cliente            Agente            Estado/Firestore        Dono (push+WhatsApp)
  │ "quero fechar o Apê Maré!"        │                          │
  │────────────▶ planner detecta fechamento                     │
  │            state→FECHAMENTO, closingMode='owner'             │
  │            defer_and_work(task=ask_owner / closing_prep)     │
  │            notify_owner + state→AGUARDANDO_HUMANO ──────────▶│ "Cliente X quer
  │ ◀── "Perfeito! Já avisei o responsável, ele te chama já 💛" │  fechar AGORA"
  │                                   │              deep-link ─▶│ [abre conversa]
  │ ◀═══════════ Dono assume (takeover, MANUAL) e fecha pessoalmente
  │                                   │                          │ "show, manda o
  │                                   │ ◀────────────────────────│  link e contrato"
  │            state→FECHAMENTO (IA retoma só parte chata)       │
  │ ◀── [Fase 3: link MP caução] + [Fase 3: contrato p/ assinar] + iCal locked
```

**Critérios de aceite da Fase 2:**
- Ambas as modalidades funcionam ponta a ponta (sem dinheiro real ainda — mocks
  de pagamento/contrato aceitáveis).
- Datas travam ao entrar em `FECHAMENTO` e destravam em cancelamento/expiração.
- Handoff dono↔IA é limpo (sem a IA "atropelar" o dono em `MANUAL`).

---

### Fase 3 — Pagamento e Contrato

**Objetivo:** dinheiro real (caução via MP split) e contrato assinado. Ambos
vivem em `functions/` (webhooks/geração pesada — Decisão 2) e são idempotentes.

**Entrega 3.1 — Mercado Pago split + caução (`03`, `11`)**
- **Por que MP (não AbacatePay) aqui:** split nativo permite take-rate (~1%) e
  repasse automático. AbacatePay **coexiste** (PIX/link/webhook/reconciliação já
  existem) e serve de espelho para a reconciliação.
- Conector OAuth MP por tenant (conectado em settings `11`).
- Coleção `deposits/{depositId}` (caução): `amount` (centavos), `currency:'BRL'`,
  `provider:'mercadopago'|'abacatepay'`, `splitTakeRate(~0.01)`,
  `status(pending|paid|refunded|failed|cancelled)`, `webhookEventIds[]`.
- **Webhook idempotente** (em `functions/`, `08`) — defesa em camada: o log de
  eventos do provedor (`mp_webhook_events/{eventId}`, análogo p/ AbacatePay) é a
  guarda primária, MAIS `deposits.webhookEventIds[]` como guarda de "evento já
  aplicado àquela caução". Confirma pagamento da caução, grava `paidAt`, dedup
  via SET NX EX em ambas as camadas. Reconciliação espelha o padrão do
  `abacatepay-reconciliation-service.ts`. (Detalhe igual nos docs `03` e `08`.)
- Quando a caução é confirmada e o estado é `FECHAMENTO`, a IA detecta e
  prossegue (re-engaja via `/resume` se necessário).

**Entrega 3.2 — Contrato + assinatura (`04`)**
- **Decisão 3:** integrar PROVEDOR (ZapSign/Clicksign), não construir
  e-signature. Template **determinístico** versionado; LLM (tier `FAST`) só
  preenche `slots`.
- Coleção `contracts/{contractId}`: `templateId`, `templateVersion`, `slots`,
  `provider('zapsign'|'clicksign')`, `providerDocId`,
  `status(draft|sent|signed|refused|expired)`, `signedPdfUrl?`,
  `webhookEventIds[]`.
- Geração + envio para assinatura ocorrem em `functions/` (job pesado). Webhook
  de assinatura idempotente; PDF assinado em storage seguro.

**Diagrama de sequência — caução + contrato (IA-finalizadora):**

```
Cliente        Agente        Function(MP webhook)    MP        Function(contrato)   Provedor assin.
  │ confirma fechar (FECHAMENTO, closingMode='ia')      │             │
  │ ◀── "Pra garantir a reserva, a caução é R$X. Segue o PIX 💛"     │
  │            cria deposits{status:pending} via OAuth MP (split)     │
  │──── paga ──────────────────────────────────────────▶│            │
  │                            ◀── webhook pago ─────────│            │
  │                  SET NX EX webhookEventIds[] (idemp.)│            │
  │                  deposits.status=paid, paidAt        │            │
  │ ◀── /resume: "Recebido! 🎉 Agora só falta a assinatura"          │
  │            closing_prep → gera contrato (FAST slots)─────────────▶│ cria doc
  │ ◀── "Te enviei o contrato pra assinar: <link>"                   │ envia
  │──── assina ──────────────────────────────────────────────────────▶│
  │                            ◀──── webhook signed (idempotente) ────│
  │            contracts.status=signed, signedPdfUrl em storage seguro│
  │            iCal lock confirmado (05), state→ENCERRADA             │
  │ ◀── "Tudo certo! Sua reserva está confirmada 💛"                 │
```

**Critérios de aceite da Fase 3:**
- OAuth MP conectável em settings; caução cobrada com split aplicado.
- Webhooks de pagamento e de assinatura idempotentes (reentrega não duplica).
- PDF assinado armazenado com segurança; `contracts.status` reflete o ciclo.
- Reconciliação MP espelha a do AbacatePay; ambos os provedores conviventes.

---

### Fase 4 — Transversais contínuos (em paralelo desde o início)

Estes módulos não são "depois" — eles permeiam todas as fases. A Fase 4 apenas
marca onde cada um amadurece.

- **Functions incremental (`08`)** — habilitada já na Fase 1 (worker de tasks +
  `/resume` são o 1º código). Cresce: webhooks de pagamento (Fase 3), geração de
  contrato (Fase 3), jobs/cron. Mesma HMAC e `logger` PII-masked. Cada doc
  declara onde sua lógica vive (rota Next.js vs Function).
- **Tiers/custo/observabilidade (`09`)** — tier `DEEP` chega com as tasks
  proativas (Fase 1). `09` é a única fonte de verdade do `MODEL_DEEP`. Regras
  travadas: router sempre `FAST`; `DEEP` jamais no caminho síncrono do WhatsApp;
  `max_tokens ≤ 1024`; histórico `[-20:]`; logar `total_tokens_in/out`. LangSmith
  para traces.
- **BI / Atendimentos (`07`)** — já construído (`crm-insights-core.ts`, resource
  `insights`, painel Receita Perdida). Evolui com os dados gerados pelas tasks e
  fechamentos. **Honestidade de dados** (princípio 1): sem dado → `null` /
  `costDataAvailable:false`; a IA nunca fabrica número.
- **Onboarding / Settings (`10`/`11`)** — expõe cada feature conforme aterrissa:
  conectar MP (OAuth, Fase 3), escolher modalidade de fechamento (Fase 2),
  número pessoal do dono (Fase 1). Reusa `RevolutionaryOnboarding` e
  `settings/*`. Mínima fricção.

---

## 5. Riscos e mitigação

| # | Risco | Fase | Severidade | Mitigação |
|---|-------|------|-----------|-----------|
| R1 | **Divergência de estado** entre Redis (`conv_state:*`) e Firestore (`conversations.state`), causando webhook despachar quando deveria bufferizar. | 1 | Alta | `setConversationState()` escreve ambos atomicamente; webhook lê Redis com fallback Firestore; Firestore é fonte de verdade durável. Detalhe em `01`. |
| R2 | **Mensagens perdidas em `IA_TRABALHANDO`** — cliente manda algo enquanto a task roda e a msg não é lida no resume. | 1 | Alta | Msgs do cliente são persistidas (não disparam `/process`) e lidas no `/resume` ao montar o histórico (§4.2). Critério de aceite testa isso. |
| R3 | **Task travada / fila não entrega** (`property_research` excede 120s, worker crasha). | 1 | Média | Timeout `property_research`=120s; `attempts` em `deferred_tasks`; `status:failed` dispara fallback (re-engaja pedindo desculpa ou escala ao dono). Cloud Tasks com retry; Pub/Sub fallback. |
| R4 | **Resume duplicado** (reentrega da fila reprocessa a mesma task). | 1 | Média | Idempotência `resume_done:{tenantId}:{taskId}` (SET NX EX); criação de task por `(conversationId, originMessageId)`. |
| R5 | **Custo OpenAI dispara** se `DEEP` vazar para o caminho síncrono ou histórico crescer. | 1→4 | Média | `DEEP` **só** em background (regra travada `09`); router sempre `FAST`; `max_tokens ≤ 1024`; histórico `[-20:]`; logar `total_tokens_in/out`. |
| R6 | **Dono ignora alerta** e o cliente quente esfria (Dono-finalizador). | 2 | Alta | SLA de re-ping em `ask_owner` (`06`); destaque visual enorme + push + WhatsApp pessoal; fallback opcional para IA-finalizadora se o dono não responder no SLA. |
| R7 | **Double-booking** durante a negociação de fechamento. | 2 | Alta | Lock iCal transacional ao entrar em `FECHAMENTO` (`05`); destrava em cancelamento/expiração. |
| R8 | **OAuth MP / split mal configurado** → caução não cai ou take-rate errado. | 3 | Alta | Conector OAuth por tenant validado no onboarding (`10`/`11`); webhook idempotente confirma; reconciliação espelha AbacatePay; ambiente sandbox MP antes de produção. |
| R9 | **Webhook de pagamento/assinatura não idempotente** → caução/contrato duplicados. | 3 | Alta | Defesa em camada: log de eventos do provedor (`mp_webhook_events`/análogo) como guarda primária + `webhookEventIds[]` como guarda por caução/contrato, ambos via SET NX EX (Functions); espelha padrão AbacatePay já testado. |
| R10 | **LLM inventa dados no contrato** (preço, datas) em vez de preencher slots. | 3 | Alta | Template **determinístico** versionado; LLM só preenche `slots` (tier `FAST`); validação dos slots antes de enviar ao provedor; princípio de honestidade. |
| R11 | **Functions greenfield** introduz drift de auth/logging vs Next.js. | 1→4 | Média | Functions usam a MESMA HMAC (`auth.py`/`agent-auth.ts`) e o MESMO `logger` PII-masked; multi-tenant via `tenantId` em todo payload/chave. |
| R12 | **Quebra de compat** com `ConversationStatus`/`isAiBlocked` legados (UI/CRM). | 1 | Média | `state` é campo NOVO de roteamento; `ConversationStatus` permanece para UI/CRM; mapeamento explícito em `01`; `MANUAL ⇔ ai_blocked`. |

---

## 6. Marcos (milestones verificáveis)

| Marco | Fase | Definição de "pronto" (verificável) |
|-------|------|-------------------------------------|
| **M1 — Estado durável** | 1 | `lib/conversation/state.ts` existe; webhook lê `state` (Redis→Firestore) e respeita `IA_TRABALHANDO`/`MANUAL`; `MANUAL ⇔ ai_blocked` validado. |
| **M2 — Primeira task proativa** | 1 | `defer_and_work` cria `deferred_tasks`, envia frase-ponte; worker em `functions/` (Cloud Tasks) executa; `/resume` re-engaja o cliente sem ele falar. Idempotência por `taskId` testada. |
| **M3 — Humano no loop** | 1 | Dono recebe alerta (push + WhatsApp + deep-link) em `AGUARDANDO_HUMANO`; assume via takeover; pergunta à IA via `/operate` (Analista). |
| **M4 — Fechamento nas duas modalidades** | 2 | `FECHAMENTO` + `closingMode` funcionam ponta a ponta (IA e Dono); iCal trava/destrava; handoff dono↔IA limpo. |
| **M5 — Caução real (MP split)** | 3 | OAuth MP conectado em settings; `deposits` com split; webhook idempotente confirma `paid`; reconciliação espelha AbacatePay. |
| **M6 — Contrato assinado** | 3 | `contracts` via provedor (ZapSign/Clicksign); template determinístico + slots `FAST`; webhook de assinatura idempotente; PDF em storage seguro; `state→ENCERRADA`. |
| **M7 — Transversais maduros** | 4 | Tier `DEEP` em produção só em background; token logging + LangSmith ativos; painel Receita Perdida lendo dados reais (honestidade); onboarding expõe MP/modalidade/número do dono com mínima fricção. |

---

## 7. Referências cruzadas (docs do blueprint)

Este roadmap orquestra os seguintes documentos. Detalhes de implementação,
assinaturas e modelos de dados estão neles — este doc não os repete.

- [`00-overview.md`](./00-overview.md) — fundação: visão, 4 decisões, contratos
  transversais (§4), índice, sequência (§6) que este roadmap detalha. O "modelo
  de dados consolidado" (`deferred_tasks`, `deposits`, `contracts`, campos novos
  de `conversations`, índices) vive na §4.3 — os docs de domínio (`01`, `03`,
  `04`) detalham cada coleção.
- [`01-agente-proativo-stateful.md`](./01-agente-proativo-stateful.md) — máquina
  de estados, transições, Firestore+Redis, mapeamento
  `isAiBlocked`/`ConversationStatus`; defer/resume (`defer_and_work`, fila de
  tasks, Function worker, `/resume`, idempotência/timeouts); evolução do grafo e
  tools, prompts.
- [`02-fechamento-modalidades.md`](./02-fechamento-modalidades.md) —
  IA-finalizadora vs Dono-finalizador, estado `FECHAMENTO`, handoff, `closingMode`.
- [`03-pagamentos-caucao-mercadopago.md`](./03-pagamentos-caucao-mercadopago.md) —
  MP OAuth + split, caução, webhook idempotente em camada, coexistência AbacatePay.
- [`04-contratos-assinatura.md`](./04-contratos-assinatura.md) — provedor de
  assinatura, template determinístico, slots, webhook, storage.
- [`05-ical-disponibilidade.md`](./05-ical-disponibilidade.md) — travar/destravar
  datas e disponibilidade reusando export/import/sync iCal.
- [`06-canal-ia-dono.md`](./06-canal-ia-dono.md) — canal IA↔Dono: alertas, dono
  pergunta, SLAs, botões de intervenção, deep-link.
- [`07-atendimentos-bi.md`](./07-atendimentos-bi.md) — `crm-insights-core`,
  resource `insights`, painel Receita Perdida, honestidade.
- [`08-backend-firebase-functions.md`](./08-backend-firebase-functions.md) —
  estrutura `functions/`, fila/worker (Cloud Tasks), webhooks idempotentes,
  auth/logging, deploy.
- [`09-modelos-custo.md`](./09-modelos-custo.md) — tiers, fonte de verdade do
  `MODEL_DEEP`, custo OpenAI/Firebase, observabilidade (LangSmith, token logging).
- [`10-onboarding.md`](./10-onboarding.md) — `RevolutionaryOnboarding`, fluxo de
  ativação, mínima fricção.
- [`11-settings.md`](./11-settings.md) — esquemas de config por tenant: conectar
  MP (OAuth) em settings, modalidade de fechamento (`config/closing`), canal do
  dono (`config/owner-channel`), orçamento de IA (`config/ai-budget`).
- [`12-personas-prompts.md`](./12-personas-prompts.md) — personas e prompts
  (Sofia/Analista), evolução de tools/grafo junto com `01`.

> **Lembrete final:** este roadmap respeita à risca a §4 do `00-overview.md`.
> Nenhum nome canônico foi redefinido. Extensões novas voltam para a fundação.
