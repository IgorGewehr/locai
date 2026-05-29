# 07 — Atendimentos como base de conhecimento (BI)

> **Escopo deste documento.** Evoluir a iniciativa de BI já em produção
> (`crm-insights-core` + resource `insights` + painel "Receita Perdida" na aba
> Atendimentos) de uma análise **estrutural do funil** (estados/leads) para uma
> camada de **mineração de PADRÕES acionáveis a partir do conteúdo das
> conversas** — ex.: *"13 clientes gostaram do apê X e pediram pet, que não é
> aceito → só 2 dos 13 fecharam"*. Cobre extração de **objeções/intenções** das
> mensagens, **agregação** desses sinais por imóvel/tema, e como a **Analista**
> (persona já existente) entrega isso ao dono. Tudo **honesto**: nenhum número
> fabricado; sem dado → `null` + flag.

---

## 1. Princípio nº 1 acima de tudo: honestidade de dados

Esta é uma feature de BI. O risco número um de BI sobre conversas é a IA
"alucinar" um insight bonito que não existe nos dados. A FUNDAÇÃO trava isso
(Princípio 1; §4.6 "Honestidade") e o código atual **já** o implementa:

- `crm-insights-core.ts` retorna `costDataAvailable: false` **sempre**, e
  devolve `roi/costPerLead/costPerConversion` como literal `null` — porque o
  sistema não tem ad-spend/custo de aquisição. Métricas sem amostra (response
  time, tempo de conversão) viram `null` + `sampleSize`.
- O resource `insights` (`app/api/agent/tools/read/route.ts`,
  `buildInsightObservations`) só emite uma observação **quando há contagem real
  por trás** (`if (o.totalLeads > 0)`, `if (drops.length)`, etc.).
- A persona Analista (`agent/app/graph/prompts.py`, bloco ANALISTA SÊNIOR)
  tem como regra inegociável: *"Use SOMENTE números reais vindos das
  ferramentas. NUNCA invente, estime ou chute valores. Quando uma métrica vier
  `null`/`costDataAvailable:false`, diga EXPLICITAMENTE que o sistema não tem
  esse dado."*

**Regra de extensão deste doc:** todo número novo introduzido pela mineração de
conversas DEVE carregar sua contagem-base (`n`) e o conjunto de IDs que o
sustenta. Um padrão com `n < MIN_PATTERN_SUPPORT` (default **5**) **não vira
insight afirmativo** — vira, no máximo, um "sinal fraco" rotulado como tal, ou é
omitido. A frase do dono ("13 gostaram, só 2 fecharam") só pode ser dita se os
13 e os 2 existirem como documentos reais. Nunca arredondar para cima, nunca
preencher o que falta.

---

## 2. O que JÁ existe (reuso) vs. o que é NOVO

### 2.1 Reuso (não reescrever)

| Peça | Arquivo | Papel no BI evoluído |
|---|---|---|
| Núcleo de funil puro | `lib/analytics/crm-insights-core.ts` (`computeCrmInsightsFromLeads`, `CrmInsights`, `toMillis`) | Continua sendo a análise estrutural (conversão, drop-off, win/loss, fontes, receita). A camada nova **complementa**, não substitui. |
| Wrapper de fetch | `lib/analytics/crm-insights.ts` (`computeCrmInsights`) | Carrega leads do tenant e chama o core. Padrão a espelhar para a camada de conversas. |
| Resource `insights` | `app/api/agent/tools/read/route.ts` (`buildPayload` case `'insights'`, `buildInsightObservations`) | Ponto de entrega para a Analista. Ganha um campo **novo** `conversationPatterns` + observações derivadas (§5). |
| Painel "Receita Perdida" | `components/organisms/atendimentos/ReceitaPerdidaPanel.tsx` em `app/dashboard/atendimentos/page.tsx` | Recebe um painel **irmão** "Padrões de Atendimento" (§6), mesmo padrão client-side (`useTenantServices`, leads já carregados). |
| Persona Analista | `agent/app/graph/prompts.py` | Já sabe consumir `observations`. Recebe instrução para tratar os `conversationPatterns` (§5.3). |
| Multi-tenant / auth | `TenantServiceFactory` (`lib/firebase/firestore-v2.ts`), `validateAgentRequest` (`lib/middleware/agent-auth.ts`, HMAC `ts.body` 60s) | Toda leitura/escrita nova é tenant-scoped e autenticada igual ao resto. |
| Mensagens | `lib/types/conversation.ts` (`ConversationMessage` em `tenants/{tenantId}/messages`: `clientMessage`, `clientMessageTimestamp`, `sofiaMessage`, `conversationId`, `context?: MessageContext{intent, entities, functionsCalled}`) | Fonte bruta para a mineração. `MessageContext` já tem `intent`/`entities` — onde já populado, reusar. |
| Leads | `lib/types/crm.ts` (`Lead`: `status`, `lostReason`, `preferences{amenities, propertyType, location}`, `interests[]`, `wonValue`, `convertedToClientAt`) | Junção: liga um padrão extraído da conversa ao desfecho (won/lost) do lead. |

