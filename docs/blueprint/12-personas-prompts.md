# 12 — Personas e prompts (Sofia + Analista)

> Documento de implementação. Ancorado no código real do repo
> (`agent/app/graph/prompts.py`, `agent/app/tools/registry.py`) e na FUNDAÇÃO
> (`docs/blueprint/00-overview.md`). Nada aqui renomeia coleções, estados ou
> contratos transversais — apenas evolui os **system prompts** das duas personas
> existentes para suportar a máquina de estados e o protocolo defer/resume
> (`01`), o canal IA↔Dono (`06`) e as modalidades de fechamento (`02`).

---

## 1. Escopo e o que já existe

Hoje há **duas personas** vivendo em `agent/app/graph/prompts.py`, ambas
chamadas "Sofia" mas com papéis distintos:

| Constante (arquivo `prompts.py`) | Persona | Onde roda | Endpoint |
|---|---|---|---|
| `PLANNER_SYSTEM` | **Sofia (cliente)** | grafo `router → planner ⇄ executor` | `/process` |
| `OPERATOR_ANALISTA_SYSTEM` | **Analista (dono, read-only)** | console do operador | `/operate` (modo `analista`) |
| `OPERATOR_OPERADOR_SYSTEM` | **Analista (dono, pode agir)** | console do operador | `/operate` (modo `operador`) |
| `_OPERATOR_BASE` | base compartilhada das duas Analistas | — | — |
| `ROUTER_SYSTEM` | classificador de intenção (1 palavra) | nó `router` | `/process` |

As duas últimas constantes da Analista são `_OPERATOR_BASE` + um sufixo de modo.
A Sofia cliente é um único bloco grande de regras.

**Regras inegociáveis da Sofia que JÁ existem e NÃO mudam** (vêm de
`PLANNER_SYSTEM`, seções "COMO VOCÊ ESCREVE" / "REGRA ABSOLUTA"):

1. Mensagens **curtas** (1–3 frases), **uma ideia/pergunta por mensagem**.
2. **Nunca** bullets, numeração, tabelas, links/URLs no texto.
3. **Nunca inventa** imóvel, preço, endereço ou característica — só fala do que
   `search_available_properties` retornou (Princípio 1 da FUNDAÇÃO — honestidade
   de dados).
4. **Não fecha reserva, não cobra, não negocia desconto** — passa pro humano via
   `notify_owner`.
5. Honestidade sobre ser IA quando perguntada; emojis ~zero.

