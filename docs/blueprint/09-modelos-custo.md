# 09 — Estratégia de modelos de IA e custo

> Documento de implementação. Define **qual modelo roda em cada fluxo**, os
> **controles de custo** (cache, histórico limitado, escalonamento sob demanda,
> orçamento por tenant) e a **observabilidade** (LangSmith + token logging),
> mais uma **estimativa de custo por conversa** com as alavancas para baixá-lo.
>
> Ancorado no código real do agente (`agent/app/config.py`,
> `agent/app/graph/nodes.py`, `agent/app/observability.py`). Segue à risca a
> **FUNDAÇÃO** (`00-overview.md`): contratos transversais, nomes de coleções/estados,
> tiers `FAST`/`MAIN`/`DEEP` (§4.5), as 4 Decisões. Nada é renomeado aqui.
>
> **Este doc é a ÚNICA fonte de verdade do tier `DEEP` / `MODEL_DEEP`**: define o
> modelo, os guarda-corpos e a contabilidade de uso em runtime (`ai_usage`,
> rollup por período). Os outros docs apenas consomem/referenciam o `DEEP`. Os
> **limites** de orçamento (`config/ai-budget`: `monthlyLimitUsd`, `softLimitPct`,
> `modelDeep`) são propriedade do doc `11` (settings) — aqui só os consumimos.

---

## 0. TL;DR

- **Três tiers de modelo** (`FAST`, `MAIN`, `DEEP`), selecionados **por fluxo**, não por preferência. Já existe a base em `config.py` (`MODEL_FAST`/`MODEL_MAIN`); `DEEP` é o **único item novo** deste doc no agente.
- **Caminho síncrono do WhatsApp (`/process`, `/resume`) nunca usa `DEEP`.** Router sempre `FAST`. `DEEP` só roda **em background**, dentro do worker de `deferred_tasks` (docs `02`/`08`).
- **Custo controlado por quatro alavancas já presentes no código**: `max_tokens=1024`, histórico `[-20:]`, tools concorrentes (1 turno de executor), e logging de `total_tokens_in/out` por turno.
- **Novo neste doc**: tier `DEEP`, **prompt caching** (Anthropic/OpenAI), **orçamento por tenant** (`tenants/{tenantId}/ai_budget`) com kill-switch que cai para `MANUAL`, e **export de custo para LangSmith + Firestore** (`ai_usage`).
- **Estimativa**: uma conversa típica de captação (Sofia, ~6 turnos, sem task pesada) custa **~US$ 0,003–0,01** em `gpt-4o-mini`. Uma `property_research` com `DEEP` adiciona **~US$ 0,02–0,08** por execução. Detalhe em §7.

---

## 1. O que já existe vs o que é novo

| Item | Estado | Onde |
|---|---|---|
| Tiers `FAST`/`MAIN` (env-driven) | **Existe** | `config.py` → `model_fast`, `model_main` |
| Seleção por nó (`_llm(fast=...)`) | **Existe** | `nodes.py` → `_llm`, `_get_llm` (LLM cacheado por `lru_cache`) |
| Provider OpenAI **ou** Anthropic | **Existe** | `config.py` → `llm_provider`; `nodes.py` → `_get_llm` |
| `max_tokens=1024`, `temperature=0.7`, `timeout` | **Existe** | `nodes.py` → `_get_llm` |
| Token logging por turno (`total_tokens_in/out`) | **Existe** | `nodes.py` (todos os nós somam `usage_metadata`) |
| Tools em paralelo (1 rodada de executor) | **Existe** | `nodes.py` → `executor_node` (`asyncio.gather`) |
| LangSmith opcional + redação de PII | **Existe** | `observability.py` → `enable_langsmith_if_configured`, `redact_pii` |
| `AGENT_MAX_ITERATIONS=8` (corta loop planner⇄executor) | **Existe** | `config.py` → `agent_max_iterations` |
| **Tier `DEEP`** (modelo de raciocínio forte, só background) | **NOVO** | `config.py` (env `MODEL_DEEP`); usado no worker, não em `/process` |
| **Prompt caching** (system prompt + tool schemas) | **NOVO** | `nodes.py` `_get_llm`; só altera flags do client |
| **Persistência de custo** (`ai_usage` por turno) | **NOVO** | locai `/api/agent/tools/...` ou Function; gravado no resume/process |
| **Orçamento por tenant** + kill-switch | **NOVO** | Firestore `tenants/{tenantId}/ai_budget`; checado antes de invocar LLM |
| **Export de custo p/ LangSmith metadata** | **NOVO** | tags/metadata por `tenantId`+`conversationId` |

