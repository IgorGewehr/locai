# 05 — iCal e disponibilidade no fechamento

> **🚩 PÓS-MVP.** Parte do *finalizador automático* (ver recorte de MVP em
> [`00-overview.md §6`](./00-overview.md)) — o lock de datas + **marcação de
> retirada de chaves** entram quando a IA passar a fechar. No MVP o humano fecha.

> **Escopo deste doc.** Como **travar datas no fechamento** e **reabrir no cancelamento**, reusando o iCal atual (export / import / sync). Prevenção de overbooking e relação com `reservations`, `deposits` e o estado `FECHAMENTO`.

---

## 0. TL;DR

- **A fonte de verdade de disponibilidade já existe e não muda:** `tenants/{tenantId}/reservations` (status `confirmed`/`pending`) + `availabilityService.updateAvailability(...)` (períodos `AvailabilityStatus.BLOCKED`/`RESERVED`). O export iCal (`iCalGeneratorService`) lê reservas; o import/sync (`calendarSyncService`) escreve reservas externas. **Reusamos isso integralmente.**
- **Travar no fechamento = criar/promover uma reserva `pending` e marcar o período como bloqueado**, com um **hold idempotente** que evita overbooking enquanto o cliente paga a caução. Nada de "calendário paralelo": a trava é a própria reserva.
- **Reabrir no cancelamento = espelhar exatamente o fluxo de soft-delete/cancel que o `calendarSyncService` já implementa** (`status: 'cancelled'`, `iCalGeneratorService.invalidateCache(...)`), e liberar o período de disponibilidade.
- **Overbooking** é prevenido por uma **checagem transacional de sobreposição** (novo helper `lib/calendar/availability-lock.ts`) executada no momento do `setConversationState(...,'FECHAMENTO')` e re-verificada no webhook de pagamento. iCal externo (Airbnb/Booking) continua sendo o segundo vetor de overbooking e é mitigado por sync agressivo no fechamento.
- **Onde a lógica vive:** a parte síncrona (criar hold, checar overlap) fica nas rotas Next.js existentes/novas sob `app/api/agent/tools/*` e `app/api/calendar/*`. A parte assíncrona/pesada (sync forçado no fechamento, expiração de hold, reconciliação) migra para **Firebase Functions** (Decisão 2, incremental) usando a mesma HMAC e logging — ver §7.

---

## 1. O que já existe (reuso) vs o que é novo

### 1.1 Reuso (não reescrever)

| Capacidade | Arquivo / símbolo | Papel no fechamento |
|---|---|---|
| Export iCal de uma propriedade | `lib/services/ical-generator-service.ts` → `iCalGeneratorService.generatePropertyFeed(propertyId, tenantId)` | Expõe datas travadas (reservas `confirmed`/`pending`) para Airbnb/Booking. Ao travar uma data no fechamento, ela aparece aqui automaticamente. |
| Rota pública de export | `app/api/ical/[tenantId]/[propertyId]/route.ts` (GET, token via `property.iCalExportToken`) | Inalterada. A trava no fechamento se propaga para fora por este feed. |
| Invalidação de cache do feed | `iCalGeneratorService.invalidateCache(propertyId, tenantId)` | **Chamar sempre que travarmos/reabrirmos** uma data, para o feed externo refletir imediatamente (hoje só o sync chama). |
| Import / parse de iCal externo | `lib/services/ical-parser-service.ts` → `iCalParserService.fetchAndParse(iCalUrl)` | Detecta reservas vindas de Airbnb/Booking antes de fechar (anti-overbooking externo). |
| Orquestração de sync | `lib/services/calendar-sync-service.ts` → `calendarSyncService.syncProperty(propertyId, tenantId)` | Importa eventos externos → cria reservas externas + períodos `BLOCKED`; já faz **cancel** e **soft-delete** ao detectar remoção/cancelamento externo. **É o modelo exato do nosso reabrir.** |
| Config de sync + cron | `app/api/calendar/sync/configure/route.ts`, `app/api/calendar/sync/[propertyId]/route.ts`, `app/api/calendar/sync/cron/route.ts` | Reusados; adicionamos um **sync sob demanda no início do fechamento** (§4). |
| Disponibilidade interna | `services.availability.updateAvailability(propertyId, start, end, AvailabilityStatus, reason, notes)` (`TenantServiceFactory`) | API canônica para marcar `BLOCKED`/`RESERVED`/`AVAILABLE`. |
| Reservas | `tenants/{tenantId}/reservations` + `lib/types/reservation.ts` (`ReservationStatus`, `paymentStatus`, `checkIn`/`checkOut`, `source`, `externalEventUid`) | A reserva **é** a trava. Não criamos coleção paralela de "locks de calendário". |

