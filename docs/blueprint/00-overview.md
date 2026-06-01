# 00 — Visão Geral e Fundação (Contrato Único)

> **Status:** FUNDAÇÃO TRAVADA. Este documento é o contrato único que TODOS os
> demais documentos de `docs/blueprint/` seguem. Nomes de coleções, campos,
> estados, endpoints e convenções definidos aqui são **canônicos**: nenhum outro
> doc pode renomeá-los ou redefini-los. Se um doc precisar de algo novo, ele
> referencia este arquivo e propõe a extensão aqui primeiro.

---

## 1. Visão

A Locai é um sistema de IA imobiliária multi-tenant onde a **Sofia** (agente
LangGraph) atende clientes no WhatsApp. Hoje a Sofia é **reativa e stateless**:
só fala quando o cliente fala (1 mensagem → 1 resposta), reconstruindo o
histórico do Firestore a cada turno. Não há tarefa em background nem capacidade
de re-engajar sozinha.

O salto desta iniciativa é tornar a Sofia **proativa e stateful**: ela poderá
dizer *"Show, espera um segundinho que vou pesquisar pra você"*, **parar** de
responder, rodar uma **task assíncrona** (filtrar o imóvel ideal, ou perguntar
algo ao humano da imobiliária num canal interno) e, ao concluir, **re-engajar**
e enviar a mensagem ao cliente mesmo sem ele ter mandado nada.

Sobre essa base, montamos o **fechamento em duas modalidades** (IA-finalizadora
e Dono-finalizador), **pagamentos com split** via Mercado Pago, **contrato com
assinatura** via provedor externo, e um **canal direto IA↔Dono** onde a IA é a
fonte de verdade conversacional do negócio (o dono pergunta em vez de checar
painéis). A aba **Atendimentos** já existente é a camada de conhecimento (BI
honesto do funil).

---

## 2. Princípios (inegociáveis)

1. **Honestidade de dados.** Nunca fabricar número. Métricas sem dado viram
   `null` / `costDataAvailable: false`. Já estabelecido em
   `lib/analytics/crm-insights-core.ts` e na persona Analista
   (`agent/app/graph/prompts.py`). Vale para todo doc: a IA nunca inventa
   imóvel, preço, status de pagamento ou número de funil.
2. **Copiloto > autônomo.** A IA tira o trabalho chato e repetitivo do humano,
   mas o humano fecha negócio melhor na etapa final. O default de fechamento é
   configurável; a modalidade Dono-finalizador é cidadã de primeira classe, não
   um fallback.
3. **Custo sob controle.** Escolha profissional de modelo por fluxo (tiers,
   §4.6). Firebase e API OpenAI/Anthropic monitorados. Lógica pesada/assíncrona
   migra para Firebase Functions (Decisão 2) em vez de inflar o frontend.
4. **Humano-no-loop.** Sempre existe um ponto onde o humano é avisado com
   destaque (push + WhatsApp pessoal + deep-link) e pode assumir. Bloqueio
   manual já existe (`isAiBlocked`) e vira a base da máquina de estados.
5. **Reuso do que já existe.** Não reconstruir. Reusamos: `isAiBlocked`/Redis
   (estado), canal de saída do microserviço WhatsApp (`/api/v1/messages/{tenantId}/send`),
   dedup (`deduplication-cache.ts`), HMAC agente↔locai, iCal (travar datas),
   AbacatePay (coexistência), `read_system`/insights (BI), grafo LangGraph
   (router→planner⇄executor) e `TenantServiceFactory`.

---

## 3. As 4 Decisões do Fundador (travadas)

### Decisão 1 — Pagamentos: Mercado Pago com SPLIT PAYMENT
O dono conecta a conta Mercado Pago via **OAuth** em settings. O **split nativo**
permite take-rate da plataforma (~1%) e repasse automático ao dono — por isso o
MP foi escolhido em vez de manter só o AbacatePay. **AbacatePay continua
integrado** (PIX/link/webhook/reconciliação) e coexiste; o doc de pagamentos
(`03`) explica a coexistência e a migração. Confirmação da **caução** vem por
**webhook idempotente** do MP.
**Implicações:** novo conector OAuth MP em settings; webhook MP idempotente; o
split exige saber a conta do dono (token MP por tenant) e o take-rate da
plataforma; reconciliação espelha o padrão AbacatePay já existente.

