# Modalidades de fechamento (IA-finalizadora vs Dono-finalizador)

> Documento de implementação. Faz parte do blueprint do Locai. Lê e respeita a
> FUNDAÇÃO em [`00-overview.md`](./00-overview.md) — máquina de estados de
> conversa (§4.1), defer/resume (§4.2), modelo de dados novo (§4.3), canal
> IA↔Dono (§4.4), tiers de modelo (§4.5) e convenções (§4.6). **Nenhum nome de
> coleção, campo, estado ou tool é renomeado aqui.**

---

## 1. Objetivo e princípio

O fechamento é a etapa em que um cliente já demonstrou intenção de reservar e a
conversa precisa coletar **pagamento + caução**, **travar as datas no iCal** e
**emitir/coletar a assinatura do contrato**. O Locai suporta **duas modalidades**,
escolhidas por tenant em settings:

- **(a) IA-finalizadora** — a Sofia conduz o fechamento de ponta a ponta: cobra,
  detecta o pagamento da caução por webhook, trava as datas e dispara o contrato.
- **(b) Dono-finalizador** — a Sofia faz só o **preparo** (consolida o resumo do
  negócio) e **escala para o dono com destaque máximo** (push + WhatsApp pessoal
  + deep-link). O humano fecha o emocional/comercial; quando ele liberar com um
  "show, pode mandar o link", a Sofia volta a agir e faz **apenas a parte chata**
  (link de pagamento, iCal, contrato, garantir que pagou).

Os dois fluxos rodam **sobre o mesmo estado `FECHAMENTO`** e as mesmas entidades
(`deposits`, `contracts`, iCal). A diferença é **quem dispara** cada passo e
**quando a IA está ativa**. Coerente com o Princípio 2 da FUNDAÇÃO
("Copiloto > autônomo"): **Dono-finalizador é cidadão de primeira classe, não
fallback** — é, inclusive, o default recomendado para a etapa de maior conversão.

Este doc é a **Fase 2** da sequência de implementação da FUNDAÇÃO. Depende de:
- **Fase 1** máquina de estados ([`01`](./01-agente-proativo-stateful.md)) + `lib/conversation/state.ts`;
- **Fase 1** defer/resume ([`01`](./01-agente-proativo-stateful.md)) — `defer_and_work` / `deferred_tasks` / `/resume`;
- **Fase 1** canal IA↔Dono ([`06`](./06-canal-ia-dono.md)) — `notify_owner` + estado `AGUARDANDO_HUMANO`.

E habilita / é seguido por:
- **Fase 2** iCal lock ([`05`](./05-ical-disponibilidade.md));
- **Fase 3** Mercado Pago split + caução ([`03`](./03-pagamentos-caucao-mercadopago.md));
- **Fase 3** contrato + assinatura ([`04`](./04-contratos-assinatura.md)).

Onde a lógica vive (Decisão 2 — Functions incremental): a **orquestração de
fechamento síncrona** (transições, leitura de modalidade, montagem do resumo)
vive nas rotas Next.js (`app/api/...`) e no agente. O **pesado/assíncrono**
(criar link de pagamento via MP, gerar contrato no provedor, processar webhooks
idempotentes) vive em **Firebase Functions** (`functions/`, conforme [`08`](./08-backend-firebase-functions.md), com pagamento em [`03`](./03-pagamentos-caucao-mercadopago.md) e contrato em [`04`](./04-contratos-assinatura.md)),
reusando a mesma HMAC e logging.

---

## 2. O toggle de modalidade (`config/closing`)

### 2.1 Onde fica

Documento de configuração por tenant, em `tenants/{tenantId}/config/closing`,
campo **`mode: 'ia' | 'owner'`** (default `'owner'`). O esquema de config por
tenant é dono do doc [`11`](./11-settings.md) (settings); aqui fixamos só o
contrato do campo. A UI/edição vive em settings (`app/dashboard/settings/*` e a
API `app/api/tenant/settings/*`); o onboarding é detalhado no doc
[`10`](./10-onboarding.md).

```jsonc
// tenants/{tenantId}/config/closing
{
  "mode": "owner"        // 'ia' | 'owner'   (default: 'owner')
}
```

O WhatsApp pessoal do dono **não** mora aqui: fica no doc `config/owner-channel`
(campo `ownerWhatsappPhone`), do canal IA↔Dono — ver [`06`](./06-canal-ia-dono.md)
e o esquema em [`11`](./11-settings.md).

- **`mode: 'ia'`** → modalidade IA-finalizadora (§4).
- **`mode: 'owner'`** → modalidade Dono-finalizador (§5). **Default**.
- **Pré-condição de `'ia'`**: exige Mercado Pago conectado por OAuth (Decisão 1) e
  provedor de assinatura configurado (Decisão 3). Se faltar qualquer um, a UI de
  settings **não deixa selecionar `'ia'`** (e, em runtime, o fechamento degrada
  com segurança para `'owner'` — ver §7 riscos). Honestidade de dados: nunca
  prometer cobrança automática sem conector ativo.

