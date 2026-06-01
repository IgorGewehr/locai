# Smoke-test — MVP Locai (handoff + Assistente Sofia)

Roteiro manual pra validar o caminho vivo do MVP **e** o novo chat interno "Assistente Sofia"
depois de subir. Tudo aqui é teste de UI/integração — não há automação. Faça na ordem.

> Foco: **IA atende → handoff pro humano → humano fecha**, e o **canal do Assistente** (cards
> "pronto pra fechar" + botão + chat com a consultora).

---

## 0. Pré-requisitos

- **3 serviços no ar** (local ou prod):
  - locai (Next) — `8080` local / túnel em prod
  - agent (Python) — `8090` local / túnel em prod (`AGENT_SERVICE_URL` no locai aponta pra ele)
  - whatsapp_microservice — `3000` local / em prod
- **Env setado** (no ambiente onde roda):
  - `AGENT_SHARED_SECRET` **idêntico** em locai e agent
  - `WHATSAPP_MICROSERVICE_URL` + `WHATSAPP_MICROSERVICE_API_KEY`
  - `OPENAI_API_KEY` (ou `ANTHROPIC_API_KEY`) no agent
  - `AIRBNB` (hasdata) + `MAPS_KEY` (Google) — pra import/mapa
- **Sessão WhatsApp conectada** (QR escaneado em Settings → WhatsApp).
- **WhatsApp do dono configurado** em Settings → WhatsApp ("WhatsApp que recebe os avisos").
- **Pelo menos 1 imóvel** cadastrado (com cidade/preço) pra a busca retornar algo.
- (Opcional) `functions/` deployadas + `DEFERRED_TASK_WORKER_URL` — só pro `defer_and_work`/watchdog.
- Um **telefone de teste** (diferente do número conectado) pra mandar mensagens como "cliente".

---

## ⚡ Atalho — validar o card + botão + chat SEM fluxo WhatsApp (UI rápido)

Pra testar a UI do Assistente sem orquestrar uma conversa inteira, crie 1 doc no Firestore:

`tenants/{SEU_TENANT_ID}/owner_alerts/{auto-id}`:
```json
{
  "tenantId": "SEU_TENANT_ID",
  "conversationId": "SEU_TENANT_ID:5548999990000",
  "clientPhone": "5548999990000",
  "reason": "closing",
  "severity": "critical",
  "status": "sent",
  "repingCount": 0,
  "summary": "João quer fechar o apê pra esse fim de semana",
  "deepLink": "/dashboard/conversas?phone=5548999990000",
  "clientName": "João Silva",
  "guests": 4,
  "checkIn": "2026-06-12",
  "checkOut": "2026-06-14",
  "propertyTitle": "Apto Beira-Mar 2Q",
  "createdAt": "<timestamp de agora>"
}
```
Depois faça **Teste 5** direto. (Pra um Lead aparecer junto em Atendimentos, crie também um lead com `phone: "5548999990000"` e `escalation.active: true`.)

---

## 1. Caminho vivo + criação de lead (P0-1)

1. Do telefone de teste, mande no WhatsApp do número conectado: **"oi, procuro um apê em \<cidade do seu imóvel\> pra 4 pessoas"**.
2. **Esperado:** a Sofia responde (curta, calorosa) pedindo as datas.
3. Abra **Dashboard → Atendimentos**.
4. **Esperado:** aparece **um Lead novo** com esse telefone (antes ficava vazio). ✅ P0-1

> Se não aparecer lead: ver logs do locai por `ensureLeadExists`; confirmar que o webhook
> recebeu o evento `message` (auth do microserviço ok).

## 2. Busca por data real — não oferecer imóvel ocupado (P0-4)

1. No dashboard, crie uma **Reserva** num imóvel para as datas D1–D2 (status confirmed/pending).
2. Como cliente, peça à Sofia esse imóvel/essas datas: **"tem o \<imóvel\> dia D1 a D2?"**.
3. **Esperado:** a Sofia **NÃO** oferece o imóvel reservado (filtrado por disponibilidade). Repita
   com datas livres → deve oferecer normalmente. ✅ P0-4