A Analista também já carrega o **Princípio de honestidade** ("nunca fabricar
número; `null`/`costDataAvailable:false`"), idêntico ao que está em
`crm-insights-core.ts`.

**Este documento é majoritariamente "novo conteúdo de prompt sobre infraestrutura
nova", não reescrita.** As regras acima são preservadas verbatim em espírito; o
que muda é a adição de **três blocos de capacidade** na Sofia e **um bloco de
proatividade conversacional** na Analista, mais o roteamento condicional de
prompt em função do `ConversationState`.

---

## 2. O que muda e por quê (mapa de alto nível)

| Capacidade nova | Persona | Prompt afetado | Infra que sustenta (doc) |
|---|---|---|---|
| Defer "espera um segundinho" + re-engajar | Sofia | `PLANNER_SYSTEM` + novo `RESUME_SYSTEM_BLOCK` | `01` (tool `defer_and_work`, `/resume`) |
| Fechamento condicional ao modo (IA vs Dono) | Sofia | `PLANNER_SYSTEM` (bloco `FECHAMENTO`) | `02` (`closingMode`), `01` (estado `FECHAMENTO`) |
| Chamar o dono e bufferizar | Sofia | `PLANNER_SYSTEM` (estado `AGUARDANDO_HUMANO`/`IA_TRABALHANDO`) | `06`, `01` |
| Analista proativa/consultiva (re-ping, alertas IA→Dono) | Analista | `_OPERATOR_BASE` + novo `OWNER_PROACTIVE_BLOCK` | `06` |
| Prompt varia com o estado da conversa | ambas | montagem dinâmica do system | `01` |

Princípio que guia tudo: **Copiloto > autônomo** (Princípio 2). A Sofia ficou
mais capaz (pode parar, trabalhar em background, re-engajar), mas as travas de
fechamento e de honestidade ficaram **mais explícitas**, não mais frouxas.

---

## 3. Sofia cliente — evolução do `PLANNER_SYSTEM`

### 3.1 Carisma: o que reforçar (sem reescrever)

A Sofia já é "calorosa, simpática, cheia de energia boa". A evolução é tornar o
carisma **resiliente sob latência**: quando ela diz "espera um segundinho" e
some por 30–120s, o re-engajamento tem que soar como a mesma pessoa voltando
animada, não como um bot disparando uma notificação. Reforços de tom (adições
pequenas à seção "COMO VOCÊ ESCREVE"):

- Ao voltar de uma espera, **retome o fio**: cite o que prometeu ("voltei! achei
  uma opção que combina com o que você queria"). Nunca recomece do zero como se
  não tivesse conversado.
- Continue **curta**: o re-engajamento também é 1–3 frases. A regra de tamanho
  vale igual fora do turno reativo.
- O carisma **não** justifica inventar urgência ou condição. Animação sim,
  promessa não.

Essas frases entram como 3 bullets adicionais dentro da seção existente — não há
nova seção de "personalidade".

### 3.2 Capacidade nova: defer ("espera um segundinho")

Hoje a Sofia é **stateless e reativa**: 1 mensagem do cliente → 1 resposta. O gap
(palavras do fundador) é poder dizer *"Show, espera um segundinho que vou
pesquisar pra você"*, **parar de responder**, rodar uma task em background e
**re-engajar** quando concluir.

Isso se materializa em **uma tool nova** (`defer_and_work`, definida na FUNDAÇÃO
§4.2 e no doc `01`) e em **um bloco de prompt** que ensina a Sofia *quando* e
*como* usá-la.

#### Assinatura da tool (a ser adicionada em `registry.py`)

A tool segue o mesmo formato dos outros itens de `TOOLS` em `registry.py`
(OpenAI function-calling schema). **Não** é read-only (muta estado para
`IA_TRABALHANDO` e cria `deferred_tasks`), então **não** entra em
`READ_ONLY_TOOL_NAMES`:

```python
{
    "type": "function",
    "function": {
        "name": "defer_and_work",
        "description": (
            "Use quando precisar de um tempinho para fazer algo demorado antes "
            "de responder de verdade: pesquisar a melhor opção de imóvel com mais "
            "calma, ou confirmar uma informação com o time humano da imobiliária. "
            "Você manda AGORA uma frase curta avisando que vai dar uma olhada "
            "('show, me dá um segundinho que já te respondo'), e PARA de falar. "
            "O trabalho roda em segundo plano e, quando terminar, você volta "
            "sozinha para continuar a conversa. NUNCA use isso para coisas que "
            "você já consegue responder na hora."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "client_message": {
                    "type": "string",
                    "description": (
                        "A frase curta e simpática que será enviada AGORA ao "
                        "cliente avisando que você vai dar uma olhada. 1 frase."
                    ),
                },
                "task_type": {
                    "type": "string",
                    "enum": ["property_research", "ask_owner", "closing_prep", "other"],
                    "description": (
                        "property_research = pesquisar a melhor opção; "
                        "ask_owner = confirmar algo com o dono/humano; "
                        "closing_prep = preparar fechamento; other = caso geral."
                    ),
                },
                "task_payload": {
                    "type": "object",
                    "description": "Dados estruturados da tarefa (critérios da busca, a pergunta ao dono, etc).",
                },
                "resume_hint": {
                    "type": "string",
                    "description": "Lembrete curto do que você deve fazer ao voltar (opcional).",
                },
            },
            "required": ["client_message", "task_type", "task_payload"],
        },
    },
}
```

Mapeamento `snake_case` → `kebab-case` em `client.py _TOOL_PATHS`:
`defer_and_work` → `defer-task` (FUNDAÇÃO §4.2 / §4.6).

#### Bloco de prompt novo (adicionado ao `PLANNER_SYSTEM`)

```
QUANDO VOCÊ PRECISA DE UM TEMPINHO (defer_and_work):
- Às vezes a melhor resposta exige um trabalho que leva alguns segundos: garimpar
  a opção perfeita com calma, ou confirmar uma informação que só o time humano
  sabe. Nesses casos use `defer_and_work`.
- Como funciona: você escreve uma frase curtinha avisando que vai dar uma olhada
  ("show, me dá um segundinho que já volto com isso"), e ENCERRA o turno. Não
  escreva mais nada depois — você vai voltar sozinha quando terminar.
- Use `property_research` quando o cliente pede a melhor opção / uma comparação
  mais cuidadosa e a busca simples não basta. Use `ask_owner` quando só o dono
  sabe a resposta (uma exceção de política, uma condição específica do imóvel).
- NÃO use defer para o que você já resolve na hora (uma busca normal, mandar
  fotos, responder uma dúvida simples). Defer é exceção, não o padrão.
- Enquanto você trabalha, o cliente pode mandar mais mensagens — você só vai lê-las
  quando voltar. Por isso a frase de espera tem que deixar claro que você JÁ vai
  voltar, pra ele não se sentir no vácuo.
```

#### Bloco de prompt novo (system injetado no `/resume`)

Quando a task conclui, o worker chama `/resume` (FUNDAÇÃO §4.2). O `/resume`
"monta estado + histórico + bloco de sistema com `result`". Esse **bloco de
sistema** é o `RESUME_SYSTEM_BLOCK` — um system message **adicional**, anexado
ao `PLANNER_SYSTEM`, presente **só** no turno de re-engajamento:

```python
RESUME_SYSTEM_BLOCK = """VOCÊ ESTÁ VOLTANDO DE UMA ESPERA.
Você havia avisado o cliente que ia dar uma olhada em algo. O trabalho terminou e
o resultado está abaixo. Sua tarefa AGORA é re-engajar: mande uma mensagem que
retoma o fio naturalmente, como alguém que voltou animada com a resposta.
- Curta (1 a 3 frases), no seu jeito de sempre. Sem bullets, sem links.
- Use SOMENTE o que está no resultado abaixo. Se o resultado disser que não achou
  nada / o dono não respondeu, seja honesta sobre isso de forma leve — NÃO invente.
- Se havia mensagens do cliente que chegaram enquanto você trabalhava, elas estão
  no histórico; responda também ao que ele perguntou nelas.

RESULTADO DO TRABALHO ({TASK_TYPE}):
{RESULT}
"""
```

Notas de implementação:

- `{TASK_TYPE}` e `{RESULT}` são preenchidos pelo `/resume` a partir do body
  `{tenant_id, conversation_id, task_id, task_type, result, resume_hint}`.
- O `resume_hint` (se houver) é concatenado como uma linha extra ("Lembrete:
  {resume_hint}").
- O `/resume` roda **o mesmo grafo** do `/process` (FUNDAÇÃO §4.2). A diferença é
  só o system extra e o fato de o turno **não** ter uma mensagem `user` nova — o
  gatilho é a conclusão da task. O `ROUTER_SYSTEM` continua valendo se houver
  mensagens bufferizadas do cliente; se não houver, o re-engajamento pode pular
  direto ao planner (decisão de grafo, doc `01` — aqui só fixamos o prompt).

#### Tier de modelo

- O re-engajamento conversacional (planner no `/resume`) usa **`MAIN`**
  (`gpt-4o-mini`) — FUNDAÇÃO §4.5 ("planner conversacional Sofia +
  re-engajamento").
- O **trabalho pesado** da task (`property_research`) roda no **worker da
  Function** com o tier **`DEEP`** (definido no doc `09`) — **nunca** no
  caminho síncrono do WhatsApp. O prompt da Sofia **não** invoca `DEEP`; o worker
  é quem usa. A Sofia só consome o `RESULT`.

### 3.3 Capacidade nova: fechamento condicional ao modo

O fechamento agora tem **duas modalidades** escolhidas em settings
(`closingMode` em `conversations/{id}`, valores `'ia' | 'owner' | null` —
FUNDAÇÃO §4.3; detalhe operacional no doc `02`). A Sofia precisa se comportar
diferente conforme o modo, **mas em nenhum dos dois ela cobra dinheiro ou fecha
sozinha sem autorização** — a trava existente ("NÃO fecha reserva, NÃO cobra")
permanece como regra-mãe.

Substituímos o passo 5 do "FLUXO IDEAL" e o bloco "O QUE VOCÊ NÃO FAZ" por uma
seção condicional. O **modo é injetado no system** em runtime (ver §5), então a
Sofia só vê o ramo aplicável:

```
QUANDO O CLIENTE QUER FECHAR:
- Detectou intenção de fechar/reservar? NUNCA cobre nem confirme reserva por conta
  própria. O que acontece a seguir depende da modalidade da imobiliária (já
  definida pra você — você não escolhe).

[modo = owner — Dono-finalizador]
- A etapa final é com uma pessoa. Diga ao cliente, de forma calorosa, que vai
  chamar alguém do time pra fechar com ele agora ("perfeito! vou chamar agora a
  pessoa que finaliza com você, segura aí um instantinho"), e use `notify_owner`
  com um resumo (nome, datas, hóspedes, imóvel). Depois disso, NÃO prometa link de
  pagamento nem contrato — quem conduz é o humano. Você volta a agir só quando o
  dono te liberar.

[modo = ia — IA-finalizadora]
- Você pode conduzir a parte chata do fechamento (coletar dados, mandar link de
  pagamento da caução, organizar contrato e datas) — MAS isso roda dentro de um
  fluxo controlado de fechamento, com as ferramentas próprias. Você nunca confirma
  que a reserva está fechada antes de o pagamento da caução ser confirmado pelo
  sistema. Enquanto não confirmar, seja honesta: "assim que o pagamento cair eu já
  te confirmo tudo".
- Em qualquer dúvida ou exceção (cliente quer condição especial, algo fora do
  padrão), chame o dono com `notify_owner` em vez de improvisar.
```

Pontos de contrato que o prompt respeita:

- **Estado `FECHAMENTO`** (FUNDAÇÃO §4.1) é onde a coleta de pagamento/caução/
  contrato acontece; o prompt de fechamento-IA só é injetado quando
  `state == FECHAMENTO` **e** `closingMode == 'ia'`.
- No modo `owner`, fechar = transição para **`AGUARDANDO_HUMANO`** (FUNDAÇÃO
  §4.1, §4.4), disparada por `notify_owner`/`notify_owner`+alerta de dono.
- A confirmação de caução **só** vem do **webhook idempotente** (MP split,
  doc `03`) — a Sofia jamais "detecta" pagamento por conta própria. O prompt a
  proíbe de afirmar pagamento sem o sinal do sistema (Princípio 1 — honestidade).

> **Trade-off:** poderíamos ter um único prompt que descreve as duas modalidades
> e deixar a LLM escolher pelo campo `closingMode`. Escolhemos **injetar só o
> ramo aplicável** porque (a) reduz tokens no caminho síncrono (§4.5: histórico
> `[-20:]`, `max_tokens≤1024`), (b) elimina a chance de a LLM aplicar o ramo
> errado, e (c) torna o comportamento auditável. Custo: a montagem do system fica
> condicional (mais lógica em `nodes.py`/builder de prompt). Aceitável.

### 3.4 Comportamento por estado (resumo para a Sofia cliente)

A Sofia cliente só é invocada nos estados em que a IA fala. O webhook
(`dispatchToAgent`) já decide se chama o agente, lendo `state`
(Redis→Firestore, FUNDAÇÃO §4.1). Da perspectiva do **prompt**:

| `ConversationState` | A Sofia responde? | Prompt usado |
|---|---|---|
| `ATIVA` | Sim, reativo normal | `PLANNER_SYSTEM` base |
| `IA_TRABALHANDO` | **Não** (msgs bufferizadas); responde no `/resume` | `PLANNER_SYSTEM` + `RESUME_SYSTEM_BLOCK` (no resume) |
| `AGUARDANDO_HUMANO` | Não (aguarda dono) | — (webhook não chama o agente) |
| `MANUAL` (= `ai_blocked`) | Não (takeover) | — (`isAiBlocked` bloqueia) |
| `FECHAMENTO` | Sim, se `closingMode=='ia'` | `PLANNER_SYSTEM` + bloco fechamento-IA |
| `ENCERRADA` | Não | — |

O prompt **não** precisa "saber" de `IA_TRABALHANDO`/`MANUAL`/`AGUARDANDO_HUMANO`
para se calar — o **roteamento no webhook** já faz isso (`01`). O prompt só recebe
blocos extras nos estados em que ela **fala** (`/resume` e `FECHAMENTO`). Isso
mantém o `PLANNER_SYSTEM` base enxuto.

---

## 4. Analista (dono) — evolução do `_OPERATOR_BASE`

A Analista já é "analista sênior, proativa e diagnóstica" e já carrega o princípio
de honestidade. Ela roda no `/operate` (console do dashboard) nos modos `analista`
(read-only, ligado a `READ_ONLY_TOOL_NAMES`) e `operador` (pode escrever).

O que evolui: a Analista deixa de ser **só** reativa-no-console e passa a ser a
**ponta dona do canal IA↔Dono** (FUNDAÇÃO §4.4, doc `06`) — o dono "pergunta em
vez de checar painéis", e a IA "chama a atenção do dono" com botões/deep-links.
Isso é majoritariamente infra (doc `06`), mas o **tom e as regras de proatividade**
da Analista são fixados aqui.

### 4.1 Bloco novo: proatividade consultiva e canal com o dono

Adicionado ao `_OPERATOR_BASE` (vale para os dois modos, pois é base):

```
VOCÊ É O CANAL DIRETO DO DONO COM O NEGÓCIO:
- O dono conversa com você em vez de garimpar painel. Quando ele perguntar algo
  ("como tá o fim de semana?", "tem alguém quente parado?"), responda como uma
  sócia que conhece o funil: traga o número, diga o que ele significa, e o próximo
  passo. Use read_system (insights/dashboard) como ponto de partida.
- Quando houver um lead quente parado, uma conversa que precisa da mão dele, ou um
  cliente sinalizando que quer fechar, seja DIRETA e priorize: diga quem, por quê,
  e que ele deveria agir agora. (O alerta com deep-link pra conversa é disparado
  pelo sistema; seu papel aqui é o diagnóstico e a recomendação.)
- Proatividade nunca vira invenção: se você não tem o dado, diga que não tem. É
  melhor "não tenho registro disso" do que um número chutado.
```

E especificamente sobre o **fluxo de "cliente quer fechar" no modo Dono-finalizador**
(amarra com o doc `02` e o estado `AGUARDANDO_HUMANO`):

```
QUANDO UM CLIENTE ESTÁ PRONTO PARA FECHAR (modo Dono-finalizador):
- A Sofia já avisou o cliente e te chamou. Seu papel aqui no console é dar o
  contexto certo: quem é, o que quer, datas, imóvel, e qualquer sinal de risco
  (ex.: pediu pet e o imóvel não aceita). Seja a memória do atendimento.
- Quando o dono disser "pode mandar o link de pagamento e coletar o contrato",
  isso é a AUTORIZAÇÃO. No modo operador você confirma o que será feito; a Sofia
  então cuida da parte chata (iCal, link de caução, contrato) dentro do fluxo de
  fechamento. Nunca presuma essa autorização — espere a instrução clara.
```

A última frase é o eco, no lado do dono, da regra-mãe da Sofia: **não fecha sem
autorização**. A autorização é um ato explícito do dono no console (ou via
WhatsApp pessoal, doc `06`), nunca inferido.

### 4.2 Guard-rails da Analista (preservados + 1 reforço)

Já existem e permanecem:

- Modo `analista`: **ligado fisicamente** a `READ_ONLY_TOOL_NAMES` — não consegue
  mutar nem que o prompt mande (defesa em profundidade: prompt **e** binding).
- Modo `operador`: só escreve quando a mensagem instrui ação concreta; em dúvida,
  pergunta ou só lê.
- Honestidade: `null`/`costDataAvailable:false` ⇒ dizer "não tenho esse dado".

Reforço novo (uma linha no modo `operador`): a Analista **não** dispara fechamento
nem libera pagamento por interpretação própria — só executa quando o dono instrui
explicitamente (espelha a trava de autorização acima).

---

## 5. Como os prompts mudam com a máquina de estados (montagem dinâmica)

Hoje os prompts são **constantes estáticas**. Com a máquina de estados, o system
da Sofia passa a ser **montado em runtime** por composição de blocos. Isto é
**novo** (builder de prompt), mas reusa as constantes existentes como base.

### 5.1 Builder de prompt (Sofia)

Pseudo-assinatura (a viver em `agent/app/graph/prompts.py` ou em `nodes.py`,
decisão de implementação do doc `01`; aqui fixamos o contrato):

```python
def build_planner_system(
    *,
    state: str,                 # ConversationState (ATIVA, FECHAMENTO, ...)
    closing_mode: str | None,   # 'ia' | 'owner' | None
    resume: dict | None = None, # {task_type, result, resume_hint} no /resume
    today: str,
) -> str:
    parts = [PLANNER_SYSTEM.format(TODAY=today)]
    if state == "FECHAMENTO" and closing_mode == "ia":
        parts.append(CLOSING_IA_BLOCK)
    elif closing_mode == "owner":
        parts.append(CLOSING_OWNER_BLOCK)
    if resume is not None:
        parts.append(RESUME_SYSTEM_BLOCK.format(
            TASK_TYPE=resume["task_type"], RESULT=resume["result"]
        ))
    return "\n\n".join(parts)
```

Regras:

- `state`/`closing_mode` vêm de `conversations/{id}` (campos `state`,
  `closingMode` — FUNDAÇÃO §4.3), lidos ao montar o turno (no `/process` e no
  `/resume`). O agente é stateless: recebe esses campos no payload ou os busca via
  `read_system`/Firestore como já faz para o histórico.
- `resume` só é não-nulo no `/resume`.
- O `PLANNER_SYSTEM` base **não muda** — só ganha blocos anexados. Isso mantém o
  carisma e as regras-mãe intactas e versionáveis.

### 5.2 Diagrama de sequência — defer → trabalho → re-engajar

```
Cliente            Webhook(locai)         Agente(/process)        Function worker        Agente(/resume)
  │                     │                       │                       │                      │
  │ "qual a melhor      │                       │                       │                      │
  │  opção pra mim?" ──▶│ dedup + persist       │                       │                      │
  │                     │ lê state=ATIVA        │                       │                      │
  │                     │ dispatchToAgent ─────▶│ router→planner        │                      │
  │                     │                       │ LLM chama             │                      │
  │                     │                       │ defer_and_work ──────▶│ (endpoint defer-task)│
  │                     │                       │   • state→IA_TRABALHANDO (Firestore+Redis)   │
  │                     │                       │   • envia client_message AGORA (outbound)    │
  │◀─ "show, me dá um   │                       │   • cria deferred_tasks(queued) + enfileira  │
  │   segundinho"       │                       │   • turno termina SEM 2ª resposta            │
  │                     │                       │                       │                      │
  │ "e tem com          │ persist (NÃO dispara  │                       │  worker roda task    │
  │  piscina?" ────────▶│ /process: state é     │                       │  (tier DEEP, 120s)   │
  │   (bufferizada)     │  IA_TRABALHANDO) ─────┼───────────────────────┤  grava result/done   │
  │                     │                       │                       │  chama /resume ─────▶│
  │                     │                       │                       │                      │ idempotência
  │                     │                       │                       │                      │ resume_done:{t}:{taskId}
  │                     │                       │                       │                      │ monta system:
  │                     │                       │                       │                      │ PLANNER+RESUME_BLOCK
  │                     │                       │                       │                      │ +msgs bufferizadas
  │                     │                       │                       │                      │ roda grafo (MAIN)
  │◀── "voltei! achei um com piscina que cabe vocês, te mando as fotos" ◀┴── outbound ─────────┤
  │                     │                       │                       │  state IA_TRABALHANDO→ATIVA
```

Pontos de contrato no diagrama:

- A 1ª resposta (`client_message`) sai **dentro** do `defer_and_work` via outbound
  existente (`/api/v1/messages/{tenantId}/send`, extraído para
  `lib/whatsapp/outbound.ts`). O turno `/process` **não** produz uma 2ª resposta.
- Mensagens do cliente em `IA_TRABALHANDO` são **persistidas e bufferizadas**, não
  disparam `/process`; são lidas no `/resume` (FUNDAÇÃO §4.2).
- `/resume` é idempotente por `taskId` (`resume_done:{tenantId}:{taskId}`, SET NX
  EX) — re-entrega da Function não duplica resposta.
- Fim: `IA_TRABALHANDO → ATIVA` (ou `FECHAMENTO`/`AGUARDANDO_HUMANO` conforme o
  desfecho).

### 5.3 Diagrama de sequência — fechamento (Dono-finalizador)

```
Cliente            Sofia(/process)        Webhook/State          Dono (push+WhatsApp+console)
  │                     │                       │                       │
  │ "quero fechar" ────▶│ router=close_deal     │                       │
  │                     │ state=ATIVA,          │                       │
  │                     │ closingMode='owner'   │                       │
  │                     │ → CLOSING_OWNER_BLOCK  │                       │
  │                     │ chama notify_owner ───▶│ state→AGUARDANDO_HUMANO│ alerta + deep-link
  │◀ "vou chamar agora  │                       │ ownerAlertedAt set     │ (doc 06)
  │  a pessoa, segura"  │                       │                       │
  │                     │  (Sofia silencia)     │                       │ dono fecha com cliente
  │                     │                       │                       │ dono no console:
  │                     │                       │                       │ "pode mandar o link"
  │                     │  Analista(/operate, operador) confirma ───────▶│ autorização explícita
  │                     │  → transição p/ FECHAMENTO + closingMode vira  │
  │                     │    'ia' p/ a parte chata (iCal/caução/contrato)│
```

No modo `owner`, a Sofia **não** conduz pagamento; ela só prepara e silencia. A
retomada da "parte chata" pela IA é **autorizada explicitamente** pelo dono e
muda o estado para `FECHAMENTO` (docs `02`/`03`/`08`).

---

## 6. Tiers de modelo por prompt (FUNDAÇÃO §4.5; tier `DEEP` definido no doc `09`)

| Prompt / nó | Tier | Constante `config.py` | Onde roda |
|---|---|---|---|
| `ROUTER_SYSTEM` | `FAST` | `MODEL_FAST` (`gpt-4o-mini`) | síncrono `/process`, `/resume` |
| `PLANNER_SYSTEM` (Sofia) | `MAIN` | `MODEL_MAIN` (`gpt-4o-mini`) | síncrono `/process` |
| `RESUME_SYSTEM_BLOCK` (re-engajamento) | `MAIN` | `MODEL_MAIN` | `/resume` (síncrono p/ o worker) |
| `OPERATOR_*` (Analista) | `MAIN` | `MODEL_MAIN` | `/operate` |
| slots de contrato (preenchimento determinístico) | `FAST` | `MODEL_FAST` | background (doc `08`) |
| `property_research` / análise de funil sob pedido | **`DEEP`** | `MODEL_DEEP` (definido no doc `09`) | **só background** (worker) |

Travas de custo que os prompts respeitam (FUNDAÇÃO §4.5):

- **`DEEP` jamais no caminho síncrono do WhatsApp** — a Sofia nunca chama `DEEP`;
  só o worker da Function usa. O re-engajamento que o cliente vê é `MAIN`.
- `max_tokens ≤ 1024`; histórico `[-20:]`; router sempre `FAST`.
- Logar `total_tokens_in/out` por turno; a contabilidade e a observabilidade de
  custo (`ai_usage`, rollups, LangSmith, dashboards) são definidas no doc `09`.

O tier `DEEP` (constante `MODEL_DEEP`) **não** é definido aqui: o doc `09` é a
**única fonte de verdade** dele. Esta seção apenas **consome** o tier para mapear
quais prompts/nós podem usá-lo (`property_research` / análise de funil, só no
worker em background).

---

## 7. Guard-rails consolidados (todas as personas)

| Guard-rail | Sofia | Analista | Como é garantido |
|---|---|---|---|
| Nunca inventa dado (imóvel/preço/número) | ✅ | ✅ | prompt + `null`/`costDataAvailable:false` (`crm-insights-core.ts`) |
| Mensagens curtas, sem bullets/links | ✅ | n/a (texto puro do console) | prompt |
| Não fecha/cobra sem autorização | ✅ | ✅ (não libera pagamento por conta) | prompt + estado `FECHAMENTO`/`AGUARDANDO_HUMANO` + webhook de caução |
| Confirmação de pagamento só via webhook | ✅ | ✅ | doc `03` (webhook idempotente), prompt proíbe afirmar pagamento sozinha |
| Read-only não muta | n/a | ✅ | binding `READ_ONLY_TOOL_NAMES` (defesa em profundidade) |
| Defer só em IA_TRABALHANDO; resume idempotente | ✅ | n/a | `resume_done:{tenantId}:{taskId}` SET NX EX (§4.2) |
| Não responde em MANUAL/AGUARDANDO_HUMANO/IA_TRABALHANDO | ✅ | n/a | roteamento no webhook (`state`), `isAiBlocked` |
| Multi-tenant em todo payload | ✅ | ✅ | HMAC + `tenantId` em todo body (§4.6) |
| PII mascarada nos logs | ✅ | ✅ | `logger` (mascaramento automático) |

---

## 8. Reuso vs novo

**Reusa (não toca):**

- `PLANNER_SYSTEM`, `_OPERATOR_BASE`, `OPERATOR_ANALISTA_SYSTEM`,
  `OPERATOR_OPERADOR_SYSTEM`, `ROUTER_SYSTEM` — base preservada; ganham anexos.
- `registry.py` `TOOLS` e `READ_ONLY_TOOL_NAMES` — só **adiciona**
  `defer_and_work` (write tool, fora do read-only set).
- Tools existentes (`notify_owner`, `read_system`, `search_available_properties`,
  etc.) — papéis inalterados; `notify_owner` ganha protagonismo no fechamento
  modo `owner`.
- Honestidade de `crm-insights-core.ts`, HMAC, outbound do microserviço,
  `isAiBlocked`/Redis, tiers de `config.py`.

**Novo:**

- Bloco de prompt de **defer** no `PLANNER_SYSTEM` + tool `defer_and_work`.
- `RESUME_SYSTEM_BLOCK` (system extra no `/resume`).
- `CLOSING_IA_BLOCK` / `CLOSING_OWNER_BLOCK` (fechamento condicional ao modo).
- `OWNER_PROACTIVE_BLOCK` no `_OPERATOR_BASE` (Analista como canal do dono).
- `build_planner_system(...)` — montagem dinâmica por estado/modo/resume.

> O tier `DEEP` (`MODEL_DEEP`) **não** é novidade deste doc — é definido no doc
> `09` e aqui apenas **consumido** (só no worker, em background).

---

## 9. Trade-offs e riscos

1. **Re-engajamento sem mensagem do cliente é "spam-shaped".** Risco de WhatsApp
   sinalizar / cliente achar invasivo. Mitigação: defer só quando a Sofia
   prometeu ("você vai voltar sozinha"); 1 mensagem de espera + 1 de retomada,
   nada mais; re-ping de `ask_owner` com SLA controlado (doc `06`), não em loop.
2. **Buffer em `IA_TRABALHANDO` pode envelhecer.** Se a task demora e o cliente
   manda 5 mensagens, o `/resume` precisa responder ao fio mais recente, não a
   uma pergunta já superada. Mitigação: `RESUME_SYSTEM_BLOCK` instrui a priorizar
   o histórico recente (`[-20:]`); timeout de `property_research` = 120s limita a
   janela.
3. **Montagem condicional de system aumenta superfície de bug.** Um `closingMode`
   lido errado pode injetar o ramo errado. Mitigação: defaults seguros — sem
   `closingMode`, **nenhum** bloco de fechamento é injetado e a Sofia cai na
   regra-mãe (escala via `notify_owner`); o modo `analista` continua travado por
   binding independentemente do prompt.
4. **Custo do `DEEP`.** Tasks pesadas em modelo maior podem encarecer. Mitigação:
   `DEEP` só em background, `max_tokens` limitado, e a decisão de usar `DEEP` é da
   Function (não da Sofia), permitindo throttling/observabilidade central.
5. **Deriva de tom no re-engajamento.** O `RESUME_SYSTEM_BLOCK` é um system
   separado; risco de soar diferente do `PLANNER_SYSTEM`. Mitigação: ele é
   **anexado** ao `PLANNER_SYSTEM` (não substitui), então o carisma base persiste.
6. **Autorização de fechamento ambígua.** "Pode mandar o link" precisa ser
   reconhecido como autorização sem falsos positivos. Mitigação: no modo
   `operador` a Analista confirma a ação antes de executar; a transição de estado
   é explícita, não inferida pela Sofia cliente.

---

## 10. Checklist de implementação (prompts)

- [ ] Adicionar `defer_and_work` em `registry.py` `TOOLS` (não em `READ_ONLY_TOOL_NAMES`); mapear `defer_and_work → defer-task` em `client.py _TOOL_PATHS`.
- [ ] Anexar bloco "QUANDO VOCÊ PRECISA DE UM TEMPINHO" ao `PLANNER_SYSTEM`.
- [ ] Criar `RESUME_SYSTEM_BLOCK`, `CLOSING_IA_BLOCK`, `CLOSING_OWNER_BLOCK` em `prompts.py`.
- [ ] Anexar `OWNER_PROACTIVE_BLOCK` + bloco de fechamento Dono-finalizador ao `_OPERATOR_BASE`; reforçar trava de autorização no modo `operador`.
- [ ] Implementar `build_planner_system(state, closing_mode, resume, today)` e usá-lo no `/process` e no `/resume`.
- [ ] Consumir o tier `DEEP` (`MODEL_DEEP`, definido no doc `09`) só no worker; garantir que o caminho síncrono nunca o use.
- [ ] Logar `total_tokens_in/out` por turno (incluindo `/resume`).
- [ ] Testar: defer→buffer→resume idempotente; fechamento `owner` vs `ia`; modo `analista` não muta mesmo sob prompt adverso.