### 1.2 Novo (greenfield, mínimo)

1. **`lib/calendar/availability-lock.ts`** — helper único com checagem de sobreposição e operações de travar/reabrir idempotentes (assinaturas em §6). Encapsula `reservations` + `availability` + invalidação de cache iCal, para não espalhar essa lógica.
2. **Campos novos em `reservations`** (aditivos — a FUNDAÇÃO permite ADICIONAR, nunca renomear): `holdExpiresAt?`, `closingConversationId?`, `depositId?`, `lockOriginMessageId?`. Ver §3.
3. **Tool nova do agente** `lock_dates` (endpoint `lock-dates`) e `release_dates` (endpoint `release-dates`) — ver §6.4. São tools de mutação (entram no grupo que **não** está em `READ_ONLY_TOOL_NAMES`).
4. **Function** `closingHoldExpiry` (Cloud Tasks) — expira holds não pagos e reabre as datas (§7).

> Nada disso renomeia coleções/estados da FUNDAÇÃO. `deposits/{depositId}`, `conversations/{id}.state` e o estado `FECHAMENTO` são usados exatamente como definidos.

---

## 2. Modelo conceitual da trava

**A trava de data NÃO é uma entidade nova.** Uma data está travada quando existe uma reserva cobrindo `[checkIn, checkOut)` em um destes estados:

- `ReservationStatus.PENDING` — **hold de fechamento** (caução ainda não confirmada) — trava "tentativa".
- `ReservationStatus.CONFIRMED` — fechado e pago — trava firme.
- Reservas externas (`isExternalReservation: true`) importadas via sync — trava firme de origem Airbnb/Booking.

Mapeamento com o iCal export já existente (sem mudança no gerador):

| `ReservationStatus` | Aparece no feed iCal? | `STATUS:` no VEVENT (já implementado em `ical-generator-service.ts`) |
|---|---|---|
| `pending` (hold) | **Sim** (filtro atual exporta `confirmed` **e** `pending`) | `TENTATIVE` |
| `confirmed` | Sim | `CONFIRMED` |
| `cancelled` / soft-deleted | **Não** (filtrado fora) | — |

> **Decisão de design:** o hold de fechamento usa `pending`, e por isso **já é exportado como `TENTATIVE`** — Airbnb/Booking respeitam `TENTATIVE`/`OPAQUE` como bloqueio. Não precisamos tocar no gerador para travar; só precisamos **criar a reserva `pending`** e **invalidar o cache do feed**.

E a disponibilidade interna espelha:

| Momento | `AvailabilityStatus` do período |
|---|---|
| Hold criado (fechamento iniciado) | `BLOCKED` (reason: `closing-hold:{conversationId}`) |
| Caução paga / reserva confirmada | `RESERVED` (com `reservationId`) |
| Hold expira ou cancelamento | `AVAILABLE` |

---

## 3. Modelo de dados

### 3.1 Reuso integral

- `tenants/{tenantId}/reservations/{reservationId}` — `lib/types/reservation.ts`. Campos já existentes usados: `status`, `paymentStatus`, `paidAmount`, `pendingAmount`, `checkIn`, `checkOut`, `nights`, `source` (= `ReservationSource.WHATSAPP_AI` quando criada pela Sofia), `tenantId`, `externalEventUid` (null em holds internos), `observations`, `updatedAt`.
- `tenants/{tenantId}/deposits/{depositId}` — FUNDAÇÃO §4.3. A caução; `reservationId` aponta para o hold. Webhook MP/AbacatePay confirma → promove o hold (§5).
- Períodos de disponibilidade gravados por `availabilityService.updateAvailability(...)`.
- `tenants/{tenantId}/conversations/{id}` — campos da FUNDAÇÃO §4.3 (`state`, `closingMode`, `activeTaskId?`). `conversationId` canônico = `{tenantId}:{normalizedPhone}`.

### 3.2 Campos NOVOS em `reservations` (aditivos)