## 3. Handoff + escalação aparece em "Precisam de você" (P0-2)

1. Como cliente, depois de ver opções: **"perfeito, quero fechar esse, pode reservar pra mim"**.
2. **Esperado:** a Sofia avisa que vai passar pra equipe (não fecha sozinha).
3. Em **Atendimentos**, o lead **sobe pro topo** com destaque em **"Precisam de você"**. ✅ P0-2
4. (Estado da conversa vira `AGUARDANDO_HUMANO` — a IA para de responder sozinha.)

## 4. Ping no WhatsApp do dono (P0-3)

1. Pré: WhatsApp do dono salvo em Settings → WhatsApp.
2. Logo após o Teste 3, **o WhatsApp pessoal do dono** recebe:
   **"🔴 FECHAMENTO — chama AGORA"** + resumo + link da conversa. ✅ P0-3

> Se não chegar: confirmar o número salvo (Settings → WhatsApp) e ver log `[notify-owner]`
> (`no_owner_phone` = número não configurado).

## 5. Canal "Assistente Sofia" — card + botão + chat (feature nova)

1. **Dashboard → Conversas.**
2. **Esperado:** **"Assistente Sofia" fixado como 1º item**, com destaque (indigo) e **badge de não-lidos**.
3. Clique nele → abre a **thread do assistente** no painel direito.
4. **Esperado:** um **card "pronto pra fechar"** com: **Cliente · 4 hóspedes · 12/06 → 14/06 ·
   \<imóvel\> · "quente há X min"** + botão **"Abrir conversa"**. ✅ card
5. Clique **"Abrir conversa"** → abre a conversa do cliente certo (deep-link); o card é marcado
   como visto e o **badge de não-lidos diminui**. ✅ ack + deep-link
6. Volte ao Assistente e **digite uma pergunta**: "como tá o funil hoje?" / "quantos leads quentes
   sem retorno?".
7. **Esperado:** a **consultora responde** (via `/operate`, modo analista) com base nos dados reais. ✅ chat

## 6. Takeover e fechamento manual (loop do handoff)

1. Na conversa do cliente, clique **"Assumir conversa"**.
2. **Esperado:** a IA pausa (modo manual), o input abre e mostra **"IA pausada até HH:MM"**. ✅ P1-3
3. Envie uma mensagem manual → ela sai no WhatsApp do cliente.
4. (Se o envio falhar — ex.: Baileys offline — aparece um **aviso de erro**, não some calado.) ✅ P1-6
5. Para devolver pra IA: desbloquear em "Assumir/AI control".

## 7. ai-config muda a Sofia (P1-2)

1. Settings → IA (ai-config): mude o **nome do assistente** e o **tom** (ex.: mais informal),
   adicione uma **instrução especial**. Salve.
2. Inicie uma **nova conversa** como cliente.
3. **Esperado:** a Sofia reflete o tom/nome/instrução (antes ignorava tudo). ✅ P1-2

---

## Checklist rápido

- [ ] Lead nasce no fluxo real (Atendimentos não fica vazia)
- [ ] Imóvel reservado não é oferecido nas datas ocupadas
- [ ] Fechamento → lead no topo de "Precisam de você"
- [ ] Dono recebe "🔴 FECHAMENTO" no WhatsApp pessoal
- [ ] "Assistente Sofia" fixado no topo, com badge
- [ ] Card com cliente/hóspedes/datas/imóvel/urgência + botão abre a conversa
- [ ] Chat com a consultora responde
- [ ] Assumir conversa pausa a IA + timer + envio manual com feedback de erro
- [ ] ai-config muda o comportamento da Sofia

## Onde olhar quando algo falha
- **locai logs:** `[notify-owner]`, `ensureLeadExists`, `[resume-dispatch]`, gate de estado da conversa.
- **agent logs:** `agent.process` / `agent.operate` (LangSmith se ligado).
- **Firestore:** `tenants/{tid}/{leads,owner_alerts,conversations,assistant_chat,deferred_tasks}`.
- **Redis:** `ai_blocked:*` (takeover), `conv_state:*` (estado), `resume_done:*`.
