# Checklist de lançamento — MVP Locai

Sequência única pra subir o MVP sem thrash. Faça na ordem. Detalhe de validação no
[`SMOKE-TEST-MVP.md`](./SMOKE-TEST-MVP.md); escopo MVP em [`blueprint/00-overview.md §6`](./blueprint/00-overview.md).

---

## 1. Env de produção (setar no ambiente de cada serviço — os `.env` NÃO vão pelo git)

**locai** (`.env.production` no deploy):
- `AIRBNB` = key do hasdata.com (import de imóvel) · `MAPS_KEY` = Google Maps
- `AGENT_SERVICE_URL` = URL do agente · `AGENT_SHARED_SECRET` = **idêntico** ao do agente
- `WHATSAPP_MICROSERVICE_URL` + `WHATSAPP_MICROSERVICE_API_KEY` · `WHATSAPP_WEBHOOK_SECRET`
- Firebase (já tem) · `REDIS_URL`
- `DEFERRED_TASK_WORKER_URL` = URL do `taskWorker` (**só após** deploy das functions — passo 4)

**agent** (`.env.production`): `AGENT_SHARED_SECRET` (match), `OPENAI_API_KEY` (ou `ANTHROPIC_API_KEY`), `LOCAI_API_URL`, `LLM_PROVIDER`, `MODEL_FAST`/`MODEL_MAIN`.

**whatsapp_microservice**: `JWT_SECRET`, `API_KEY`, `LOCAI_WEBHOOK_URL` (= `.../api/webhook/whatsapp-microservice`), `LOCAI_WEBHOOK_SECRET` (= `WHATSAPP_WEBHOOK_SECRET` do locai).

## 2. Código deployável
- Mergear `feat/proactive-agent-mvp` → `main` (ou apontar o deploy pra branch). **PR aberto.**
- **whatsapp_microservice:** build **corrigido** (o try/catch quebrado que cascateava 172 erros foi resolvido; `npm run build` gera `dist/`). Commit **local** nesse repo — **dar push você** quando for subir. Restam 5 erros de tipo legados não-bloqueantes (build emite via `noEmitOnError:false`); o único com efeito em runtime é o download de áudio do Baileys, que só afeta transcrição (desligada por padrão).

## 3. Subir os serviços
- locai (Next, Docker + Cloudflare Tunnel) · agent (Python, Docker + tunnel) · whatsapp (Baileys).
- Healthchecks: `GET /api/health` (locai), `GET /health` (agent), `GET /health` (whatsapp).

## 4. (Opcional, mas recomendado) Agente proativo — Firebase Functions
- `cd functions && npm install && npm run build && firebase deploy --only functions`
- Setar `DEFERRED_TASK_WORKER_URL` (= URL do `taskWorker`) no env do locai e redeploy.
- **Sem isso:** Sofia reativa + handoff funcionam; só o `defer_and_work` ("espera um segundinho") e o watchdog/re-ping ficam inativos.

## 5. Ativação no app (1ª vez por imobiliária)
- Settings → WhatsApp: **escanear o QR** (conectar a sessão).
- Settings → WhatsApp: preencher **"WhatsApp que recebe os avisos da Sofia"** (handoff/chamados).
- Cadastrar ≥1 imóvel.

## 6. Validar
- Rodar o [`SMOKE-TEST-MVP.md`](./SMOKE-TEST-MVP.md) — começar pelo **atalho** (cria 1 `owner_alert` → valida o canal Assistente) e depois o **Teste 1→5** (fluxo completo IA→handoff→card→abrir conversa).

---

## Caveats conhecidos (não bloqueiam, mas saiba)
- **P0s não testados e2e por mim** — só `tsc`/sintaxe. Teste de verdade no smoke-test.
- **~1280 erros de tipo legados** (logger + `tenant-aware-agent-functions.ts`) — não quebram o build (Next ignora), dívida pós-lançamento.
- **FB/IG** desativado (rota inerte) — sem UI de conexão, não atinge usuário.

## Pós-lançamento (deixado de propósito)
- Sweep de `console.log` → `logger` (86 locai + 127 whatsapp) — cosmético.
- Corrigir os ~1280 erros de tipo legados.
- Religar FB/IG ao agente LangGraph (hoje desativado).
- Finalizador automático (PÓS-MVP): pagamento/caução (`03`), contrato (`04`), iCal/chaves (`05`).