### Decisão 2 — Backend: migração para Firebase Functions INCREMENTAL
Não é big-bang. O **novo/pesado/assíncrono vai primeiro**: tasks proativas,
webhooks de pagamento, geração de contrato, jobs/cron. O resto (rotas Next.js
em `app/api/*`) migra aos poucos. Hoje **não existe** pasta `functions/`.
**Implicações:** criar `functions/` greenfield; o primeiro código lá é o
**worker de tasks diferidas** e o **endpoint `/resume`** (§4.2); cada doc indica
explicitamente se sua lógica nasce em Function ou em rota Next.js; multi-tenant e
HMAC preservados em ambos.

### Decisão 3 — Contrato: integrar PROVEDOR de assinatura (ZapSign ou Clicksign)
Não construir e-signature do zero. **Geração por template determinístico**: o
LLM só preenche slots (nome, datas, valor, imóvel) — nunca redige cláusula
livre. O provedor cuida de assinatura, trilha de auditoria e armazenamento legal.
**Implicações:** entidade `contracts` greenfield; template versionado por tenant;
webhook de status de assinatura idempotente; armazenamento seguro do PDF
assinado; o doc de contrato (`04`) escolhe o provedor e mapeia os slots.

### Decisão 4 — Prioridade: começar pelo AGENTE PROATIVO + STATEFUL
É o gap central que destrava tudo (fechamento, contrato, canal dono dependem de
a IA conseguir esperar, rodar task e re-engajar). O roadmap (§6) e a profundidade
dos docs refletem isso: `01`/`02`/`03` (estado, proativo, canal dono) são os
mais detalhados e vêm primeiro.

---

## 4. Contratos Transversais (CANÔNICOS)

> Estes são os nomes fixos. Todo doc referencia esta seção. Não renomear.

### 4.1 Máquina de Estados de Conversa

Toda conversa de um tenant tem **um** estado canônico. O estado é a **fonte de
verdade do roteamento** (responder? esperar? avisar humano?). Reusa o
`isAiBlocked` atual como o estado `MANUAL` materializado em Redis.

**Estados (`ConversationState`):**

| Estado | Significado | IA responde cliente? |
|---|---|---|
| `ATIVA` | Fluxo normal reativo: cliente fala, Sofia responde. | Sim |
| `IA_TRABALHANDO` | Sofia disse "vou pesquisar", há uma task diferida em andamento. Mensagens novas do cliente são bufferizadas, não geram resposta imediata. | Não (até resume) |
| `AGUARDANDO_HUMANO` | Escalado: a IA pediu input/decisão ao dono (canal IA↔Dono) ou sinalizou fechamento (Dono-finalizador). | Não (aguarda dono) |
| `MANUAL` | Operador assumiu (takeover). É o `ai_blocked` atual. | Não |
| `FECHAMENTO` | Cliente quer fechar; rodando coleta de pagamento/caução/contrato (IA-finalizadora) ou já liberado pelo dono. | Sim (só fluxo de fechamento) |
| `ENCERRADA` | Concluída (ganho, perdido ou abandonado). | Não |

**Onde o estado mora (dual, com fonte de verdade clara):**
- **Fonte de verdade durável:** Firestore, campo `state` no documento de
  `conversations/{conversationId}` (ver §4.3). Sobrevive a restart.
- **Cache de roteamento quente:** Redis, chave
  **`conv_state:{tenantId}:{normalizedPhone}`** → string do estado, TTL renovado.
  O webhook lê primeiro o Redis (latência), com fallback ao Firestore.
- **Compatibilidade:** `MANUAL` ⇔ a chave existente `ai_blocked:{tenant}:{phone}`.
  `isAiBlocked === true` ⇒ estado `MANUAL`. A transição para/de `MANUAL`
  continua usando `lib/utils/ai-block.ts`; o novo módulo de estado
  (`lib/conversation/state.ts`) é uma superset que escreve ambos coerentemente.