```ts
// Extensão de Reservation (lib/types/reservation.ts) — APENAS campos novos, nada renomeado
holdExpiresAt?: Date | string;      // hold de fechamento expira aqui (null = trava firme/confirmada)
closingConversationId?: string;     // {tenantId}:{normalizedPhone} que originou o fechamento
depositId?: string;                 // caução associada (deposits/{depositId})
lockOriginMessageId?: string;       // dedup: id da msg/intent que disparou a trava (idempotência)
```

Regras:
- `holdExpiresAt` só existe enquanto `status === 'pending'` e é uma trava de fechamento (distingue de `pending` legado vindo de outras origens). Limpo (`null`) ao confirmar.
- `depositId` é o vínculo reverso de `deposits.reservationId`.
- `lockOriginMessageId` garante idempotência da criação do hold por `(closingConversationId, lockOriginMessageId)` — mesmo padrão de idempotência da criação de `deferred_tasks` por `(conversationId, originMessageId)` na FUNDAÇÃO §4.2.

> **Não criamos** uma coleção `calendar_locks`. A reserva `pending` + `availability` período `BLOCKED` já são durável, consultável e exportável. Menos superfície, menos divergência de estado.

---

## 4. Fluxo: TRAVAR datas no fechamento

### 4.1 Pré-condições

A trava acontece na transição para o estado **`FECHAMENTO`** (FUNDAÇÃO §4.1). Quem dispara:
- **Modo IA-finalizadora** (`conversation.closingMode === 'ia'`): a Sofia chama `lock_dates` ao confirmar imóvel + datas e antes de pedir a caução.
- **Modo Dono-finalizador** (`closingMode === 'owner'`): a trava é disparada quando o **dono** autoriza ("pode mandar o link de pagamento") — a parte chata (iCal, caução, contrato) é da IA, conforme a visão do produto. Até o dono autorizar, fica em `AGUARDANDO_HUMANO` sem trava firme (opcionalmente um hold curto pode ser criado para segurar a data durante a negociação humana — configurável em settings).

### 4.2 Passo a passo (IA-finalizadora)

1. **Sync defensivo (anti-overbooking externo).** Antes de travar, forçar um `calendarSyncService.syncProperty(propertyId, tenantId)` **se** a propriedade tem config de sync ativa e o último sync é "velho" (> N min). Isso importa qualquer reserva Airbnb/Booking recente que ainda não estava no Firestore. Em produção essa chamada roda como **Function** (pesada/externa, Decisão 2) e o resultado é aguardado com timeout curto (ex.: 8s); se estourar, seguimos com a checagem local + flag de risco no alerta ao dono.
2. **Checar sobreposição** com `availabilityLock.checkOverlap(...)` (§6.1): varre `reservations` da propriedade com `status ∈ {pending, confirmed}`, `!externalDeletedAt`, e testa interseção de `[checkIn, checkOut)`. Datas em half-open interval (check-out de uma = check-in de outra **não** conflita).
3. **Se houver conflito →** não trava; retorna `{ locked: false, conflict: {...} }`. A Sofia responde honestamente ("essas datas acabaram de ser reservadas", FUNDAÇÃO Princípio 1) e, se possível, oferece alternativas via `search_available_properties`.
4. **Se livre → criar hold idempotente** (`availabilityLock.lockDates(...)`, §6.2), atômico no escopo possível do Firestore:
   - cria/atualiza `reservations` com `status: 'pending'`, `paymentStatus: 'pending'`, `source: whatsapp_ai`, `holdExpiresAt = now + HOLD_TTL` (ex.: 30 min, configurável), `closingConversationId`, `lockOriginMessageId`;
   - `availabilityService.updateAvailability(propertyId, checkIn, checkOut, BLOCKED, 'closing-hold:{conversationId}', notes)`;
   - `iCalGeneratorService.invalidateCache(propertyId, tenantId)` → o feed público passa a expor a data como `TENTATIVE`.
5. **Enfileirar expiração** do hold (Function `closingHoldExpiry` via Cloud Tasks, agendada para `holdExpiresAt`). Idempotente por `reservationId`.
6. **Transição de estado:** `setConversationState(conversationId, 'FECHAMENTO')` (Firestore+Redis, FUNDAÇÃO §4.1), gravar `activeTaskId?`/`closingMode`.
7. Sofia segue para coleta de caução (doc `03`) — gera link MP split / AbacatePay; cria `deposits/{depositId}` com `reservationId` do hold; grava `reservation.depositId`.