### 2.2 Novo (greenfield, declarado onde vive)

| Peça | Onde vive | Decisão de FUNDAÇÃO |
|---|---|---|
| Extração de objeções/intenções por conversa (LLM `DEEP`, batch, assíncrono) | **Firebase Function** (`functions/`, conforme Decisão 2 + doc [`08`](./08-backend-firebase-functions.md)) — NUNCA no caminho síncrono do WhatsApp | §4.5: tier `DEEP` só em background; Decisão 2: pesado/assíncrono vai pra Functions primeiro |
| Coleção `conversation_signals/{signalId}` | `tenants/{tenantId}/conversation_signals` (camelCase) | §4.3: novo modelo sob `tenants/{tenantId}/`; pode ADICIONAR coleção, nunca renomear as existentes |
| Agregador puro de padrões | `lib/analytics/conversation-patterns-core.ts` (novo, puro/client-safe, espelha o estilo de `crm-insights-core.ts`) | Princípio 5 (reuso de padrão) |
| Wrapper de fetch | `lib/analytics/conversation-patterns.ts` (novo) | espelha `crm-insights.ts` |
| Campo `conversationPatterns` no payload do resource `insights` | `app/api/agent/tools/read/route.ts` (estende `case 'insights'`) | reusa contrato/auth existente; não cria tool nova |
| Painel "Padrões de Atendimento" | `components/organisms/atendimentos/PadroesAtendimentoPanel.tsx` (novo) | reusa estética e fluxo do `ReceitaPerdidaPanel` |

---

## 3. Modelo de dados novo: `conversation_signals`

> Sob `tenants/{tenantId}/conversation_signals/{signalId}`, **camelCase**,
> conforme §4.3/§4.6. É uma coleção **derivada** (cache de análise) — não é fonte
> de verdade de negócio; pode ser recomputada a partir de `messages`. Por isso
> nunca contém número agregado, só o sinal cru extraído de UMA conversa.

```ts
// lib/types/conversation-signals.ts  (NOVO)

/** Categoria fechada — controla o vocabulário e impede o LLM de inventar rótulos. */
export type SignalKind =
  | 'liked_property'      // demonstrou interesse forte em um imóvel
  | 'objection'          // levantou uma objeção/barreira
  | 'requirement'        // pediu algo que pode ou não ser atendido (ex.: aceita pet)
  | 'intent'             // intenção declarada (alugar, comprar, visitar, fechar)
  | 'sentiment';         // tom geral do cliente na conversa

/** Sub-tipo fechado por kind — vocabulário controlado (ver §4.2). */
export type ObjectionTopic =
  | 'price' | 'pets' | 'location' | 'availability' | 'size'
  | 'amenities' | 'contract_terms' | 'response_time' | 'other';

export interface ConversationSignal {
  signalId: string;
  tenantId: string;
  conversationId: string;        // canônico = {tenantId}:{normalizedPhone}  (§4.3)
  clientPhone: string;           // normalizado via normalizeBlockPhone() (§4.1)
  leadId?: string;               // junção com o Lead, quando resolvível
  kind: SignalKind;
  topic?: ObjectionTopic;        // preenchido p/ kind='objection' | 'requirement'
  propertyId?: string;           // imóvel ao qual o sinal se refere, se houver
  // Evidência HONESTA: trecho LITERAL da conversa que sustenta o sinal.
  // Sem trecho => o sinal não é gravado (anti-alucinação, §4.3).
  evidenceQuote: string;
  evidenceMessageId: string;     // id do ConversationMessage de origem
  confidence: number;            // 0..1 — do extrator; abaixo de THRESHOLD descarta
  // Rastreabilidade da extração
  model: string;                 // tier DEEP usado (config.py) — auditoria de custo
  extractorVersion: string;      // versão do prompt/heurística que gerou
  sourceUpToMessageId: string;   // até onde a conversa foi lida (idempotência)
  createdAt: Date;
  updatedAt: Date;
}
```