- **Normalização de telefone:** SEMPRE via `normalizeBlockPhone()` (já existe).
  Toda chave Redis e todo `conversation_id` derivam do telefone normalizado.

**Transições permitidas (resumo):**
`ATIVA → IA_TRABALHANDO` (Sofia abre task), `IA_TRABALHANDO → ATIVA` (resume ok),
`IA_TRABALHANDO → AGUARDANDO_HUMANO` (task precisa de humano), `ATIVA →
AGUARDANDO_HUMANO` (escala/sinaliza fechamento), `* → MANUAL` (takeover do dono OU kill-switch de orçamento de IA, ver doc `09`),
`MANUAL → ATIVA` (libera), `ATIVA/AGUARDANDO_HUMANO → FECHAMENTO`,
`MANUAL → FECHAMENTO` (dono reativa o fechamento via `resume_closing`), `* →
ENCERRADA`. Toda transição passa por `setConversationState()` (escreve Firestore
+ Redis atômico) — nenhum código escreve o estado direto.

**Convivência com `ConversationStatus` existente** (`lib/types/conversation.ts`:
`active|waiting_client|waiting_approval|escalated|completed|abandoned`): o
`status` legado **permanece** para a UI/CRM; `state` é o novo campo de
roteamento. O doc `01` define o mapeamento `state ↔ status` para manter a UI
coerente sem duplicar lógica.

### 4.2 Protocolo defer/resume do Agente Proativo

O coração da Decisão 4. Permite a Sofia "esperar e voltar".

**Passo 1 — Sofia sinaliza "vou pesquisar" (nova tool):**
Nova tool no `registry.py`: **`defer_and_work`** (kebab no endpoint:
`defer-task`). A Sofia a chama quando precisa de tempo (pesquisa profunda de
imóvel, consultar o dono, etc.). Argumentos canônicos:
- `client_message` (string, obrigatório): a frase curta e humana que vai AGORA ao
  cliente (ex.: *"Show, deixa eu achar a melhor opção pra você, já te falo"*).
- `task_type` (enum): `property_research` | `ask_owner` | `closing_prep` |
  `other`.
- `task_payload` (object): contexto estruturado para a task (critérios, dúvida ao
  dono, etc.).
- `resume_hint` (string, opcional): o que a Sofia pretende dizer ao voltar.

Efeitos de `defer_and_work` (no lado locai/Function que implementa a tool):
1. Transiciona a conversa para **`IA_TRABALHANDO`**.
2. Envia `client_message` ao cliente AGORA (via microserviço, mesmo canal de
   `dispatchToAgent`) e persiste como mensagem da Sofia.
3. Cria a **task diferida** (§4.3, coleção `deferred_tasks`) com `status:
   "queued"` e a enfileira.
4. Retorna ao grafo um resultado curto; o turno do agente **termina sem segunda
   resposta** (o `client_message` já foi a resposta).

**Passo 2 — A task assíncrona é enfileirada:**
- Onde roda: **Firebase Function** (Decisão 2 — é o primeiro código de
  `functions/`). Fila: **Cloud Tasks** (preferencial, com retry/backoff nativo e
  agendamento) — ou Pub/Sub se Cloud Tasks não estiver disponível; o doc `01`
  (defer/resume) e o `08` (Functions/fila) fixam a escolha. O worker recebe `{tenantId, conversationId, taskId}`.
- O worker executa o trabalho conforme `task_type` (ex.: busca refinada
  chamando as tools de read; ou aguarda resposta do dono no canal IA↔Dono).
- **Timeout da task:** padrão **120s** para `property_research`; tasks que
  dependem do humano (`ask_owner`) não têm timeout de execução mas têm
  **SLA de lembrete** (re-ping ao dono) definido no doc `06`.
- Ao concluir, o worker grava o **resultado** na task (`result`, `status:
  "done"`) e chama o endpoint **`/resume`**.

**Passo 3 — Endpoint `/resume` re-invoca o agente e dispara o outbound:**
- Novo endpoint no **agente** (FastAPI): **`POST /resume`** (espelha `/process`,
  mesma auth HMAC `ts.body`). Body canônico:
  `{ tenant_id, conversation_id, task_id, task_type, result, resume_hint }`.