### 4.3 Diagrama de sequência (travar — IA-finalizadora)

```
Cliente        Agente(Sofia)      locai /api/agent/tools     Firestore/Redis        Function(sync/expiry)     Feed iCal
  │  "fecho!"      │                       │                       │                        │                    │
  │───────────────▶ run_agent             │                       │                        │                    │
  │                │ tool: lock_dates ─────▶ POST lock-dates       │                        │                    │
  │                │   (HMAC ts.body)      │  (validateAgentRequest)│                       │                    │
  │                │                       │── force sync (se velho)─────────────────────────▶ syncProperty       │
  │                │                       │◀────────── eventos externos importados ─────────│ (reservas ext)     │
  │                │                       │── checkOverlap(reservations) ─▶                  │                    │
  │                │                       │◀── livre                       │                 │                    │
  │                │                       │── create reservation(pending, holdExpiresAt) ──▶ │                    │
  │                │                       │── updateAvailability(BLOCKED) ─▶                  │                    │
  │                │                       │── invalidateCache ──────────────────────────────────────────────────▶ TENTATIVE
  │                │                       │── enqueue closingHoldExpiry(reservationId) ─────▶ (Cloud Tasks @TTL)  │
  │                │                       │── setConversationState(FECHAMENTO) ─▶ (FS+Redis) │                    │
  │                │◀── { locked:true, reservationId } ─────────────────────────────────────  │                    │
  │◀── "Reservei essas datas pra você, segue o link da caução…"                               │                    │
```

### 4.4 Modo Dono-finalizador (diferença)

O passo 4 (criar hold) só roda **depois** do dono autorizar. Antes disso, a conversa fica em `AGUARDANDO_HUMANO` com alerta de alto destaque (doc `06`: push + WhatsApp pessoal + deep-link). Quando o dono responde "pode mandar o link", o orquestrador chama o **mesmo** `lock_dates` (idempotente) e segue do passo 5. Assim a IA "faz só a parte chata" exatamente como na visão do fundador, reusando o canal IA↔Dono.

---

## 5. Confirmação de pagamento → promoção do hold

Quando a caução é confirmada (webhook MP split **ou** AbacatePay, idempotente por `webhookEventIds[]` — docs `03`):

1. Webhook localiza `deposits/{depositId}` → `reservationId`.
2. `availabilityLock.confirmLock(reservationId)`:
   - `reservations.update(reservationId, { status: 'confirmed', paymentStatus: 'paid'|'partial', paidAmount, holdExpiresAt: null, updatedAt })`;
   - `availabilityService.updateAvailability(..., RESERVED, reason: 'reservation:{id}')` (de `BLOCKED` → `RESERVED`, agora com `reservationId`);
   - `iCalGeneratorService.invalidateCache(...)` → feed passa de `TENTATIVE` para `CONFIRMED`.
3. Idempotência: se a reserva já está `confirmed`, no-op (webhooks podem repetir). Cancela/ignora a task `closingHoldExpiry` daquele `reservationId` (a Function checa o status atual antes de reabrir — ver §7).
4. `setConversationState` segue para próximo passo do fechamento (contrato — doc `04`) ou `ENCERRADA`.

> O webhook **re-verifica overlap** antes de confirmar? Sim, defensivamente: se entre o hold e o pagamento entrou uma reserva externa conflitante (corrida com sync Airbnb), o confirm detecta o conflito, **não** confirma a data, dispara reembolso da caução (doc `03`, `deposits.status: 'refunded'`) e escala ao dono (`AGUARDANDO_HUMANO`). Honestidade total com o cliente.

---

## 6. Reabrir datas no cancelamento

O cancelamento **espelha exatamente** o que o `calendarSyncService` já faz para reservas externas removidas/canceladas (linhas de `importEvents`: `status: 'cancelled'`, observação datada, `iCalGeneratorService.invalidateCache(...)`). Reusamos esse padrão para reservas internas.

### 6.1 Gatilhos de cancelamento

- Hold expirou sem pagamento → Function `closingHoldExpiry` (§7).
- Cliente desiste / dono cancela → tool `release_dates` ou cancelamento manual no dashboard.
- Reserva externa removida do Airbnb/Booking → **já tratado** pelo sync (soft-delete). Nada novo.
- Caução não confirmada e fechamento abandonado → expiração do hold.