> Princípio FUNDAÇÃO §4.5: **nunca usar tier acima do necessário**; router sempre
> `FAST`; `DEEP` jamais no caminho síncrono; `max_tokens≤1024`; histórico `[-20:]`;
> logar `total_tokens_in/out`. Este doc apenas **operacionaliza** essa regra.

---

## 2. Modelo por fluxo

Mapeamento canônico fluxo → nó do grafo → tier. Os nomes de nós existem em
`nodes.py`; os fluxos novos (`/resume`, worker) vêm de docs `02`/`08`.

| Fluxo | Nó / contexto | Tier | Modelo concreto (default) | Caminho | Por quê |
|---|---|---|---|---|---|
| Classificação de intenção | `router_node` | **FAST** | `gpt-4o-mini` | síncrono | ~15 tokens out; só escolhe rota |
| Classificações / slots de contrato | helper (doc `08`) | **FAST** | `gpt-4o-mini` | síncrono/bg | preenchimento determinístico de slots |
| Conversa Sofia (planner) | `planner_node` | **MAIN** | `gpt-4o-mini` | síncrono | humanizada, decide tool calls |
| Re-engajamento pós-task (`/resume`) | `planner_node` via `/resume` | **MAIN** | `gpt-4o-mini` | síncrono curto | redige a volta ao cliente |
| Console operador / Analista | `make_operator_planner_node` | **MAIN** | `gpt-4o-mini` | síncrono (dono) | read-only, perguntas do dono |
| `property_research` (task pesada) | worker `deferred_tasks` | **DEEP** | (configurável — ver §3) | **background** | filtra/raciocina sobre muitos imóveis |
| Análise de funil sob pedido | worker / Analista profunda | **DEEP** | (configurável) | **background** | raciocínio forte sobre BI (doc `07`) |

**Regras duras (não negociáveis):**
1. `router_node` **sempre** `FAST`. Nunca `bind_tools`, nunca histórico longo (já usa só a última `HumanMessage`, truncada a 500 chars — ver `nodes.py:60-68`).
2. `/process` e `/resume` (caminho do cliente no WhatsApp) **só** podem usar `FAST` e `MAIN`. **Proibido `DEEP`** — ele estoura latência e custo no caminho onde o cliente espera resposta.
3. `DEEP` **só** é instanciado dentro do worker de `deferred_tasks` (estado `IA_TRABALHANDO`), onde o cliente já recebeu o `client_message` ("espera um segundinho…") e não há SLA de latência conversacional.

### 2.1 Diagrama de sequência — onde cada tier roda

```
Cliente (WhatsApp)
   │  "tem algo perto da praia, pet friendly?"
   ▼
/process (FastAPI agente)            ── HMAC ts.body, janela 60s
   │
   ├─ router_node            [FAST]  ── intent = "property_inquiry"
   │
   ├─ planner_node           [MAIN]  ── decide tool calls (search_available_properties)
   │      │
   │      ▼
   │   executor_node                 ── chama tools em paralelo (asyncio.gather)
   │      │                             (sem LLM — só HTTP p/ locai)
   │      ▼
   │   planner_node          [MAIN]  ── redige resposta final
   │
   ▼  final_response  ──▶ outbound (/api/v1/messages/{tenantId}/send)

——— se o planner decide DEFERIR (task pesada) ———

   planner_node              [MAIN]  ── chama tool defer_and_work
   │  envia client_message AGORA, estado → IA_TRABALHANDO
   ▼
deferred_tasks (queued)  ─enfileira─▶ Firebase Function worker (Cloud Tasks)
                                          │
                                          ├─ property_research      [DEEP]  ── background, timeout 120s
                                          │     (raciocínio forte sobre imóveis)
                                          ▼
                                       grava result, status:done
                                          │
                                          ▼ chama /resume (HMAC, idempotente por taskId)
   /resume (FastAPI agente)
   │
   ├─ planner_node           [MAIN]  ── monta histórico + bloco de sistema c/ result
   ▼  final_response  ──▶ outbound  ── re-engaja o cliente; IA_TRABALHANDO → ATIVA
```