- O `/resume` monta o estado do grafo com o histórico + um **bloco de sistema**
  contendo o `result` da task, roda o grafo (planner⇄executor) para a Sofia
  redigir a mensagem de re-engajamento, e retorna `final_response`+`media_urls`.
- Quem dispara o outbound: o **mesmo orquestrador** que já envia em
  `dispatchToAgent` (POST `{microserviceUrl}/api/v1/messages/{tenantId}/send`).
  Reusar a função de envio (extraí-la para `lib/whatsapp/outbound.ts` se preciso).
- Após enviar, transiciona a conversa de `IA_TRABALHANDO → ATIVA` (ou para
  `FECHAMENTO`/`AGUARDANDO_HUMANO` conforme o resultado).

**Idempotência (obrigatória em todo o protocolo):**
- Cada task tem `taskId` único. O `/resume` é **idempotente por `taskId`**:
  chave Redis **`resume_done:{tenantId}:{taskId}`** (SET NX EX) — o mesmo padrão
  do `deduplication-cache.ts`. Um `/resume` repetido (retry da fila) NÃO envia
  segunda mensagem.
- A criação de task também é idempotente por `(conversationId, message_id)` da
  chamada `defer_and_work` que a originou.

**Mensagens do cliente durante `IA_TRABALHANDO`:**
- São persistidas normalmente (histórico), mas **não** disparam novo
  `/process`. Ficam num buffer lógico (lido do Firestore no `/resume`), para a
  Sofia considerá-las ao voltar. O webhook checa o estado ANTES de despachar
  (igual já faz com `isAiBlocked`).

### 4.3 Modelo de Dados Novo (coleções e campos canônicos)

Tudo sob `tenants/{tenantId}/...` (multi-tenant, `TenantServiceFactory`). Datas
em ISO/Timestamp Firestore. Nomes de campo em **camelCase**.

**(a) `deferred_tasks/{taskId}`** — tasks diferidas do agente proativo:
```
taskId            string   (= doc id)
conversationId    string   ref a conversations
clientPhone       string   normalizado (normalizeBlockPhone)
taskType          'property_research' | 'ask_owner' | 'closing_prep' | 'other'
status            'queued' | 'running' | 'done' | 'failed' | 'cancelled'
payload           object   contexto da task (critérios, dúvida, etc.)
clientMessage     string   o "espera um segundinho" enviado ao abrir a task
resumeHint        string?  o que a Sofia pretende dizer ao voltar
result            object?  saída do worker (imóveis achados, resposta do dono…)
error             string?
attempts          number   contador de retries
createdAt, startedAt, finishedAt, resumedAt   timestamps
originMessageId   string   message_id que originou (idempotência de criação)
```

**(b) `conversations/{conversationId}`** — campos NOVOS adicionados ao doc
existente (não recriar a coleção):
```
state             ConversationState (§4.1)  // novo campo de roteamento
stateUpdatedAt    timestamp
activeTaskId      string?   // task diferida em andamento, se houver
closingMode       'ia' | 'owner' | null     // modalidade efetiva no fechamento
ownerAlertedAt    timestamp?                // último alerta ao dono (canal IA↔Dono)
```
> `conversationId` canônico continua `{tenantId}:{normalizedPhone}` (como já
> usado em `dispatchToAgent`). Documentos de conversa podem ter id próprio do
> Firestore; o doc `01` define o índice telefone→docId (já há `getWhere
> 'clientPhone'`).

**(c) `deposits/{depositId}`** — caução (Decisão 1):
```
depositId         string
reservationId     string?   // ou closing/contractId
conversationId    string
clientPhone       string
amount            number    (em centavos)
currency          'BRL'
provider          'mercadopago' | 'abacatepay'
providerRef       string    // payment/preference id do provedor
splitTakeRate     number    // ~0.01 (fração da plataforma)
status            'pending' | 'paid' | 'refunded' | 'failed' | 'cancelled'
paidAt            timestamp?
webhookEventIds   string[]  // ids já processados (idempotência do webhook)
createdAt, updatedAt
```

