# Locai Agent — Sofia (LangGraph)

Agente de IA do Locai para automação de atendimento WhatsApp de imóveis por temporada.
Serviço **Python + FastAPI + LangGraph**, separado do app Next.js (`locai/`).

> Este agente **substituiu o antigo motor de workflows N8N**. O app Next.js
> orquestra o fluxo: recebe a mensagem do WhatsApp, despacha para o agente
> (`POST /process`) e envia a resposta de volta pelo microserviço WhatsApp.

---

## Arquitetura

```
locai (Next.js)                          agent (este serviço)
─────────────────                        ─────────────────────
POST /api/webhook/whatsapp-microservice
   └─ dispatchToAgent() ── HMAC ──▶  POST /process
                                          │
                                          ▼  LangGraph
                                     router ──▶ planner ⇄ executor
                                     (intent)  (LLM)     (tools, paralelo)
                                                            │
                          ◀── HMAC ── POST /api/agent/tools/{...}
                                                            │
   ◀── { final_response, media_urls, intent, ... } ────────┘
```

### Grafo (`app/graph/graph.py`)

- **router** (`app/graph/nodes.py`) — classifica a intenção da última mensagem do
  usuário com o modelo rápido (`MODEL_FAST`).
- **planner** — modelo principal (`MODEL_MAIN`) com as tools acopladas
  (`bind_tools`). Decide entre responder em texto ou chamar ferramentas.
- **executor** — executa as tool calls **em paralelo** (`asyncio.gather`),
  agrega `media_urls` (deduplicadas) e devolve `ToolMessage`s ao planner.
- Loop `planner ⇄ executor` limitado por `AGENT_MAX_ITERATIONS` (default 8) e por
  um timeout duro de `AGENT_REQUEST_TIMEOUT_S` (default 30s).

### Endpoints (`app/api/routes.py`)

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/process` | Processa uma mensagem do WhatsApp e retorna a resposta da Sofia. |
| `POST` | `/operate` | Console do operador (texto puro). Modos `analista` (read-only) e `operador`. |
| `GET`  | `/health` | Health check (`{"status":"ok"}`). |

### Console do operador

`run_operator` (`app/graph/graph.py`) compila dois grafos:

- **`analista`** — read-only: o LLM é acoplado **apenas** às tools de leitura
  (`READ_ONLY_TOOL_NAMES`), então não consegue mutar o sistema.
- **`operador`** — pode usar as tools de escrita.

---

## Ferramentas (`app/tools/registry.py`)

O nome (snake_case) que o LLM usa mapeia para um endpoint kebab-case no locai
sob `/api/agent/tools/` (mapeamento em `app/tools/client.py`):

| Tool (LLM) | Endpoint locai | Leitura/Escrita |
|---|---|---|
| `search_available_properties` | `search-properties` | leitura |
| `get_property_media` | `property-media` | leitura |
| `get_property_map` | `property-map` | leitura |
| `get_airbnb_link` | `airbnb-link` | leitura |
| `read_system` | `read` | leitura |
| `notify_owner` | `notify-owner` | escrita |
| `schedule_visit` | `schedule-visit` | escrita |
| `create_client` | `create-client` | escrita |
| `report_issue` | `report-issue` | escrita |

As 5 primeiras estão em `READ_ONLY_TOOL_NAMES` (usadas no modo `analista`).

---

## Autenticação (HMAC)

Agente e locai compartilham `AGENT_SHARED_SECRET` e assinam o payload como
`HMAC-SHA256("{timestamp}.{body}")`, com janela de replay de **60 segundos**
(`app/auth.py`). Um header `Authorization: Bearer <secret>` também é aceito como
caminho simples para dev/testes.

> O esquema de assinatura precisa ficar **idêntico** ao do locai
> (`lib/middleware/agent-auth.ts` e o `dispatchToAgent` em
> `app/api/webhook/whatsapp-microservice/route.ts`). Ao alterar um lado, alterar o outro.

---

## Configuração (`.env`)

Copie `.env.example` para `.env.production` (ou `.env` em dev) e preencha:

```bash
# Auth — DEVE bater com o AGENT_SHARED_SECRET do locai (>= 32 chars)
AGENT_SHARED_SECRET=generate-with-openssl-rand-hex-32

# LLM — "openai" ou "anthropic"
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
MODEL_FAST=gpt-4o-mini      # router
MODEL_MAIN=gpt-4o-mini      # planner

# Backend locai (URL interna no Docker; em prod, a URL do tunnel)
LOCAI_API_URL=http://locai:3000

# Servidor
HOST=0.0.0.0
PORT=8080
APP_ENV=production

# Segurança / limites
AGENT_MAX_ITERATIONS=8
AGENT_REQUEST_TIMEOUT_S=30

# LangSmith (opcional)
# LANGCHAIN_TRACING_V2=true
# LANGCHAIN_API_KEY=ls__...
# LANGCHAIN_PROJECT=locai-agent-prod
# REDACT_PII_IN_TRACES=true
```

Validação em `app/config.py` (pydantic-settings). `AGENT_SHARED_SECRET` com menos
de 32 caracteres falha na inicialização.

---

## Rodando

### Local (dev)

```bash
# instalar deps (uv ou pip)
uv sync                       # ou: pip install -e .
uvicorn main:app --reload --port 8080
# docs interativas em http://localhost:8080/docs (somente fora de produção)
```

### Docker / Produção

```bash
# dev local (expõe a porta — descomente "ports" no docker-compose.yml)
docker compose up

# produção: agent + Cloudflare Tunnel (alugazapbrain.tensorroot.com)
docker compose --profile tunnel up -d
```

Em produção o container **não expõe porta ao host** — o acesso é só via tunnel.
Toda a configuração (incluindo `CLOUDFLARE_TUNNEL_TOKEN`) fica em `.env.production`.

---

## Observabilidade

- Logs estruturados via `structlog` (`app/observability.py`).
- LangSmith opcional (tracing) — habilitado quando `LANGCHAIN_TRACING_V2=true`;
  nome do projeto derivado do ambiente (`locai-agent-dev` / `locai-agent-prod`).
- `AgentRunResult` carrega `node_traces`, `tool_calls`, tokens e latência por run.

---

## Estrutura

```
agent/
  main.py                 # FastAPI app factory + lifespan
  pyproject.toml          # deps (langgraph, langchain-openai/anthropic, fastapi, ...)
  Dockerfile
  docker-compose.yml      # agent + cloudflared (profile "tunnel")
  app/
    api/routes.py         # /process, /operate, /health
    auth.py               # verificação HMAC / bearer
    config.py             # Settings (pydantic) carregadas do env
    observability.py      # logging + LangSmith
    graph/
      graph.py            # montagem do grafo + run_agent / run_operator
      nodes.py            # router_node, planner_node, executor_node
      state.py            # AgentState (TypedDict) + AgentRunResult
      prompts.py          # prompts do router/planner e do console do operador
    tools/
      registry.py         # schemas das tools expostas ao LLM + READ_ONLY_TOOL_NAMES
      client.py           # cliente HTTP que chama /api/agent/tools/* (HMAC)
```