**Índices (Firestore).** Para a agregação por imóvel/tema sem composite-index
caro, o agregador segue o padrão do resource `dashboard` (amostra até um cap e
agrega em memória). Índices simples recomendados: `conversationId`,
`kind`, `topic`, `propertyId`, `createdAt`. Junção lead↔sinal é feita em
memória pelo agregador (carrega leads + signals, casa por `leadId`/`conversationId`).

**Idempotência da extração.** Chave de idempotência por
`(conversationId, sourceUpToMessageId)`: a Function só reprocessa uma conversa se
chegou mensagem nova depois de `sourceUpToMessageId`. Reescrita de sinais de uma
conversa é um *replace* (apaga sinais antigos daquela conversa com
`extractorVersion` inferior e regrava), evitando duplicação — espelha a
disciplina de idempotência da FUNDAÇÃO (§4.6, SET NX EX / `webhookEventIds[]`).

---

## 4. Extração: de mensagens cruas a sinais (NOVO, em Functions)

### 4.1 Onde roda e por quê

A extração é LLM-pesada, faz fan-out sobre o histórico e **não pode** entrar no
caminho síncrono `/process` do WhatsApp (regra §4.5: `DEEP` jamais síncrono).
Logo, conforme a **Decisão 2** (Functions incremental: novo/pesado/assíncrono
primeiro) e o doc [`08`](./08-backend-firebase-functions.md), vive numa
**Firebase Function** com **mesma HMAC e logging** da FUNDAÇÃO (§4.6). Dispara
por:

1. **Cron** (`pubsub.schedule`, ex.: a cada 6h) — reprocessa conversas com
   mensagens novas desde o último `sourceUpToMessageId`. Caminho principal,
   barato (lote, fora de horário de pico).
2. **Sob demanda** — quando o dono abre a aba Atendimentos e pede "atualizar
   padrões", o frontend chama um endpoint que enfileira a Function (não bloqueia
   a UI; a UI mostra o último resultado disponível + "atualizado há X").

> Reaproveita a **mesma fila/worker** introduzida no doc
> [`08`](./08-backend-firebase-functions.md) (Cloud Tasks, 1º código de
> `functions/`). O extrator é só mais um `taskType` conceitual de job em
> background — mas **não** usa `deferred_tasks` (essas são do agente proativo,
> doc [`01`](./01-agente-proativo-stateful.md)); BI tem seu próprio job, sem
> tocar o estado de conversa (`ConversationState` do doc
> [`01`](./01-agente-proativo-stateful.md) permanece intocado pela mineração).

### 4.2 Prompt determinístico com vocabulário fechado

O extrator usa o tier **`DEEP`** (`agent/app/config.py`, §4.5) com:

- `max_tokens` ≤ 1024 (§4.5);
- histórico `[-20:]` por conversa (§4.5) — janela curta, custo controlado;
- **saída JSON estrita** validada por schema (Zod no lado locai / Pydantic na
  Function): o LLM só pode emitir `kind`/`topic` do enum fechado (§3). Rótulo
  fora do vocabulário → descartado. Isso impede o "tema inventado".