**(d) `contracts/{contractId}`** — contrato + assinatura (Decisão 3):
```
contractId        string
reservationId     string?
conversationId    string
clientPhone       string
templateId        string    // template versionado do tenant
templateVersion   string
slots             object    // valores que o LLM preencheu (nome, datas, valor…)
provider          'zapsign' | 'clicksign'
providerDocId     string    // id do documento no provedor
status            'draft' | 'sent' | 'signed' | 'refused' | 'expired'
signedPdfUrl      string?   // storage seguro do PDF assinado
signedAt          timestamp?
webhookEventIds   string[]  // idempotência do webhook do provedor
createdAt, updatedAt
```

> Os docs específicos (`05`,`07`,`08`) podem ADICIONAR campos, mas não renomear
> os acima. Coleções legadas (`reservations`, `leads`, `transactions`, wallet,
> AbacatePay types) permanecem; novas entidades referenciam-nas por id.

### 4.4 Canal IA↔Dono (resumo; detalhe no doc `06`)

A IA chama o dono com destaque (push + WhatsApp pessoal + deep-link à conversa),
e responde perguntas do dono ("como tá a conversa do João?") — fonte de verdade
conversacional. Reusa: o **operator console** (`/operate`, persona Analista) para
o "dono pergunta"; o `notify_owner` (já existe) e o estado `AGUARDANDO_HUMANO`
para o "IA chama o dono". Mensagens ao dono são **outbound idempotentes**
(mesma regra de §4.2). O número pessoal do dono e preferências de alerta moram em
settings (doc `11`).

### 4.5 Tiers de Modelo de IA por Fluxo

Reusa a infra de 3 tiers já em `agent/app/config.py` (`MODEL_FAST`,
`MODEL_MAIN`) e o `llm_provider`. Convenção canônica de tier:

| Tier | Uso | Default | Princípio |
|---|---|---|---|
| `FAST` | router de intenção, classificações curtas, slots de contrato | `gpt-4o-mini` | barato, ~15 tokens out, alta frequência |
| `MAIN` | planner conversacional da Sofia (cliente) e re-engajamento | `gpt-4o-mini` | qualidade conversacional, custo médio |
| `DEEP` (novo) | tasks proativas pesadas (`property_research`), análise do funil sob pedido | configurável (ex.: modelo maior/Anthropic) | usado **só** em background/baixa frequência, onde latência não importa |

**Princípios de custo:** (1) nunca usar tier acima do necessário; o router
sempre `FAST`. (2) `DEEP` só em task assíncrona, nunca no caminho síncrono do
WhatsApp. (3) `max_tokens` limitado (já 1024). (4) histórico truncado
(`history[-20:]` já existe). (5) todo run loga `total_tokens_in/out` (já existe)
para o painel de custo. O doc `09` (modelos/custo) é a fonte de verdade do tier `DEEP` (define `MODEL_DEEP`); os demais docs apenas consomem.

### 4.6 Convenções (canônicas)

- **Nomenclatura:** coleções e campos em camelCase; tools LLM em `snake_case`,
  endpoints em `kebab-case`, com mapeamento explícito em
  `agent/app/tools/client.py` (`_TOOL_PATHS`).
- **Auth HMAC:** toda comunicação serviço↔serviço (agente↔locai, Function↔locai,
  worker→`/resume`) assina **`HMAC-SHA256("{timestamp}.{body}")`**, janela de
  **60s**, header `X-Agent-Signature` + `X-Agent-Timestamp`. `Bearer
  AGENT_SHARED_SECRET` aceito como path simples de dev. Idêntico a
  `lib/middleware/agent-auth.ts` e `agent/app/auth.py` — não divergir.
- **Multi-tenant:** SEMPRE `TenantServiceFactory(tenantId)`; nada cross-tenant;
  `tenantId` em todo payload e toda chave Redis.
- **Idempotência:** SET NX EX no Redis, padrão `deduplication-cache.ts`. Chaves
  canônicas: `resume_done:{tenant}:{taskId}`, webhooks por `webhookEventIds[]`
  no doc da entidade, dedup de inbound já existente.