### 6.2 Passo a passo (reabrir)

`availabilityLock.releaseDates(reservationId, reason)`:
1. `reservations.update(reservationId, { status: 'cancelled', observations: '${prev}\n\n⚠️ Datas reabertas: ${reason} em ${ISO}', holdExpiresAt: null, updatedAt })` — mesma assinatura de observação que o sync usa.
2. `availabilityService.updateAvailability(propertyId, checkIn, checkOut, AVAILABLE, 'released:{reason}')` — libera o período.
3. `iCalGeneratorService.invalidateCache(propertyId, tenantId)` → a data **some** do feed (gerador filtra `cancelled` fora) → Airbnb/Booking reabrem a venda.
4. Se havia caução paga e o cancelamento é dentro de política de reembolso → dispara refund (doc `03`); `deposits.status: 'refunded'`.
5. Idempotência: se já `cancelled`, no-op.

> **Por que não `delete`?** Seguimos o mesmo princípio do sync (soft-delete via `status: cancelled` + observação), preservando histórico para o BI de Atendimentos (doc `07`, "Receita Perdida") — uma data que foi travada e reaberta é sinal valioso de funil.

### 6.3 Diagrama de sequência (reabrir por expiração de hold)

```
Function(closingHoldExpiry @holdExpiresAt)     Firestore             Feed iCal        Dono
   │  carrega reservation                          │                    │              │
   │  status == 'pending' && holdExpiresAt<=now ? ─▶                     │              │
   │   sim → releaseDates(reservationId,'hold-expired')                  │              │
   │     reservations.update(cancelled) ───────────▶                     │              │
   │     updateAvailability(AVAILABLE) ────────────▶                     │              │
   │     invalidateCache ──────────────────────────────────────────────▶ (data some)   │
   │     deposits.status: cancelled/expired (se houver) ─▶               │              │
   │   notify_owner("hold de X expirou, data liberada") ───────────────────────────────▶ push/WhatsApp
   │  não (já confirmada/cancelada) → no-op (idempotente)               │              │
```

### 6.4 Tools do agente (mutação)

| Tool (LLM, snake_case) | Endpoint (kebab-case) | Args | Efeito |
|---|---|---|---|
| `lock_dates` | `lock-dates` | `property_id, check_in, check_out, conversation_id, origin_message_id, hold_ttl_min?` | §4: sync defensivo + checkOverlap + hold + BLOCKED + invalidate + enqueue expiry. Retorna `{locked, reservationId?, conflict?}`. |
| `release_dates` | `release-dates` | `reservation_id, reason` | §6.2: cancela + AVAILABLE + invalidate. |

Registradas em `agent/app/tools/registry.py`, roteadas em `agent/app/tools/client.py` (`_TOOL_PATHS`), implementadas em `app/api/agent/tools/lock-dates/route.ts` e `.../release-dates/route.ts`, autenticadas por `validateAgentRequest` (HMAC `ts.body`, janela 60s). **Não** entram em `READ_ONLY_TOOL_NAMES` (mutam estado) → indisponíveis no modo `analista` do console (FUNDAÇÃO/CLAUDE.md). Tier de modelo: o planner que decide chamá-las roda em `MAIN`; a decisão "travar?" é determinística no servidor, não no LLM (o LLM só pede; o servidor decide com `checkOverlap`).

### 6.5 Assinaturas do helper novo

```ts
// lib/calendar/availability-lock.ts  (NOVO)
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';

export interface OverlapResult {
  free: boolean;
  conflicts: Array<{ reservationId: string; checkIn: Date; checkOut: Date; source: string; isExternal: boolean }>;
}

export interface LockResult {
  locked: boolean;
  reservationId?: string;
  holdExpiresAt?: Date;
  conflict?: OverlapResult['conflicts'][number];
}

class AvailabilityLockService {
  // Half-open interval overlap: [checkIn, checkOut). status ∈ {pending, confirmed}, !externalDeletedAt.
  async checkOverlap(tenantId: string, propertyId: string, checkIn: Date, checkOut: Date,
                     excludeReservationId?: string): Promise<OverlapResult>;

  // Idempotente por (closingConversationId, lockOriginMessageId). Cria hold pending + BLOCKED + invalidate cache.
  async lockDates(tenantId: string, args: {
    propertyId: string; checkIn: Date; checkOut: Date;
    conversationId: string; originMessageId: string; holdTtlMin?: number; depositId?: string;
  }): Promise<LockResult>;

  // pending -> confirmed, BLOCKED -> RESERVED, holdExpiresAt=null, invalidate cache. Idempotente.
  async confirmLock(tenantId: string, reservationId: string): Promise<void>;

  // -> cancelled + AVAILABLE + invalidate cache (espelha o soft-delete do calendar-sync). Idempotente.
  async releaseDates(tenantId: string, reservationId: string, reason: string): Promise<void>;
}
export const availabilityLock = new AvailabilityLockService();
```