- **Regra de evidência:** cada sinal DEVE vir com `evidenceQuote` copiado
  **literalmente** de uma mensagem do cliente (`clientMessage`). O validador
  rejeita o sinal se o `evidenceQuote` não for substring de alguma mensagem real
  da conversa. **Esta é a barreira anti-alucinação central da feature.**
- `confidence < CONFIDENCE_THRESHOLD` (default **0.6**) → descartado.
- Loga `total_tokens_in/out` por chamada (§4.5, custo/observabilidade — doc [`09`](./09-modelos-custo.md)).

Pseudocontrato da Function:

```
POST {functionsBaseUrl}/extract-conversation-signals   (HMAC ts.body, 60s)
body: { tenantId, conversationId, sinceMessageId? }
→ lê messages (clientMessage não-nulos) da conversa via TenantServiceFactory
→ chama LLM DEEP com prompt fechado + janela [-20:]
→ valida JSON (enum + evidenceQuote substring) → descarta o que falhar
→ replace idempotente em tenants/{tenantId}/conversation_signals
→ { ok, conversationId, signalsWritten, signalsRejected, model, tokens }
```

### 4.3 Reuso de `MessageContext.intent`/`entities`

`ConversationMessage.context` já tem `intent`, `entities`, `functionsCalled`.
Onde esses campos já estiverem populados pelo agente em tempo real, o extrator
os usa como **dica barata** (pula a chamada LLM para `kind='intent'` quando o
intent já está confiável), reduzindo custo. Quando ausentes, recai no LLM `DEEP`.
Isso é progressivo e honesto: nunca preenche `intent` que não existe.

### 4.4 Diagrama de sequência — extração (texto)

```
Cron (a cada 6h)                Function extract-signals          Firestore (tenant)         LLM (tier DEEP)
   │                                   │                               │                          │
   ├─ enfileira lote de tenants ──────▶│                               │                          │
   │                                   ├─ lista conversations c/ msgs ▶│                          │
   │                                   │   novas (> sourceUpTo)        │                          │
   │                                   │◀── conversas candidatas ──────┤                          │
   │                                   │                               │                          │
   │            (por conversa)         ├─ lê messages [-20:] ─────────▶│                          │
   │                                   │◀── clientMessage[] ───────────┤                          │
   │                                   ├─ prompt fechado + janela ─────────────────────────────▶ │
   │                                   │◀── JSON sinais candidatos ──────────────────────────────┤
   │                                   ├─ valida enum + evidenceQuote substring                   │
   │                                   ├─ descarta confidence<0.6 / quote inválido                │
   │                                   ├─ replace idempotente ────────▶│ conversation_signals     │
   │                                   ├─ loga tokens/custo (doc 09)   │                          │
```

Falha de LLM/timeout → a Function marca o job como `failed` na fila (doc [`08`](./08-backend-firebase-functions.md)),
**não** grava sinais parciais, e o agregador simplesmente trabalha com o que já
existe. Nada quebra na UI; o "atualizado há X" envelhece e pronto (degradação
honesta).

---

## 5. Agregação: de sinais a padrões acionáveis (NOVO, puro)

### 5.1 `conversation-patterns-core.ts` — assinatura

Espelha exatamente o desenho de `crm-insights-core.ts`: **função pura,
client-safe**, importa só tipos + date-fns, recebe arrays já carregados, injeta
`now` para teste determinístico, e **nunca fabrica número**.