- **Firebase Functions incremental:** novo/pesado/assíncrono nasce em
  `functions/`; cada doc declara onde sua lógica vive. Functions usam a mesma
  auth HMAC e o mesmo padrão de logging (`logger`, PII mascarado).
- **Honestidade:** qualquer agregação sem dado → `null` + flag explícita; nunca
  estimar.

---

## 5. Índice dos Documentos

> **A numeração canônica é a tabela abaixo (= nomes de arquivo reais).** Toda
> referência cruzada por número em qualquer doc deve seguir esta tabela.

| # | Arquivo | Conteúdo (1 linha) |
|---|---|---|
| 00 | [`00-overview.md`](./00-overview.md) | Esta fundação: visão, princípios, 4 decisões, contratos transversais, índice, roadmap. |
| 01 | [`01-agente-proativo-stateful.md`](./01-agente-proativo-stateful.md) | **(Mais profundo — prioridade 1.)** Máquina de estados de conversa + protocolo defer/resume + evolução do grafo: estados/transições (Firestore+Redis, mapeamento `isAiBlocked`/`ConversationStatus`), tool `defer_and_work`, endpoint `/resume`, idempotência/timeouts. |
| 02 | [`02-fechamento-modalidades.md`](./02-fechamento-modalidades.md) | Fechamento IA-finalizadora vs Dono-finalizador: fluxos, estado `FECHAMENTO`, handoff, toggle `closingMode`. |
| 03 | [`03-pagamentos-caucao-mercadopago.md`](./03-pagamentos-caucao-mercadopago.md) | Mercado Pago OAuth + split, caução (máquina de estados), webhook idempotente, coexistência/migração com AbacatePay, teto legal. |
| 04 | [`04-contratos-assinatura.md`](./04-contratos-assinatura.md) | Contrato: provedor (ZapSign/Clicksign), template determinístico, slots do LLM, webhook de assinatura, storage seguro. |
| 05 | [`05-ical-disponibilidade.md`](./05-ical-disponibilidade.md) | iCal no fechamento: travar/destravar datas reusando export/import e sync existentes. |
| 06 | [`06-canal-ia-dono.md`](./06-canal-ia-dono.md) | Canal direto IA↔Dono: alertas (push+WhatsApp pessoal+deep-link), dono pergunta (operator console), SLAs e botões de intervenção. |
| 07 | [`07-atendimentos-bi.md`](./07-atendimentos-bi.md) | BI/Atendimentos: `crm-insights-core`, mineração de padrões de conversa, resource `insights`, painel Receita Perdida, honestidade de dados. |
| 08 | [`08-backend-firebase-functions.md`](./08-backend-firebase-functions.md) | Migração incremental para Functions: estrutura `functions/`, worker de tasks (1º código), webhooks, jobs, auth/logging, deploy. |
| 09 | [`09-modelos-custo.md`](./09-modelos-custo.md) | Tiers de modelo (FAST/MAIN/DEEP — **fonte de verdade do `DEEP`**), controle de custo OpenAI/Firebase, observabilidade (LangSmith, token logging). |
| 10 | [`10-onboarding.md`](./10-onboarding.md) | Onboarding progressivo (essencial → avançado) e defaults inteligentes; jornada de ativação. |
| 11 | [`11-settings.md`](./11-settings.md) | **Hub de settings (dono dos esquemas de config):** modalidade de fechamento, conectar MP (OAuth), caução/contrato, SLA, canal do dono, persona. |
| 12 | [`12-personas-prompts.md`](./12-personas-prompts.md) | Personas/prompts: Sofia carismática (cliente) + Analista consultiva (dono); defer e fechamento condicional ao `closingMode`; guard-rails. |
| 13 | [`13-roadmap.md`](./13-roadmap.md) | Roadmap faseado (ICE) começando pelo agente proativo; dependências, riscos e marcos. |

> **Onde mora o "modelo de dados consolidado" e a "evolução do grafo":** o modelo
> de dados canônico está nesta fundação (§4.3) e é detalhado nos docs de cada
> domínio (`01` conversas/tasks, `03` `deposits`, `04` `contracts`); a evolução do
> grafo LangGraph e das tools está em `01` (nós/proatividade) e `12` (prompts/tools).
> Não há arquivos `05-data-model`/`06-agent-tools` separados.