> Reusa `services.reservations`, `services.availability.updateAvailability` e `iCalGeneratorService` — não introduz acesso direto ao Firestore fora do `TenantServiceFactory` (FUNDAÇÃO §4.6, isolamento multi-tenant).

---

## 7. Onde a lógica vive (Functions incremental — Decisão 2)

| Lógica | Onde hoje | Onde vai (alvo) | Por quê |
|---|---|---|---|
| `checkOverlap` + criar hold (síncrono, no caminho do fechamento) | Next.js `app/api/agent/tools/lock-dates` | **Permanece em Next.js** (rápido, no caminho do WhatsApp) | É leve e síncrono; não justifica Function. |
| `releaseDates` manual | Next.js `app/api/agent/tools/release-dates` + dashboard | Permanece em Next.js | Idem. |
| **Expiração de hold** (`closingHoldExpiry`) | não existe | **Firebase Function + Cloud Tasks** (agendada para `holdExpiresAt`) | Assíncrono/agendado → primeiro candidato à migração (FUNDAÇÃO Fase 1/2). |
| **Sync defensivo no fechamento** | `calendarSyncService.syncProperty` (chamado de rota) | **Firebase Function** (fetch HTTP externo de iCal, parsing pesado) | Pesado/externo → Function. Rota chama com timeout curto e fallback. |
| Webhook de caução → `confirmLock` | docs `03` | **Function** (webhook idempotente) | Pagamento assíncrono → Function (FUNDAÇÃO §4.3 `deposits.webhookEventIds[]`). |
| Cron de sync iCal (30 min) | `app/api/calendar/sync/cron` | migra a Function quando conveniente | Já é job; baixa prioridade de migração. |

Toda Function usa a **mesma HMAC** (`HMAC-SHA256("{ts}.{body}")`, janela 60s) e o mesmo `logger` com PII mascarada (FUNDAÇÃO §4.6). A Function `closingHoldExpiry` recebe `{tenantId, reservationId}` e **re-checa o status atual antes de reabrir** (idempotência: se `confirmed` ou já `cancelled`, no-op).

---

## 8. Prevenção de overbooking — análise

Há **dois vetores** de overbooking; tratamos ambos:

### 8.1 Overbooking interno (duas conversas Sofia fecham a mesma data)
- **Mitigação:** `checkOverlap` no momento do hold + hold como reserva `pending` durável. A segunda conversa que tentar travar vê o `pending` da primeira e recebe `conflict`.
- **Corrida fina:** Firestore não oferece lock pessimista nativo de range. Mitigamos com (a) escrita do hold seguida de **re-leitura/re-checagem** dentro de uma transação Firestore por propriedade (`runTransaction` sobre o doc de "índice de disponibilidade" da propriedade, ou criação condicional do período de availability como sentinela). (b) Janela de corrida é de milissegundos; o `confirmLock` re-verifica antes de tornar firme. **Trade-off:** não é serialização perfeita; é "checar-escrever-recheck" + reconciliação. Aceitável para o volume (uma propriedade, poucos fechamentos simultâneos). Documentado como risco residual.