**Leitura de custo do diagrama:** o turno síncrono usa no máximo `FAST`×1 (router)
+ `MAIN`×(1..N) (planner, N limitado por `AGENT_MAX_ITERATIONS=8`). `DEEP` fica
isolado no ramo de background, cobrado **uma vez por task**, fora do orçamento de
latência do cliente.

---

## 3. O tier `DEEP` (novo) — definição e guarda-corpos

`DEEP` é o único modelo novo introduzido por este doc. É o tier de **raciocínio
forte**, usado **exclusivamente em background**.

### 3.1 Configuração (`config.py`)

Adicionar a `Settings` (espelhando o padrão de `model_fast`/`model_main`):

```python
# 3-tier model selection (DEEP é só para background — nunca no caminho síncrono)
model_deep: str = Field("gpt-4o", alias="MODEL_DEEP")
deep_max_tokens: int = Field(2048, alias="DEEP_MAX_TOKENS")
deep_timeout_s: int = Field(120, alias="DEEP_TIMEOUT_S")  # casa com timeout de property_research
```

Modelos concretos sugeridos por provider (escolha do operador via env; **defaults
conservadores**):

| Provider | `MODEL_FAST` | `MODEL_MAIN` | `MODEL_DEEP` |
|---|---|---|---|
| OpenAI (default) | `gpt-4o-mini` | `gpt-4o-mini` | `gpt-4o` (ou `o4-mini` p/ raciocínio mais barato) |
| Anthropic | `claude-haiku` (classe Haiku) | `claude-haiku` | `claude-sonnet` (classe Sonnet) |

> Os defaults de `FAST`/`MAIN` permanecem `gpt-4o-mini` (como já em `config.py:37-38`).
> `DEEP` cai para `gpt-4o` apenas quando configurado e **somente** no worker.

### 3.2 Fábrica de LLM para `DEEP` (`nodes.py`)

`DEEP` **não** é exposto via `_llm(fast=...)` (que só conhece `FAST`/`MAIN`),
justamente para tornar **impossível** chamá-lo por engano no caminho síncrono.
Adicionar uma função explícita, separada, usada só pelo worker:

```python
def _deep_llm():
    """LLM de raciocínio forte. SÓ para background (worker de deferred_tasks).
    NÃO chamar em router_node/planner_node do /process ou /resume."""
    s = get_settings()
    api_key = s.anthropic_api_key if s.llm_provider == "anthropic" else s.openai_api_key
    # reusa o _get_llm cacheado; max_tokens maior é aplicado no factory
    return _get_llm(s.llm_provider, s.model_deep, api_key, fast=False)
```

`_get_llm` (já cacheado por `lru_cache`, ver `nodes.py:23`) ganha um parâmetro de
`max_tokens` para o caso `DEEP` (≤ `deep_max_tokens`); para `FAST`/`MAIN`
permanece `1024`.