### 2.2 Distinção importante: `config/closing.mode` vs `conversations.closingMode`

A FUNDAÇÃO §4.3 já define um campo **`closingMode('ia'|'owner'|null)` em
`conversations/{id}`**. São a política do tenant e o snapshot por conversa, com
finalidades distintas:

| Onde | Significado | Quando muda |
|---|---|---|
| `config/closing.mode` | **Política do tenant** — qual modalidade usar por padrão. | Quando o dono troca em settings. |
| `conversations/{id}.closingMode` | **Snapshot da modalidade aplicada àquela conversa** quando ela entrou em `FECHAMENTO`. `null` enquanto não houver fechamento. | No momento da transição → `FECHAMENTO`. |

Travar o snapshot na conversa evita o bug de uma conversa "mudar de regra no
meio" caso o dono altere o toggle global durante um fechamento em curso. **A
conversa segue a modalidade que tinha quando entrou em `FECHAMENTO`.**

---

## 3. Quando a Sofia decide escalar para o fechamento

### 3.1 Sinal de intenção (reusa o que já existe)

O classificador de intenção (`ROUTER_SYSTEM` em `agent/app/graph/prompts.py`) já
emite **`close_deal`** quando o cliente "quer reservar, fechar, visitar o imóvel,
ou pediu para falar com uma pessoa/atendente". Esse é o gatilho primário.

Hoje, no fluxo reativo, a Sofia trata `close_deal` chamando `notify_owner` (ou
`get_airbnb_link`). Com a máquina de estados ([`01`](./01-agente-proativo-stateful.md)) e este doc, `close_deal`
passa a poder **acionar a transição para `FECHAMENTO`**.

### 3.2 Critérios objetivos para ENTRAR em `FECHAMENTO`

A Sofia só escala para fechamento quando há **intenção real de fechar** e
**contexto mínimo** — não basta curiosidade. Critérios (avaliados pelo planner
Sofia, tier `MAIN`, e fixados no prompt — ver §6):

**Condição de intenção (pelo menos um):**
1. Cliente diz explicitamente que quer reservar/fechar/pagar ("quero fechar",
   "como faço pra reservar", "manda o pix", "fecha pra mim").