```ts
// lib/analytics/conversation-patterns-core.ts  (NOVO)

export interface PatternOpts {
  periodMonths?: number;        // default 6 — alinhado a CrmInsightsOpts
  minSupport?: number;          // default 5 — n mínimo p/ padrão afirmativo (§1)
}

export interface PropertyDemandPattern {
  propertyId: string;
  propertyTitle: string | null;     // null se não resolvido — honesto
  likedCount: number;               // nº de conversas distintas com 'liked_property'
  // Objeções/requisitos co-ocorrentes neste imóvel, ordenados por frequência:
  topObjections: Array<{ topic: ObjectionTopic; count: number }>;
  // Desfecho REAL dos leads ligados a essas conversas:
  wonCount: number;
  lostCount: number;
  openCount: number;
  conversionRate: number | null;    // null se likedCount === 0
  // IDs que sustentam o número (auditoria/anti-alucinação):
  conversationIds: string[];
}

export interface ObjectionPattern {
  topic: ObjectionTopic;
  count: number;                    // nº de conversas distintas com a objeção
  // Conversão de quem levantou essa objeção vs. base — só com amostra suficiente:
  wonCount: number;
  lostCount: number;
  conversionRate: number | null;    // null se count < minSupport
  exampleQuotes: string[];          // 1-3 trechos LITERAIS (de evidenceQuote)
}

export interface ConversationPatterns {
  period: { months: number; from: string; to: string };
  generatedAt: string;
  costDataAvailable: false;         // herdado do princípio — sem custo no sistema
  minSupport: number;
  signalsAnalyzed: number;          // 0 => tudo abaixo vira [] / null (honesto)
  staleness: { lastExtractedAt: string | null }; // "atualizado há X" na UI
  propertyDemand: PropertyDemandPattern[];        // ordenado por likedCount desc
  objections: ObjectionPattern[];                 // ordenado por count desc
  // Padrões compostos prontos para virar 1 frase (a "frase do dono"):
  highlights: Array<{
    text: string;                   // gerado SÓ a partir de contagens reais (§5.2)
    support: number;                // n por trás da frase
    conversationIds: string[];
  }>;
}

export function computeConversationPatterns(
  signals: ConversationSignal[],
  leads: Lead[],
  properties: Array<{ id: string; title?: string }>,
  opts?: PatternOpts,
  now?: Date,
): ConversationPatterns;
```

### 5.2 A "frase do dono" é montada por código, não pelo LLM

O exemplo do fundador — *"13 gostaram do apê X e pediram pet, que não é aceito →
só 2 fecharam"* — é gerado por **template determinístico em `core`**, populado só
com contagens reais. **O LLM não escreve esse número.** Lógica:

1. Para cada imóvel com `likedCount ≥ minSupport`:
2. encontra o `topObjection` co-ocorrente mais frequente (ex.: `pets`, 13x);
3. cruza com o desfecho real dos leads daquelas conversas (`wonCount` = 2);
4. **valida contra a política do imóvel** (ex.: imóvel não aceita pet — campo do
   Property) antes de afirmar a causa. Sem confirmação da política, a frase usa
   linguagem de correlação ("pode estar relacionado"), nunca de causa.
5. monta `text` com placeholders preenchidos por essas contagens e anexa
   `support` + `conversationIds`.

Se qualquer contagem-base for `< minSupport`, **não há highlight** para aquele
imóvel/tema (some, não vira "0/0"). Conversão sem amostra → `conversionRate:
null`. Esta é a aplicação direta do Princípio 1 à camada nova.

### 5.3 Entrega via resource `insights` (estende o existente)

`app/api/agent/tools/read/route.ts`, `case 'insights'`, passa a montar também os
padrões — **sem criar tool nova** (reuso, Princípio 5; sem mexer no
`registry.py`/`client.py`):

```ts
case 'insights': {
  const ci = await computeCrmInsights(tenantId)              // já existe
  const cp = await computeConversationPatterns(tenantId)    // NOVO wrapper
  const compact = { ...ci, hotLeadsNoFollowUp: { ...ci.hotLeadsNoFollowUp,
                    leads: ci.hotLeadsNoFollowUp.leads.slice(0, 8) } }
  return {
    insights: compact,
    conversationPatterns: {
      ...cp,
      propertyDemand: cp.propertyDemand.slice(0, 8),  // trim p/ payload do LLM
      objections: cp.objections.slice(0, 8),
      highlights: cp.highlights.slice(0, 6),
    },
    observations: [
      ...buildInsightObservations(ci),
      ...buildPatternObservations(cp),   // NOVO — só com contagem real (espelha o existente)
    ],
  }
}
```