### 8.2 Overbooking externo (Airbnb/Booking fecha a mesma data)
- **Mitigação reativa:** o cron de sync (30 min) já importa reservas externas como `confirmed` + `BLOCKED`. Se uma reserva externa cobre a data antes do nosso hold, `checkOverlap` a vê (ela é uma `reservation` com `externalEventUid`).
- **Mitigação proativa no fechamento:** o **sync defensivo** (§4.2 passo 1) reduz a janela para o intervalo entre o último pull externo e o momento do fechamento. Não elimina (Airbnb não nos notifica em push), mas reduz drasticamente.
- **Mitigação de saída:** ao travar, `invalidateCache` faz nosso feed expor a data como `TENTATIVE`/`CONFIRMED` imediatamente; plataformas que importam nosso iCal param de vender. Latência depende da frequência de pull **delas** (fora do nosso controle — risco intrínseco do protocolo iCal).
- **Risco residual:** iCal é pull-based e eventualmente consistente; **overbooking externo não é 100% evitável**. Por isso o `confirmLock` re-checa e, em conflito tardio, reembolsa + escala ao dono. Comunicado honestamente.

---

## 9. Trade-offs e riscos (resumo)

| Decisão | Trade-off / risco | Mitigação |
|---|---|---|
| Hold = reserva `pending` (não coleção nova) | `pending` já é usado por outras origens; precisa distinguir hold de fechamento | `holdExpiresAt` + `closingConversationId` marcam holds de fechamento; queries filtram por eles |
| Reexportar hold como `TENTATIVE` | Algumas plataformas tratam `TENTATIVE` como não-bloqueante | Configurável: opção de exportar hold como `CONFIRMED` (settings); padrão `TENTATIVE` para não bloquear venda real se o cliente desistir |
| Firestore sem lock de range | Corrida fina de overbooking interno | Transação por propriedade + recheck no `confirmLock` + reconciliação; risco residual documentado |
| iCal pull-based | Overbooking externo não 100% evitável | Sync defensivo + invalidação imediata + recheck no confirm + refund/escala honesta |
| Sync defensivo no caminho do fechamento | Latência (fetch externo) na hora de fechar | Function com timeout curto (~8s) + fallback para checagem local + flag de risco no alerta |
| Soft-delete em vez de delete | Lixo acumulado de reservas canceladas | Aceitável; alimenta BI (doc `07`); cleanup opcional por cron |
| Cache in-memory do `iCalGeneratorService` | Em múltiplas instâncias/Functions, invalidação local não cruza processos | Migrar cache do feed para Redis (FUNDAÇÃO §4.6 já usa Redis) — recomendado quando o export migrar a Function |

---

## 10. Checklist de implementação (ordem)

1. Adicionar campos aditivos a `Reservation` (`holdExpiresAt`, `closingConversationId`, `depositId`, `lockOriginMessageId`). — `lib/types/reservation.ts`
2. Criar `lib/calendar/availability-lock.ts` (`checkOverlap`, `lockDates`, `confirmLock`, `releaseDates`) reusando `services.reservations`, `services.availability`, `iCalGeneratorService`.
3. Rotas `app/api/agent/tools/lock-dates` e `.../release-dates` (HMAC `validateAgentRequest`, Zod, `sanitizeUserInput`, `logger`, `TenantServiceFactory`).
4. Tools `lock_dates`/`release_dates` em `registry.py` + `client.py` (`_TOOL_PATHS`); fora de `READ_ONLY_TOOL_NAMES`.
5. Wiring no estado `FECHAMENTO`: `setConversationState` dispara `lock_dates` (IA-finalizadora) ou aguarda dono (Dono-finalizador, doc `06`).
6. `confirmLock` no webhook de caução (doc `03`); recheck de overlap antes de confirmar.
7. Function `closingHoldExpiry` (Cloud Tasks @ `holdExpiresAt`) + sync defensivo como Function (doc `08`).
8. (Recomendado) mover cache do feed iCal para Redis quando export virar Function.

---

## 11. Conformidade com a FUNDAÇÃO

- **Coleções/estados:** usa `reservations`, `deposits`, `conversations.state`, estado `FECHAMENTO`, `AGUARDANDO_HUMANO` — sem renomear. Campos novos são **aditivos**.
- **4 Decisões:** (1) caução por webhook idempotente MP split + AbacatePay coexistindo; (2) expiração/sync/webhook como Functions incrementais; (3) contrato após confirm (doc `04`); (4) trava integrada ao agente proativo/stateful via `setConversationState`.
- **Contratos transversais:** HMAC `ts.body`/60s, `TenantServiceFactory`, idempotência SET NX EX / `(conversationId, originMessageId)` / `webhookEventIds[]`, honestidade (sem fabricar disponibilidade; conflito → resposta honesta + escala), tools `snake_case` / endpoints `kebab-case`.