2. Cliente confirma um imóvel específico **e** pede o próximo passo ("esse aí,
   o que precisa pra garantir?").
3. Cliente pede explicitamente falar com um humano para fechar.

**Contexto mínimo (todos):**
4. Há um **imóvel de interesse identificado** (`propertyId` conhecido na conversa).
5. Há **datas** (check-in/check-out) — vindas da conversa ou de uma reserva já
   esboçada. Se faltarem, a Sofia coleta antes (fluxo normal `ATIVA`), não escala.
6. O cliente foi **identificado** minimamente (nome via `create_client`; telefone
   já existe pelo canal).

**Não escalar (mantém `ATIVA`):**
- Perguntas de preço/disponibilidade sem intenção de fechar → continua mostrando
  opções.
- "Vou pensar" / "depois eu vejo" → não força fechamento; a Sofia deixa a porta
  aberta e (se aplicável) o re-engajamento proativo ([`01`](./01-agente-proativo-stateful.md)) cuida do follow-up.
- Cancelamento/modificação de reserva → `notify_owner`/`AGUARDANDO_HUMANO`, **não**
  é fechamento.

### 3.3 Honestidade no gatilho

A Sofia **nunca** afirma que "já reservou" ou "já travou a data" antes de o
sistema confirmar. Antes da caução paga (webhook), as datas **não** estão
garantidas e ela comunica isso com leveza ("vou te segurar isso, mas a reserva
confirma quando o pagamento entra"). Princípio 1 (honestidade de dados).

---

## 4. Modalidade (a) IA-finalizadora — passo a passo

### 4.1 Visão

`closingMode === 'ia'`. A Sofia conduz: confirma o negócio, gera o link de
pagamento (Mercado Pago split — Decisão 1), **espera o webhook idempotente** da
caução, ao confirmar **trava as datas no iCal** ([`05`](./05-ical-disponibilidade.md)) e **dispara o contrato**
pelo provedor de assinatura ([`04`](./04-contratos-assinatura.md)), acompanhando até `signed`.

Ponto crítico de arquitetura: **a confirmação de pagamento e a geração de
contrato são assíncronas e pesadas** → entram no protocolo **defer/resume**
(§4.2 da FUNDAÇÃO). A Sofia **não** fica "segurando a linha" esperando o webhook;
ela responde ao cliente algo humano ("perfeito, te mandei o link — assim que cair
o pagamento eu já confirmo e travo as datas pra você"), e o **resume** acontece
quando o evento externo chega.

### 4.2 Fluxo passo a passo

1. **Entrada em `FECHAMENTO`.** Gatilho §3 satisfeito. A Sofia chama a tool nova
   **`start_closing`** (ver §6.2). Efeitos via `setConversationState()`
   (Firestore+Redis atômico, §4.1 da FUNDAÇÃO):
   - `conversations/{id}.state = 'FECHAMENTO'`, `stateUpdatedAt = now`.
   - `conversations/{id}.closingMode = 'ia'` (snapshot da política do tenant).
2. **Confirmação do negócio.** A Sofia recapitula imóvel, datas, hóspedes e
   **valores** (vindos da busca/reserva — nunca inventados) e pede o "ok".
3. **Geração do link de pagamento + caução.** Ao "ok", a Sofia chama
   **`request_deposit`** (§6.2), que cria o documento `deposits/{depositId}`
   (status `pending`) e, via Functions ([`03`](./03-pagamentos-caucao-mercadopago.md)), gera a cobrança no **Mercado Pago
   com split** (`provider:'mercadopago'`, `splitTakeRate ~0.01`). O link/PIX volta
   e a Sofia o envia ao cliente. Esta cobrança é, por baixo, um **defer**: estado
   →`IA_TRABALHANDO` brevemente enquanto a Function cria a cobrança, com
   `client_message` já enviada ("te mandei o link, é rapidinho").
   - Reuso/coexistência: o pipeline espelha o de **AbacatePay** já existente
     (`app/api/webhooks/abacatepay`, `lib/services/abacatepay-reconciliation-service.ts`).
     `deposits.provider` aceita `'abacatepay'` para coexistência/migração ([`03`](./03-pagamentos-caucao-mercadopago.md)).
4. **Espera do pagamento (assíncrono).** Sem polling síncrono. O cliente paga; o
   **webhook do MP** (Function, idempotente por `webhookEventIds[]`) atualiza
   `deposits/{depositId}.status = 'paid'`, `paidAt`, e chama **`/resume`** no
   agente (`task_type: 'closing_prep'` ou um subtipo `deposit_paid` — ver §6.3)
   com `result: { depositId, status:'paid', amount, ... }`.
5. **Resume pós-pagamento.** O `/resume` (idempotente por `resume_done:{tenantId}:{taskId}`)
   monta histórico + bloco de sistema com o `result` e roda o grafo. A Sofia:
   - **Trava as datas no iCal** chamando **`lock_dates`** (§6.2; reusa o motor de
     `app/api/ical/*` e `app/api/calendar/sync/*`, detalhe em [`05`](./05-ical-disponibilidade.md)).
   - **Dispara o contrato** chamando **`send_contract`** (§6.2), que cria
     `contracts/{contractId}` (status `draft→sent`), preenche **slots** num
     **template determinístico** (LLM só preenche slots, Decisão 3) e envia ao
     provedor (`zapsign`/`clicksign`, [`04`](./04-contratos-assinatura.md)).
   - Avisa o cliente: "pagamento confirmado! já garanti suas datas e te mandei o
     contrato pra assinar."
6. **Espera da assinatura (assíncrono).** O **webhook do provedor de assinatura**
   (Function, idempotente) atualiza `contracts/{contractId}.status = 'signed'`,
   `signedAt`, `signedPdfUrl` (storage seguro, [`04`](./04-contratos-assinatura.md)) e chama **`/resume`** de novo
   (`task_type` subtipo `contract_signed`).
7. **Resume pós-assinatura → encerramento.** A Sofia confirma ("tá tudo certo,
   contrato assinado e datas garantidas, qualquer coisa é só chamar!"),
   atualiza entidades legadas por id (Reservation `paymentStatus`/`paidAmount`,
   Lead `status` rumo a `won`/`convertedToClientAt`) e transiciona
   `FECHAMENTO → ENCERRADA` (ou `ATIVA`, se o cliente seguir a conversa).

### 4.3 Diagrama de sequência (IA-finalizadora)

```
Cliente        Webhook(locai)         Agente(/process,/resume)     Functions            MP / Assinatura
  │  "quero fechar"   │                        │                        │                      │
  ├──────────────────▶│  dispatchToAgent       │                        │                      │
  │                   ├───────────────────────▶│ router=close_deal      │                      │
  │                   │                        │ critérios §3 OK        │                      │
  │                   │                        │ tool start_closing     │                      │
  │                   │                        │ state→FECHAMENTO(ia)    │                      │
  │  "confirma X, R$" │◀───────────────────────┤ final_response         │                      │
  │◀──────────────────┤ send                   │                        │                      │
  │  "ok"             │                        │                        │                      │
  ├──────────────────▶│───────────────────────▶│ tool request_deposit   │                      │
  │                   │                        ├───────────────────────▶│ cria deposit(pending)│
  │                   │                        │                        ├─────────────────────▶│ cria cobrança split
  │  "link de pgto"   │◀───────────────────────┤ final_response (link)  │◀─────────────────────┤ link/PIX
  │◀──────────────────┤ send                   │ (state→ATIVA/FECHAMENTO)│                      │
  │   ── paga ──      │                        │                        │                      │
  │                   │                        │                        │  webhook pago        │
  │                   │                        │                        │◀─────────────────────┤
  │                   │                        │                        │ deposit→paid (idemp.)│
  │                   │                        │◀───────────────────────┤ POST /resume         │
  │                   │                        │ tool lock_dates (iCal)  │                      │
  │                   │                        │ tool send_contract      ├─────────────────────▶│ cria doc p/ assinar
  │ "pago! contrato"  │◀───────────────────────┤ final_response          │                      │
  │◀──────────────────┤ send                   │                        │                      │
  │  ── assina ──     │                        │                        │  webhook assinado    │
  │                   │                        │                        │◀─────────────────────┤
  │                   │                        │◀───────────────────────┤ POST /resume         │
  │ "tudo certo!"     │◀───────────────────────┤ state→ENCERRADA         │                      │
  │◀──────────────────┤ send                   │                        │                      │
```

---

## 5. Modalidade (b) Dono-finalizador — passo a passo

### 5.1 Visão

`closingMode === 'owner'`. A Sofia faz o **preparo** e **entrega o cliente quente
ao dono com destaque máximo**, depois aguarda. Quando o dono libera ("show, pode
mandar o link"), a Sofia **reassume** e executa **só a parte chata** (mesmo
maquinário do §4: deposit → iCal → contrato), sem reabrir a negociação comercial.

Estados envolvidos: `FECHAMENTO` (snapshot `owner`) e `AGUARDANDO_HUMANO`. O canal
IA↔Dono (alertas, deep-link, dono perguntando) é do doc [`06`](./06-canal-ia-dono.md); aqui usamos os
ganchos `notify_owner` + estado `AGUARDANDO_HUMANO` + `ownerAlertedAt`.

### 5.2 Fluxo passo a passo

1. **Entrada em `FECHAMENTO` + alerta ao dono.** Gatilho §3 satisfeito. A Sofia
   chama **`start_closing`**:
   - `state = 'FECHAMENTO'`, `closingMode = 'owner'`.
   - **Imediatamente** dispara o alerta ao dono (reusa **`notify_owner`** + canal
     do [`06`](./06-canal-ia-dono.md)): **push + WhatsApp pessoal + deep-link** para a conversa específica,
     com mensagem de alta urgência: *"Cliente {nome} quer fechar {imóvel}
     ({datas}, {hóspedes}). Chama ele AGORA."* Grava `conversations/{id}.ownerAlertedAt = now`.
   - Aplica **destaque visual enorme** na conversa no dashboard (ver §5.5).
2. **Transição para `AGUARDANDO_HUMANO`.** Após o alerta, `setConversationState()`
   leva a conversa de `FECHAMENTO` → **`AGUARDANDO_HUMANO`**. A partir daqui a
   **IA não responde automaticamente o cliente** (mesmo gate de `MANUAL`/`isAiBlocked`
   no webhook — ver §5.4). A Sofia pode dar uma última mensagem-ponte ao cliente
   ("show! já chamei a pessoa responsável, ela te chama aqui rapidinho 😊" — sem
   prometer prazo que não controla).
3. **Humano fecha (takeover real).** O dono entra na conversa (deep-link),
   conversa com o cliente diretamente pelo dashboard/WhatsApp e fecha o emocional
   e o comercial. Durante isso a conversa pode estar em `AGUARDANDO_HUMANO` (dono
   ainda não assumiu) ou `MANUAL` (dono assumiu o teclado e bloqueou a IA pelo
   controle de `/dashboard/conversas` — `ai_blocked`). Os dois significam "IA
   calada"; a diferença é UI/CRM ([`01`](./01-agente-proativo-stateful.md)).
4. **Re-ativação da IA — o "show, pode mandar o link".** Quando o dono terminou a
   parte humana, ele **devolve a parte chata à IA**. Dois caminhos equivalentes
   (o que vier primeiro):
   - **(i) Comando explícito do dono** no canal IA↔Dono / console (`/operate`,
     persona Operador) — ex.: *"show, pode mandar o link de pagamento e coletar o
     contrato"*. O `/operate` reconhece a intenção e chama **`resume_closing`**
     (§6.2) para aquela conversa.
   - **(ii) Botão no dashboard** "Devolver para a IA finalizar" na conversa (UI,
     §5.5), que chama a mesma rota de `resume_closing`.
   `resume_closing` leva a conversa de `AGUARDANDO_HUMANO`/`MANUAL` → **`FECHAMENTO`**
   de novo (e **desbloqueia a IA**: remove `ai_blocked` / sai de `MANUAL` via o
   superset `lib/conversation/state.ts`, mantendo `isAiBlocked` consistente).
5. **A IA executa só a parte chata.** A partir daqui o fluxo é **idêntico ao §4.2
   passos 3→7**: `request_deposit` (MP split) → webhook pago (`/resume`) →
   `lock_dates` (iCal) → `send_contract` (provedor) → webhook assinado (`/resume`)
   → `ENCERRADA`. A diferença é só a origem (dono liberou) e o tom (a Sofia não
   renegocia; assume "o pessoal já acertou com você, então é só formalizar").
6. **Encerramento.** Igual ao §4.2 passo 7.

### 5.3 Diagrama de sequência (Dono-finalizador, com re-ativação)

```
Cliente      Webhook(locai)        Agente               Canal IA↔Dono (06)        Dono
  │ "quero fechar"  │                 │                        │                     │
  ├────────────────▶│ dispatchToAgent │                        │                     │
  │                 ├────────────────▶│ tool start_closing     │                     │
  │                 │                 │ state→FECHAMENTO(owner) │                     │
  │                 │                 │ notify_owner ──────────▶│ push+WhatsApp+link  │
  │                 │                 │ ownerAlertedAt=now      ├────────────────────▶│ "Cliente X quer
  │                 │                 │ state→AGUARDANDO_HUMANO │                     │  fechar. AGORA."
  │ "já te chamam"  │◀────────────────┤ final_response (ponte) │                     │
  │◀────────────────┤ send            │ (IA calada a partir daqui)                   │
  │   ◀── dono fecha o emocional via deep-link / takeover (MANUAL) ──────────────────┤
  │                 │                 │                        │ "show, manda o link"│
  │                 │                 │◀───────────────────────┤ /operate ou botão   ◀┤
  │                 │                 │ resume_closing          │                     │
  │                 │                 │ state→FECHAMENTO, IA on │                     │
  │                 │                 │  ... §4.2 passos 3→7 (deposit→iCal→contrato) ...
  │ "link / contrato"◀───────────────┤                        │                     │
  │◀────────────────┤ send            │                        │                     │
```

### 5.4 Gate de "IA calada" (reuso do que já existe)

O webhook `dispatchToAgent` (em `app/api/webhook/whatsapp-microservice/route.ts`)
**já** consulta `isAiBlocked(tenantId, clientPhone)` e, se bloqueado, persiste a
mensagem mas **não** auto-responde. Em Dono-finalizador reusamos exatamente isso:

- Quando entra em `AGUARDANDO_HUMANO`/`MANUAL`, o webhook não dispara `/process`.
- A FUNDAÇÃO §4.1 fixa: `MANUAL ⇔ ai_blocked`; `isAiBlocked===true ⇒ MANUAL`. O
  novo módulo `lib/conversation/state.ts` é **superset** que escreve `state`
  (Firestore + Redis `conv_state:{tenantId}:{normalizedPhone}`) **e** o
  `ai_blocked:{tenant}:{phone}` legado, sempre via `normalizeBlockPhone()`.
- Evolução necessária no webhook (mínima): em vez de checar só `isAiBlocked`,
  consultar o `state` (Redis quente → fallback Firestore). Tratar como "calada" os
  estados `MANUAL`, `AGUARDANDO_HUMANO` e `IA_TRABALHANDO` (este último
  **bufferiza** a mensagem do cliente para o `/resume`, §4.2). Em `ATIVA` e
  `FECHAMENTO`, a IA responde normalmente. Isso é o gancho do doc [`01`](./01-agente-proativo-stateful.md); aqui só
  declaramos a dependência.

`resume_closing` **reabre** a IA: chama `setConversationState(...,'FECHAMENTO')`,
que remove `ai_blocked`/sai de `MANUAL` no superset — é o que faz a IA "voltar a
responder" depois do "show, pode mandar o link".

### 5.5 Destaque na conversa (dashboard)

- Em `FECHAMENTO`/`AGUARDANDO_HUMANO` com `closingMode='owner'`, a conversa em
  `/dashboard/conversas` recebe **realce forte** (badge "QUER FECHAR — AÇÃO DO
  DONO", cor de alta prioridade, topo da lista) e botão **"Devolver para a IA
  finalizar"** (chama `resume_closing`). Estética: minimalista/elegante, sem
  emojis na UI, paleta indigo escura (preferência registrada do produto).
- O `ownerAlertedAt` permite ao doc [`06`](./06-canal-ia-dono.md) cobrar SLA de re-ping ("dono não chamou
  em X min").

---

## 6. Mudanças no agente (grafo, prompts, tools)

### 6.1 Prompts (`agent/app/graph/prompts.py`)

Reuso: `PLANNER_SYSTEM` (Sofia) e `ROUTER_SYSTEM` permanecem. Adições:

- **`ROUTER_SYSTEM`** — já cobre `close_deal`; não muda. Continua FAST.
- **`PLANNER_SYSTEM`** (Sofia) — adicionar um bloco **"FECHAMENTO"** com os
  critérios objetivos do §3.2 (quando chamar `start_closing`), a regra de
  honestidade do §3.3 ("nunca diga que já reservou antes da caução paga") e a
  orientação por modalidade: em `owner`, **não** conduzir cobrança — apenas
  preparar e escalar; em `ia`, conduzir o passo a passo do §4.2. A Sofia recebe a
  `closingMode` efetiva no bloco de sistema do turno (injetada pelo orquestrador a
  partir de `conversations/{id}.closingMode`/settings).
- **`OPERATOR_OPERADOR_SYSTEM`** (console do dono, `/operate`) — adicionar que o
  Operador pode **reativar o fechamento** ao reconhecer um "pode mandar o link /
  pode coletar o contrato / finaliza você" → chamar `resume_closing` para a
  conversa-alvo. Permanece sob a regra "executa escrita só com instrução clara".
- Tier de modelo (FUNDAÇÃO §4.5): decisão de fechamento e diálogo Sofia = `MAIN`;
  preenchimento de **slots de contrato** = `FAST`; nada de fechamento usa `DEEP`
  (que é só background).

### 6.2 Tools novas (`agent/app/tools/registry.py` + `client.py`)

Seguindo as convenções (§4.6): tool `snake_case`, endpoint `kebab-case` (map em
`client.py _TOOL_PATHS`), todas com HMAC. **Mutam estado → não entram em
`READ_ONLY_TOOL_NAMES`** (logo, indisponíveis no modo Analista). Assinaturas:

| Tool (LLM, snake_case) | Endpoint locai (kebab-case) | Quem chama | Args principais | Efeito |
|---|---|---|---|---|
| `start_closing` | `/api/agent/tools/start-closing` | Sofia (`/process`) | `conversation_id`, `property_id`, `checkin`, `checkout`, `guests`, `client_summary` | Cria/atualiza Reservation esboço; `setConversationState→FECHAMENTO`; grava `closingMode` snapshot. Em `owner`: aciona `notify_owner` + `AGUARDANDO_HUMANO` + `ownerAlertedAt`. |
| `request_deposit` | `/api/agent/tools/request-deposit` | Sofia (`/process` ou `/resume`) | `conversation_id`, `reservation_id?`, `amount` (centavos), `currency='BRL'`, `provider?` | Cria `deposits/{depositId}` (`pending`); enfileira Function MP split ([`03`](./03-pagamentos-caucao-mercadopago.md)); devolve link/PIX. (defer/resume curto) |
| `lock_dates` | `/api/agent/tools/lock-dates` | Sofia (`/resume` pós-pago) | `property_id`, `checkin`, `checkout`, `reservation_id?` | Trava datas no iCal ([`05`](./05-ical-disponibilidade.md)). Idempotente por reserva. |
| `send_contract` | `/api/agent/tools/send-contract` | Sofia (`/resume` pós-pago) | `conversation_id`, `reservation_id?`, `template_id`, `slots` (object) | Cria `contracts/{contractId}` (`draft→sent`); enfileira Function de geração+envio no provedor ([`04`](./04-contratos-assinatura.md)). |
| `resume_closing` | `/api/agent/tools/resume-closing` | Operador (`/operate`) **ou** UI dashboard | `conversation_id` | `setConversationState→FECHAMENTO`, desbloqueia IA (sai de `MANUAL`/`ai_blocked`); sinaliza Sofia a executar a "parte chata". |

Notas:
- `start_closing` é o substituto deliberado de "Sofia chamava `notify_owner` solto
  no `close_deal`": em `owner` ele **engloba** o `notify_owner` (reuso) já dentro
  da transição de estado, garantindo `ownerAlertedAt` e o snapshot de modalidade.
- `request_deposit`, `lock_dates`, `send_contract` podem ser chamados tanto no
  `/process` (IA-finalizadora, cliente presente) quanto no `/resume` (após
  webhook). O agente é stateless: o estado vem do Firestore/Redis a cada turno.
- A criação efetiva da cobrança/contrato é **Function** (Decisão 2); as tools só
  registram a entidade e enfileiram. Confirmações chegam por **webhook → `/resume`**.

### 6.3 `/resume`, tasks e idempotência (reuso do [`01`](./01-agente-proativo-stateful.md))

Fechamento reusa **integralmente** o protocolo defer/resume da FUNDAÇÃO §4.2:

- `deferred_tasks/{taskId}` com `taskType` dentro do espaço já previsto. Para
  fechamento usamos `taskType: 'closing_prep'` e dois subtipos no `payload`/`resumeHint`:
  `deposit_paid` (disparado pelo webhook MP) e `contract_signed` (disparado pelo
  webhook do provedor). **Sem renomear** o enum da FUNDAÇÃO; subtipo vai no payload.
- `/resume` é **idempotente por `taskId`** via `resume_done:{tenantId}:{taskId}`
  (SET NX EX). Webhooks são idempotentes por `webhookEventIds[]` em
  `deposits`/`contracts`. Logo, reentrega de webhook **não** dispara cobrança
  dupla nem mensagem dupla ao cliente.
- Outbound (mensagens da Sofia ao cliente no `/resume`) sai pelo mesmo
  orquestrador, a ser extraído para `lib/whatsapp/outbound.ts` (FUNDAÇÃO §4.2) —
  hoje embutido no `dispatchToAgent`. Reuso direto do `POST {microservice}/api/v1/messages/{tenantId}/send`.

---

## 7. Como cada modalidade aciona pagamento / caução / iCal / contrato

| Passo | IA-finalizadora (`ia`) | Dono-finalizador (`owner`) |
|---|---|---|
| **Decisão de fechar** | Sofia decide (critérios §3) e conduz. | Sofia decide e **escala**; dono decide o comercial. |
| **Negociação/emocional** | Sofia formaliza (sem desconto). | **Humano** (maior conversão na etapa final). |
| **Disparo do pagamento+caução** | Sofia → `request_deposit` (MP split, [`03`](./03-pagamentos-caucao-mercadopago.md)). | Após `resume_closing`: Sofia → `request_deposit` (MP split, [`03`](./03-pagamentos-caucao-mercadopago.md)). |
| **Confirmação da caução** | Webhook MP idempotente → `/resume`. | Idem — mesmo webhook/resume. |
| **iCal (travar datas)** | Sofia → `lock_dates` ([`05`](./05-ical-disponibilidade.md)) no resume pós-pago. | Idem — após pagamento, no resume. |
| **Contrato** | Sofia → `send_contract` (provedor, [`04`](./04-contratos-assinatura.md)); webhook assinado → `/resume`. | Idem. |
| **Quem aperta o "vai"** | A IA, do `start_closing` em diante. | O dono no início (fecha) e ao liberar (`resume_closing`); a IA só na "parte chata". |
| **Estado-chave extra** | `FECHAMENTO` o tempo todo. | `FECHAMENTO`→`AGUARDANDO_HUMANO`→(`MANUAL`)→`FECHAMENTO`. |

Em **ambas**, a "parte chata" (deposit → iCal → contrato) é **o mesmo código** —
só muda **quem dispara**. Isso é deliberado: reduz superfície e garante paridade
de comportamento de pagamento/contrato entre modalidades.

### Entidades acionadas (FUNDAÇÃO §4.3, sem renomear)

- **`deposits/{depositId}`** — caução. `provider:'mercadopago'` (split,
  `splitTakeRate~0.01`) ou `'abacatepay'` (coexistência). `status: pending→paid`.
  Idempotência por `webhookEventIds[]`. Detalhe em [`03`](./03-pagamentos-caucao-mercadopago.md).
- **`contracts/{contractId}`** — contrato. `provider:'zapsign'|'clicksign'`,
  `templateId`/`templateVersion`, `slots`, `status: draft→sent→signed`,
  `signedPdfUrl`. Detalhe em [`04`](./04-contratos-assinatura.md).
- **iCal** — reusa export (`app/api/ical/[tenantId]/[propertyId]`) e
  import/sync (`app/api/calendar/sync/*`). Detalhe em [`05`](./05-ical-disponibilidade.md).
- **`conversations/{id}`** — campos novos usados aqui: `state`, `stateUpdatedAt`,
  `closingMode`, `ownerAlertedAt`, `activeTaskId`. `conversationId = {tenantId}:{normalizedPhone}`.
- **Legadas por id**: `Reservation` (paymentStatus/paidAmount/pendingAmount,
  checkIn/checkOut), `Lead` (status→won, convertedToClientAt, wonValue),
  `Conversation.status`/`stage` (UI/CRM) — atualizadas mas não renomeadas.

---

## 8. O que reusa vs o que é novo

**Reusa (já existe no repo):**
- Gate "IA calada": `isAiBlocked`/`aiBlockKey`/`normalizeBlockPhone`
  (`lib/utils/ai-block.ts`) + Redis `ai_blocked:{tenant}:{phone}`; já consultado
  em `dispatchToAgent`.
- Outbound não solicitado: `POST {microservice}/api/v1/messages/{tenantId}/send`
  (já usado no webhook).
- Dedup inbound: `lib/cache/deduplication-cache.ts` (SET NX EX).
- HMAC `"{ts}.{body}"` / janela 60s (`lib/middleware/agent-auth.ts`, `agent/app/auth.py`).
- Intenção `close_deal` no `ROUTER_SYSTEM`; `notify_owner` (escalada ao dono).
- iCal export/import/sync (`app/api/ical/*`, `app/api/calendar/sync/*`).
- Reconciliação de pagamento como espelho: AbacatePay
  (`lib/services/abacatepay-reconciliation-service.ts`, `app/api/webhooks/abacatepay`).
- `TenantServiceFactory`, `read_system`/insights, console `/operate` (personas).

**Novo (greenfield, criado por este e pelos docs ligados):**
- Toggle de modalidade em `config/closing` (`mode`) + UI ([`11`](./11-settings.md)).
- Estado `FECHAMENTO` e transições (depende de [`01`](./01-agente-proativo-stateful.md), `lib/conversation/state.ts`).
- Tools `start_closing`, `request_deposit`, `lock_dates`, `send_contract`,
  `resume_closing` (+ endpoints `/api/agent/tools/*`).
- Entidades `deposits` ([`03`](./03-pagamentos-caucao-mercadopago.md)) e `contracts` ([`04`](./04-contratos-assinatura.md)).
- Conector **Mercado Pago split** + webhook idempotente ([`03`](./03-pagamentos-caucao-mercadopago.md)) — não existe hoje.
- Integração com **provedor de assinatura** ([`04`](./04-contratos-assinatura.md)) — greenfield total.
- Functions de cobrança/contrato/webhooks ([`08`](./08-backend-firebase-functions.md)).
- Botão "Devolver para a IA finalizar" + destaque de conversa (`/dashboard/conversas`).
- Bloco "FECHAMENTO" nos prompts da Sofia e do Operador (`prompts.py`).

---

## 9. Trade-offs e riscos

1. **Dois campos `closingMode` (settings vs conversation).** Risco de confusão de
   leitura. Mitigação: snapshot na conversa é a **fonte de verdade do fluxo em
   curso**; settings só semeia novas conversas. Documentado no §2.2.
2. **Pré-condição de `'ia'` sem conectores.** Se o dono ativar `'ia'` sem MP/assinatura,
   o fechamento quebraria. Mitigação: UI bloqueia a seleção; runtime **degrada para
   `'owner'`** (escala ao dono) e nunca promete cobrança que não consegue gerar
   (Princípio 1). Logar o downgrade.
3. **Webhooks e idempotência.** Reentrega de webhook MP/assinatura poderia gerar
   cobrança/contrato/mensagem duplicados. Mitigação: `webhookEventIds[]` +
   `resume_done:*` (SET NX EX). É **obrigatório** — risco financeiro real.
4. **Janela entre "datas seguradas" e "caução paga".** Outro cliente pode pedir as
   mesmas datas. Mitigação: `lock_dates` **só após pagamento**; antes disso a Sofia
   é honesta ("confirma quando o pagamento entra"). Opcional (decidir em [`05`](./05-ical-disponibilidade.md)): um
   "hold" temporário curto — fora do escopo deste doc.
5. **Mensagens do cliente durante `AGUARDANDO_HUMANO`.** Ficam sem resposta da IA
   por design (humano no loop). Risco de cliente esfriar se o dono demorar.
   Mitigação: mensagem-ponte (§5.2 passo 2) + SLA de re-ping do dono ([`06`](./06-canal-ia-dono.md)) +
   destaque no dashboard (§5.5).
6. **Re-ativação ambígua pelo dono.** "Pode mandar o link" dito em linguagem natural
   pode não ser captado pelo `/operate`. Mitigação: **botão explícito** no dashboard
   como caminho determinístico equivalente (§5.2 passo 4-ii). Não depender só do NLU.
7. **Latência do `/process` síncrono.** O `dispatchToAgent` tem timeout de 55s; criar
   cobrança no MP de forma síncrona poderia estourar. Mitigação: criação de cobrança
   é **defer/Function** com `client_message` imediata; nunca bloquear o turno do
   WhatsApp (FUNDAÇÃO §4.2 + tier: `DEEP`/pesado fora do caminho síncrono).
8. **Custo.** Fechamento é conversacional (`MAIN`) + slots (`FAST`); nada de `DEEP`.
   `max_tokens≤1024`, histórico `[-20:]`, logar tokens ([`09`](./09-modelos-custo.md)). Mantém o Princípio 3.

---

## 10. Checklist de implementação (ordem)

1. (Pré) [`01`](./01-agente-proativo-stateful.md)+`lib/conversation/state.ts`: estado `FECHAMENTO`, `setConversationState`,
   webhook lê `state` (calada em `MANUAL`/`AGUARDANDO_HUMANO`/`IA_TRABALHANDO`).
2. (Pré) [`01`](./01-agente-proativo-stateful.md) (defer/resume, `/resume`) + [`06`](./06-canal-ia-dono.md) (`notify_owner`+`AGUARDANDO_HUMANO`).
3. Config: documento `config/closing.mode` (default `owner`) + leitura no orquestrador; UI/esquema em [`11`](./11-settings.md).
4. Tools `start_closing` / `resume_closing` + endpoints; bloco "FECHAMENTO" nos prompts.
5. Modalidade `owner` ponta a ponta (alerta → handoff → re-ativação) — testável **sem** MP.
6. `request_deposit` + `deposits` + Function MP split + webhook→`/resume` ([`03`](./03-pagamentos-caucao-mercadopago.md)).
7. `lock_dates` + iCal ([`05`](./05-ical-disponibilidade.md)).
8. `send_contract` + `contracts` + provedor + webhook→`/resume` ([`04`](./04-contratos-assinatura.md)).
9. Modalidade `ia` ponta a ponta + downgrade seguro para `owner`.

> Observação de roadmap: a modalidade `owner` é implementável e entregável **antes**
> de MP/assinatura existirem (passos 1-5), pois reusa `notify_owner` + estados. Isso
> respeita a Decisão 4 (proativo+stateful primeiro) e dá valor cedo, deixando
> pagamento/contrato (Fase 3) para fecharem a `ia`.