`buildPatternObservations(cp)` segue **byte a byte** o estilo de
`buildInsightObservations`: emite uma observação **somente** quando há contagem
real (`if (cp.highlights.length)`, `if (cp.objections[0]?.count >= cp.minSupport)`),
nada quando `signalsAnalyzed === 0`. A Analista recebe esses `highlights`/
`observations` como **ponto de partida do raciocínio** (a persona já é instruída
a "ir além das observations, apontar causa provável e próximo passo") e, pela
regra de honestidade já no prompt, não pode extrapolar além do `n` informado.

Adendo mínimo ao prompt da Analista (`prompts.py`, sem reescrever a persona):
acrescentar uma linha listando que `resource='insights'` agora também traz
`conversationPatterns` (padrões de demanda por imóvel, objeções recorrentes,
highlights com `support`/`conversationIds`), e reforçar: *"cada highlight já vem
com o n por trás; nunca afirme além desse n; se `signalsAnalyzed:0`, diga que
ainda não há conversas analisadas o suficiente."*

---

## 6. Entrega na UI: painel "Padrões de Atendimento"

Novo componente `components/organisms/atendimentos/PadroesAtendimentoPanel.tsx`,
**irmão** do `ReceitaPerdidaPanel`, montado em `app/dashboard/atendimentos/page.tsx`
logo abaixo dele, com o mesmo padrão já no arquivo:

- carrega client-side via `useTenantServices` (igual a `loadLeads`), buscando
  `conversation_signals` + reusando os `leads` já carregados na página (evita
  re-fetch — a página já tem `leads` em estado);
- chama `computeConversationPatterns` no cliente (core é client-safe, igual ao
  `crm-insights-core` usado por `ReceitaPerdidaPanel`);
- exibe: top imóveis por demanda com objeção dominante + desfecho real
  (a "frase do dono" renderizada), e ranking de objeções recorrentes;
- cada card mostra o `support` (n) explicitamente e linka para as conversas
  (`conversationIds`) reusando a navegação já existente
  (`router.push('/dashboard/conversas?phone=...')`);
- estética alinhada à preferência do produto (minimalista/elegante, paleta
  indigo escura, **sem emojis**), espelhando o estilo visual do
  `ReceitaPerdidaPanel`/`page.tsx` atual.
- **Estado vazio honesto:** se `signalsAnalyzed === 0`, mostra "Ainda não há
  conversas suficientes analisadas para extrair padrões" + botão "Atualizar
  padrões" (enfileira a Function §4.1) — nunca um gráfico fabricado.
- **Staleness visível:** "padrões atualizados há X" a partir de
  `staleness.lastExtractedAt`.

### 6.1 Diagrama de sequência — consumo (texto)

```
DONO abre aba Atendimentos          page.tsx / PadroesAtendimentoPanel        Firestore (tenant)
   │                                       │                                        │
   ├─ render ──────────────────────────────▶│  (já tem leads[] no estado)           │
   │                                       ├─ lê conversation_signals ─────────────▶│
   │                                       │◀── signals[] + lastExtractedAt ────────┤
   │                                       ├─ computeConversationPatterns(           │
   │                                       │     signals, leads, properties)  [core] │
   │                                       ├─ render highlights c/ support + links   │
   │                                       │                                        │
   ├─ "Atualizar padrões" ─────────────────▶│ POST enfileira extract-signals (§4.1)  │
   │                                       │   (não bloqueia; UI segue mostrando     │
   │                                       │    o último resultado)                  │
   │                                                                                 │
DONO pergunta no canal IA↔Dono (doc 06 / /operate, modo analista)
   │                                       Analista (LLM)                  resource 'insights'
   ├─ "por que o apê X não fecha?" ────────▶│  read_system insights ───────────────▶│
   │                                       │◀── conversationPatterns + observations ─┤
   │◀── resposta ancorada no n real ────────┤  (nunca além do support)               │
```

A Analista usa o **mesmo** `read_system resource='insights'` (operator console
`/operate`, modo `analista`, somente-leitura) — alinhado ao canal IA↔Dono do doc
[`06`](./06-canal-ia-dono.md) ("ele pergunta em vez de checar painéis").

---