---

## 6. Sequência de Implementação

Reflete a Decisão 4 (proativo+stateful primeiro). Cada fase entrega valor
isolado e desbloqueia a próxima.

### Recorte do MVP (decisão de produto)

O **MVP** é uma IA que faz **todo o atendimento inicial muito bem** e **passa pro
humano fechar** — de forma inteligente e fácil de ver, com tudo mastigado/resumido
pra ele checar em ~30s, e o humano coleta o pagamento. Ou seja:

- **DENTRO do MVP:** agente proativo + stateful (`01`), modalidade **Dono-finalizador**
  do fechamento (`02`), **canal IA↔Dono** com alerta/handoff (`06`), BI/Atendimentos
  (`07`), Functions+custo (`08`/`09`), onboarding/settings do necessário (`10`/`11`),
  personas (`12`). Fluxo: **IA atende → handoff "chama AGORA" pro humano → humano fecha + coleta pagamento.**
- **PÓS-MVP (só depois que o produto converter):** o **finalizador automático** —
  modalidade **IA-finalizadora** do fechamento + **pagamento/caução** (`03`),
  **contrato/assinatura** (`04`), **iCal lock** (`05`) e **marcação de retirada de
  chaves**. Fluxo extra: **humano fecha → IA coleta pagamento → gera contrato → marca retirada de chaves.**

Os docs `03`/`04`/`05` (e a parte IA-finalizadora do `02`) trazem um aviso de
**Pós-MVP** no topo. Eles permanecem como blueprint pronto para quando ativarmos.

**Fase 1 (MVP) — Estado + Proatividade (o destravamento central):**
1. **Máquina de estados + defer/resume** (`01`): campo `state` em `conversations`
   + `lib/conversation/state.ts` (Firestore+Redis), coerente com `isAiBlocked`;
   o webhook passa a checar `state` antes de despachar; tool `defer_and_work`,
   coleção `deferred_tasks`, primeiro código em `functions/` (worker + fila),
   endpoint `/resume`, idempotência por `taskId`. Reusa o outbound existente.
2. **Canal IA↔Dono** (`06`): alertas com deep-link + dono pergunta via operator
   console; estado `AGUARDANDO_HUMANO`.
3. **Prompts da proatividade** (`12`): Sofia ganha o "espera um segundinho" e o
   re-engajamento no `/resume`.

**Fase 2 (MVP) — Handoff pro humano (Dono-finalizador):**
4. **Modalidade Dono-finalizador** (`02`): a IA atende, escala via `notify_owner`
   v2 e entrega ao humano (estado `AGUARDANDO_HUMANO`). A modalidade IA-finalizadora
   fica para o pós-MVP.
5. **Canal IA↔Dono** (`06`): alerta "chama AGORA" (WhatsApp + dashboard + deep-link),
   re-ping, e `escalation.active` no lead → topo de "Precisam de você". É o que faz o
   humano ver o handoff e fechar rápido.

**Fase 3 (PÓS-MVP) — Finalizador automático:**
6. **Mercado Pago split + caução** (`03`), webhook idempotente (Function).
7. **Contrato + assinatura** (`04`), template determinístico (Function).
8. **iCal lock** (`05`) + **marcação de retirada de chaves** no fechamento.

**Transversais contínuos (desde a Fase 1):**
9. **Functions incremental** (`08`) — habilitada já na Fase 1.
10. **Tiers/custo/observabilidade** (`09`) — `DEEP` chega com as tasks proativas.
11. **BI/Atendimentos** (`07`) — evolui continuamente; já existe a base.
12. **Onboarding/Settings** (`10`/`11`) — expostos conforme cada feature aterrissa
    (número do dono no MVP; conectar MP/modalidade IA-finalizadora no pós-MVP).

Roadmap detalhado (ICE, dependências, riscos, marcos) em `13`.

---

> **Lembrete final aos redatores:** confirmem os fatos no repo antes de escrever,
> reusem o que já existe (§2.5), e nunca redefinam um nome canônico desta §4.
> Extensões novas voltam para cá.