**Trade-off:** manter `DEEP` fora de `_llm()` é redundância de design proposital —
custa uma função a mais, mas garante por construção a regra §4.5 ("`DEEP` jamais
síncrono"). Risco se ignorado: um dev liga `DEEP` no planner e estoura custo +
latência no WhatsApp.

---

## 4. Controles de custo

Seis controles. Os quatro primeiros **já existem** no código; os dois últimos são novos.

### 4.1 `max_tokens` curto — EXISTE

`_get_llm` fixa `max_tokens=1024` (`nodes.py:35,44`). Output é a metade mais cara
do token billing; capar a saída é a alavanca de maior efeito por linha de código.
Mantido em `FAST`/`MAIN`. `DEEP` usa `deep_max_tokens` (default 2048), porque a
task pesada precisa de mais espaço — mas só em background.

### 4.2 Histórico limitado `[-20:]` — EXISTE (a reforçar)

O planner recebe `system_msg + history` (`nodes.py:94`). A FUNDAÇÃO §4.5 fixa
**histórico `[-20:]`**. A montagem do histórico vem do orquestrador locai
(reconstrução do Firestore a cada turno) e do `/resume`. **Regra de implementação:**
ao montar `state["messages"]`, truncar para as **últimas 20 mensagens** antes de
chamar o grafo. Isso limita o crescimento linear do custo de input ao longo de
conversas longas.

> Sem prompt caching, cada turno reenvia o histórico inteiro → custo cresce
> O(n²) na conversa. Truncar a 20 transforma em custo ~constante por turno.

### 4.3 Tools concorrentes / 1 rodada de executor — EXISTE

`executor_node` roda todas as `tool_calls` do turno em paralelo
(`asyncio.gather`, `nodes.py:207`). Tools são **HTTP, não LLM** — não custam
tokens. O custo está no ida-e-volta planner→executor→planner; `AGENT_MAX_ITERATIONS=8`
(`config.py:50`) corta o loop. **Recomendação:** baixar o teto para **4** no
caminho síncrono (`/process`/`/resume`) — empiricamente 2–3 rodadas resolvem a
maioria dos turnos de captação; 8 só é necessário em fluxos de operador. Tornar
configurável por modo.

### 4.4 Escalonamento sob demanda (`defer_and_work` → `DEEP`) — base EXISTE, DEEP NOVO

O escalonamento de tier **não** acontece dentro de um turno: acontece **deferindo**.
Quando o planner (`MAIN`) percebe que a pergunta exige raciocínio pesado (filtrar
dezenas de imóveis, cruzar funil), ele **não** chama `DEEP` no turno — ele chama a
tool `defer_and_work` (doc `01`), que:
1. envia o `client_message` agora ("vou pesquisar pra você");
2. move estado → `IA_TRABALHANDO`;
3. cria `deferred_tasks/{taskId}` (`status:queued`) e enfileira;
4. encerra o turno **sem segunda resposta**.

O worker então roda `DEEP` em background e chama `/resume` (que volta a `MAIN`).
Resultado: o cliente nunca paga `DEEP` na latência, e `DEEP` só roda quando
**realmente** necessário — escalonamento *sob demanda*, dirigido pelo `task_type`.

```
task_type            → tier no worker
property_research    → DEEP   (raciocínio sobre catálogo)
closing_prep         → MAIN   (montagem determinística; sem raciocínio caro)
ask_owner            → (sem LLM no worker — só roteia ao dono, doc 06)
other                → MAIN   (default seguro)
```

### 4.5 Prompt caching — NOVO

System prompt (Sofia/Analista) e schemas das 9 tools são grandes e **idênticos
turno a turno**. Ativar prompt caching reduz o custo de input desses blocos
estáveis em ~90% nos hits.

- **OpenAI**: caching automático para prefixos ≥1024 tokens (sem mudança de
  código além de manter o **system prompt e os tool schemas no início**, o que
  `nodes.py` já faz — `[system_msg] + history`).
- **Anthropic**: requer marcar blocos com `cache_control`. Em `_get_llm`, ao
  construir `ChatAnthropic`, passar os blocos de sistema/tools como *ephemeral
  cached*. **Trade-off:** escrita no cache custa ~25% a mais no 1º hit; só
  compensa se o mesmo prefixo repete (sempre repete numa conversa).

**Pré-requisito de eficácia:** o prefixo precisa ser estável. `PLANNER_SYSTEM`
injeta `{TODAY}` (`nodes.py:90-91`) — isso **quebra o cache uma vez por dia**, o
que é aceitável. Não injetar dados voláteis (nome do cliente, hora) no system
prompt; mantê-los no histórico/mensagem.

### 4.6 Orçamento por tenant + kill-switch — NOVO

Cada tenant tem teto de gasto de IA. Honra o princípio FUNDAÇÃO §3 ("custo sob
controle") e o de honestidade (sem dado → flag, nunca fabricar).

> **Divisão de propriedade (PIN 3):** os **limites** configurados
> (`tenants/{tenantId}/config/ai-budget`: `monthlyLimitUsd`, `softLimitPct`,
> `modelDeep`) são DONO do doc `11` (settings) — aqui apenas os lemos. A
> **contabilidade em runtime** (acumulado/rollup por período, `ai_usage`)
> é definida AQUI (doc `09`). O kill-switch de custo cai para `MANUAL`
> (já consta em `00` §4.1).

**Modelo de dados (rollup de runtime)** — `tenants/{tenantId}/ai_budget/{period}`
(camelCase, sob o namespace do tenant; o acumulado é deste doc, os limites vêm de
`config/ai-budget` no doc `11`):

```
ai_budget/{period}                       # period = "2026-05" (YYYY-MM)
  tenantId
  period                                 # mês corrente
  monthlyLimitUsd        number          # espelha o limite de config/ai-budget (doc 11)
  spentUsd               number          # acumulado no mês (incrementado por turno)
  spentTokensIn          number
  spentTokensOut         number
  softLimitPct           number  (0.8)   # alerta ao dono
  hardLimitReached       boolean         # true => kill-switch ativo
  deepCallsCount         number          # nº de tasks DEEP no mês (mais caras)
  updatedAt
```

**Enforcement (ordem):**
1. **Antes** de qualquer invocação de LLM no `/process`/`/resume`, ler
   `ai_budget` (cache quente possível no Redis `ai_budget:{tenantId}` com TTL curto).
2. Se `spentUsd ≥ softLimit` (`monthlyLimitUsd * softLimitPct`): emite alerta ao
   dono (reusa `notify_owner` + canal IA↔Dono do doc `06`), mas **segue atendendo**.
3. Se `spentUsd ≥ monthlyLimitUsd` (`hardLimitReached=true`): **kill-switch** —
   a conversa entra em **`MANUAL`** via `setConversationState()` (doc `01`), que
   escreve `ai_blocked:{tenant}:{phone}` (compat) + Firestore. A IA para de
   responder; o dono é alertado para assumir. Não há degradação silenciosa nem
   resposta fabricada. `DEEP` é bloqueado primeiro (mais caro), antes do síncrono.

> **Trade-off:** kill-switch hard pode interromper atendimento ativo. Mitigação:
> `softLimitPct=0.8` dá margem; o alerta ao dono permite recarregar/aumentar o
> teto antes do hard limit. Default conservador + override por tenant é exposto em
> settings (doc `11`).

---

## 5. Observabilidade

### 5.1 LangSmith — EXISTE (a enriquecer)

`observability.py` já liga LangSmith condicionalmente
(`enable_langsmith_if_configured`) e redige PII antes de traçar (`redact_pii`,
padrões para CPF/CNPJ/CEP/telefone/email/JWT). Projeto nomeado por ambiente:
`locai-agent-{dev|prod}` (`langsmith_project_name`). `REDACT_PII_IN_TRACES`
default `True` (`config.py:57`).

**Novo — metadata/tags por execução** para fatiar custo por tenant e conversa:
ao iniciar `run_agent`/`run_operator`/`/resume`, anexar à run LangSmith:
- `tenant_id` (tag) — fatiar custo/latência por cliente;
- `conversation_id` = `{tenantId}:{normalizedPhone}` (FUNDAÇÃO §4.6) (metadata);
- `flow` = `process|resume|operate` e `task_type` quando background;
- `tier` por nó (`fast|main|deep`).

> **Risco/cuidado:** `conversation_id` contém telefone. Como tag/metadata ele
> escapa do `redact_pii` que age sobre **texto** de mensagens, não sobre
> metadata. Mitigação: usar **`tenantId:{hash(normalizedPhone)}`** como tag de
> agrupamento quando `REDACT_PII_IN_TRACES=true`, mantendo o `conversationId`
> real só no Firestore (`ai_usage`).

### 5.2 Token logging por turno — EXISTE

Todos os nós somam `usage_metadata` em `total_tokens_in`/`total_tokens_out`
(`nodes.py:76-77,111-112,154-155`) e registram `node_traces` com `latency_ms`.
Isso é a fonte de verdade de uso por turno. **Nada a inventar** — apenas exportar.

### 5.3 Persistência de custo (`ai_usage`) — NOVO

Para BI de custo (doc `07`) e enforcement de orçamento, persistir o uso ao fim de
cada turno. O agente já tem `total_tokens_in/out` no `AgentState`; ao retornar de
`/process`/`/resume`/`/operate`, fazer **um** write idempotente:

`tenants/{tenantId}/ai_usage/{usageId}` (camelCase):

```
usageId                       # = conversationId:turnTimestamp ou taskId (idempotência)
tenantId
conversationId                # {tenantId}:{normalizedPhone}
flow                          # process | resume | operate
taskType?                     # quando background (property_research...)
tier                          # fast | main | deep (tier dominante do turno)
model                         # nome concreto resolvido (gpt-4o-mini, gpt-4o, ...)
tokensIn / tokensOut
estimatedCostUsd              # tokensIn*priceIn + tokensOut*priceOut (tabela §7)
nodeTraces                    # latências por nó (debug)
createdAt
```

Esse write **incrementa** `ai_budget.spentUsd` (transação atômica, idempotente
por `usageId`). Tabela de preços vive em config (versionada) — quando dado de
preço não existir para um modelo, gravar `estimatedCostUsd:null` +
`costDataAvailable:false` (princípio de honestidade FUNDAÇÃO §1; espelha
`crm-insights-core`). **Onde vive:** preferencialmente Firebase Function
(Decisão 2 — pesado/assíncrono primeiro), com a mesma HMAC e `logger` PII-mascarado.

### 5.4 Alertas

- **Custo por conversa anômalo** (> N× mediana): alerta ao dono (doc `06`).
- **`deepCallsCount` acima do esperado**: pode indicar planner deferindo demais →
  rever heurística de `defer_and_work` (doc `01`).
- **Soft/hard budget**: §4.6.

---

## 6. Modelo de dados (resumo deste doc)

Tudo sob `tenants/{tenantId}/`, camelCase, sem renomear nada da FUNDAÇÃO. Estas
duas coleções são **novas e específicas deste doc**; **adicionam**, não substituem:

| Coleção | Doc dono | Papel |
|---|---|---|
| `ai_usage/{usageId}` | **09 (este)** | uso/custo por turno; fonte do BI de custo |
| `ai_budget/{period}` | **09 (este)** | teto mensal + acumulado + kill-switch por tenant |
| `deferred_tasks/{taskId}` | 02/08 | task pesada (onde `DEEP` roda); referenciada, não duplicada |
| `conversations/{id}.state` | 01 | kill-switch escreve `MANUAL` aqui (via `setConversationState`) |

Redis (cache quente, TTL): `ai_budget:{tenantId}` (orçamento), reusa
`ai_blocked:{tenant}:{phone}` (kill-switch → `MANUAL`).

---

## 7. Estimativa de custo por conversa e alavancas

Premissas (preços de referência `gpt-4o-mini`; ajustáveis na tabela versionada
de §5.3 — números **estimados**, não faturados):

- `gpt-4o-mini`: input ~US$0,15 / 1M tok; output ~US$0,60 / 1M tok.
- `gpt-4o` (tier `DEEP`): input ~US$2,50 / 1M tok; output ~US$10,00 / 1M tok.
- `max_tokens=1024` por chamada síncrona; histórico `[-20:]`; system+tools ~1,5k tok.

### 7.1 Conversa de captação típica (Sofia, sem task pesada)

~6 turnos do cliente. Por turno: router (`FAST`, ~1,6k in / ~15 out) + planner
(`MAIN`, ~2k in / ~300 out médio), eventualmente +1 rodada planner pós-tool.

| Item | Tokens in (6 turnos) | Tokens out | Custo est. |
|---|---|---|---|
| Router (FAST) ×6 | ~9.600 | ~90 | ~US$0,0015 |
| Planner (MAIN) ×~9 | ~18.000 | ~2.700 | ~US$0,0043 |
| **Total conversa** | ~27.600 | ~2.790 | **~US$0,006** |

Faixa realista por conversa de captação: **US$0,003–0,01**, dominada pelo input
do planner. **Com prompt caching** ativo (system+tools cacheados), o input cai
~40–60% → faixa **US$0,002–0,006**.

### 7.2 Adicional por task pesada (`property_research`, `DEEP`)

Uma execução: ~6k in (catálogo resumido + instrução) / ~1,5k out em `gpt-4o`.
Custo ≈ `6.000*2,5/1e6 + 1.500*10/1e6` ≈ **US$0,030** por task. Faixa
**US$0,02–0,08** conforme tamanho do catálogo. Como `DEEP` é deferido e raro
(uma por intenção de pesquisa profunda), o impacto por conversa fechada é baixo.

### 7.3 Alavancas (ordenadas por impacto/esforço)

1. **Manter `DEEP` fora do síncrono** (já é regra; maior impacto): cada chamada
   `DEEP` evitada no caminho do cliente economiza ~10–20× vs `gpt-4o-mini`.
2. **Histórico `[-20:]`** (§4.2): impede crescimento O(n²) do input; alto impacto
   em conversas longas, custo de implementação trivial.
3. **Prompt caching** (§4.5): -40–60% no input do planner; baixo esforço.
4. **`max_tokens` curto** (já 1024): controla a metade cara do billing.
5. **Baixar `AGENT_MAX_ITERATIONS` no síncrono p/ ~4** (§4.3): corta rodadas
   planner→tool→planner desnecessárias.
6. **`DEEP` mais barato** (`o4-mini` em vez de `gpt-4o`): se o raciocínio couber,
   reduz o adicional de §7.2 substancialmente; configurável por env.
7. **Orçamento por tenant** (§4.6): teto duro evita cauda de custo de tenants
   abusivos ou loops; protege a margem do take-rate (~1%, Decisão 1).

---

## 8. Trade-offs e riscos (consolidado)

- **`DEEP` em background = latência maior para o cliente.** Mitigado pelo
  `defer_and_work`: o cliente recebe "espera um segundinho" imediatamente
  (`MAIN`), e o resultado chega via `/resume`. Risco: se o worker falhar/timeout
  (120s), precisa de fallback ao dono (`AGUARDANDO_HUMANO`, docs `01`/`06`).
- **Prompt caching depende de prefixo estável.** `{TODAY}` invalida 1×/dia (ok).
  Risco: injetar dados voláteis no system prompt zera o ganho — proibido.
- **Kill-switch hard interrompe atendimento.** Mitigado por soft-limit + alerta ao
  dono. Exposto em settings (doc `11`): default conservador + override por tenant.
- **PII em tags LangSmith.** `redact_pii` cobre texto, não metadata; usar
  `conversationId` hasheado como tag quando `REDACT_PII_IN_TRACES=true`.
- **Estimativa ≠ fatura.** Tabela de preços é versionada e pode defasar;
  reconciliar periodicamente com o billing real do provider. Sem preço para um
  modelo → `costDataAvailable:false` (honestidade), nunca chutar número.
- **Troca de provider (OpenAI↔Anthropic).** `_get_llm` já abstrai; cuidar que a
  semântica de prompt caching e os nomes de modelo (`MODEL_FAST/MAIN/DEEP`)
  sejam reconfigurados por env — sem hardcode.

---

## 9. Checklist de implementação

- [ ] `config.py`: adicionar `model_deep`/`deep_max_tokens`/`deep_timeout_s` + tabela de preços versionada.
- [ ] `nodes.py`: `_deep_llm()` separado (nunca em `_llm`); `_get_llm` aceita `max_tokens` por tier.
- [ ] `nodes.py`/orquestrador: truncar histórico a `[-20:]` antes do grafo.
- [ ] Prompt caching: OpenAI (manter prefixo estável) + Anthropic (`cache_control` nos blocos de sistema/tools).
- [ ] Worker `deferred_tasks` (doc `08`): usar `_deep_llm()` só p/ `property_research`/análise de funil.
- [ ] `observability.py`/runners: tags+metadata (`tenantId` hash, `flow`, `tier`, `task_type`) nas runs LangSmith.
- [ ] Persistência `ai_usage/{usageId}` (idempotente) + incremento atômico de `ai_budget.spentUsd`.
- [ ] `ai_budget`: leitura antes da invocação; soft-limit → alerta dono; hard-limit → `MANUAL` via `setConversationState()`.
- [ ] Settings (doc `11`): expor `config/ai-budget` (`monthlyLimitUsd`, `softLimitPct`, escolha de `MODEL_DEEP`/`modelDeep`).
- [ ] **RECOMENDAÇÃO:** baixar `AGENT_MAX_ITERATIONS` p/ ~4 no caminho síncrono (configurável por modo).