## 7. Tiers de modelo e custo (§4.5 / doc [09](./09-modelos-custo.md))

| Etapa | Tier | Justificativa |
|---|---|---|
| Extração de sinais (Function, batch) | **`DEEP`** | Único uso pesado; em background, nunca síncrono no WhatsApp. `max_tokens≤1024`, janela `[-20:]`, loga tokens. |
| Agregação (`core`) | **nenhum LLM** | Determinística, pura, roda em ms no cliente/servidor. Custo ~zero. |
| Frase do dono / highlights | **nenhum LLM** | Template determinístico (§5.2). |
| Resposta da Analista sob pergunta | **`MAIN`** (planner Analista existente) | Já é o tier do `/operate`; consome o payload pronto, não re-minera. |

Controles de custo (doc [`09`](./09-modelos-custo.md)): a extração só reprocessa conversas com mensagem
nova (idempotência §3); cron fora de pico; cap de conversas por lote;
`signalsAnalyzed`/tokens logados para observabilidade.

---

## 8. Sequência de implementação (alinhada à FUNDAÇÃO)

BI é **Fase 4** ("transversais contínuos") na FUNDAÇÃO — depende de Functions
(doc [`08`](./08-backend-firebase-functions.md), disponível desde a Fase 1) e do
tier `DEEP` (doc [`09`](./09-modelos-custo.md)). Ordem interna sugerida, cada
passo entregável e honesto isolado:

1. **`core` puro primeiro** — `conversation-patterns-core.ts` +
   `lib/types/conversation-signals.ts` + testes determinísticos com `now`/
   fixtures (espelha `crm-insights-core`). Sem dependência de Function: testável
   com sinais sintéticos.
2. **Extração em Function** (`functions/extract-conversation-signals`) com
   prompt fechado + validação de evidência + idempotência; mesma HMAC/logging.
3. **Wrapper de fetch** `conversation-patterns.ts` + extensão do `case 'insights'`
   no read tool + `buildPatternObservations` + adendo ao prompt da Analista.
4. **Painel UI** `PadroesAtendimentoPanel` em Atendimentos + estados vazio/stale.
5. **Cron + botão "atualizar"** (agendamento e disparo sob demanda).

---

## 9. Trade-offs e riscos

- **Custo de LLM na extração.** Mitigado por: tier `DEEP` só em background,
  idempotência (não reprocessa conversa parada), janela `[-20:]`, cron fora de
  pico, reuso de `MessageContext.intent` quando já existe (§4.3). Risco residual:
  tenants com volume altíssimo de conversas — controlar por cap de lote e
  alarme de tokens (doc [`09`](./09-modelos-custo.md)).
- **Alucinação de padrão.** Mitigada por **três** barreiras independentes:
  vocabulário fechado (enum), `evidenceQuote` validado como substring real, e
  `minSupport`/`confidence` no agregador. A frase do dono é montada por código,
  não pelo LLM. É o ponto mais crítico — qualquer atalho aqui viola o Princípio 1.
- **Causalidade vs. correlação.** "Pediu pet → não fechou" é correlação. O doc
  exige confirmar a política do imóvel antes de afirmar causa; sem isso, a UI e a
  Analista usam linguagem de correlação ("pode estar relacionado"). Risco de o
  dono ler como causa — mitigar com microcópia explícita no painel.
- **Coleção derivada desatualizada.** `conversation_signals` é cache; pode ficar
  stale entre crons. Mitigado pela exibição honesta de `lastExtractedAt` e botão
  de atualização sob demanda. Nunca se finge "tempo real".
- **Junção lead↔conversa imperfeita.** Nem todo sinal resolve `leadId`
  (telefone não casado). Sinais sem lead entram nas contagens de demanda/objeção,
  mas **não** nas de conversão (que exigem desfecho real). Honesto: conversão
  fica `null` quando a amostra com desfecho é insuficiente.
- **PII nos trechos.** `evidenceQuote` contém texto do cliente. Storage
  tenant-scoped; logs com PII mascarado (§4.6); trechos exibidos só ao dono do
  tenant; nunca enviados a terceiros.
