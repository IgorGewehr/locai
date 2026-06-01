# 03 — Pagamentos e caução (Mercado Pago split)

> **🚩 PÓS-MVP.** Faz parte do *finalizador automático* (ver recorte de MVP em
> [`00-overview.md §6`](./00-overview.md)). No MVP o **humano** coleta o pagamento
> após o handoff; este doc só é ativado quando formos automatizar o fechamento.

> **Decisão travada (Fundação §As 4 Decisões / Decisão 1):** Pagamentos via **Mercado Pago com SPLIT PAYMENT**. O dono conecta a própria conta MP por **OAuth em settings**; o split habilita **take-rate (~1%)** e repasse automático ao dono. **AbacatePay coexiste/migra**. Confirmação de caução por **webhook idempotente**.
>
> **Onde a lógica vive (Fundação Decisão 2):** o que é **novo/pesado/assíncrono** nasce em **Firebase Functions** (greenfield, `functions/`). Aqui isso significa: **OAuth callback handler**, **worker de criação de cobrança**, **webhook de confirmação MP** e **jobs de conciliação/devolução de caução**. As rotas Next.js existentes (AbacatePay) permanecem como estão e como fallback de migração.
>
> **Escopo deste documento.** Conector OAuth MP por tenant, split/take-rate, webhook idempotente de confirmação, a **máquina de estados da CAUÇÃO**, teto legal (Lei do Inquilinato, art. 38 — 3 meses), devolução, **coexistência/migração vs AbacatePay** e por que MP, conciliação e segurança. Este doc é parte da **Fase 3 (pagamento/contrato)** do roadmap; depende da máquina de estados de conversa e do defer/resume ([`01`](./01-agente-proativo-stateful.md)) e das modalidades de fechamento ([`02`](./02-fechamento-modalidades.md)).

---

## 1. Contexto e por que Mercado Pago

### 1.1 O que já existe no repo (AbacatePay)

O Locai **já tem um stack de pagamentos funcional** sobre AbacatePay, todo em rotas Next.js (App Router). Mapeando o código real:

| Peça | Arquivo | Papel |
|---|---|---|
| Tipos da API | `lib/types/abacatepay.ts` | Enums `AbacatePayStatus` (`PENDING/PAID/EXPIRED/CANCELLED/REFUNDED`), billing/PIX/withdraw, webhooks, `toCents`/`toBRL`/`formatBRL`, limites |
| Carteira | `lib/types/financial-wallet.ts` | `Wallet`, `WalletTransaction`, `WithdrawalRequest`, `mapAbacatepayWithdrawStatus`, `DEFAULT_WALLET_LIMITS` |
| Criar cobrança | `app/api/ai/functions/create-payment/route.ts` | Cria PIX QR ou Billing (link); grava `transactions` pendente |
| Confirmar/creditar | `app/api/ai/functions/process-payment/route.ts` | **Idempotente** (`processed_payments/{tenantId}_{transactionId}`), verifica na AbacatePay antes de creditar, credita `WalletService` |
| Consultar status | `app/api/ai/functions/check-payment-status/route.ts` | Consulta MP por `paymentId`/telefone, com fallback Firestore |
| Webhook | `app/api/webhooks/abacatepay/route.ts` | Idempotência via `processed_webhooks/{webhookId}`, janela de 15 min, roteia `billing.*`/`pix.*`/`withdraw.*`, credita carteira, notifica |
| Conciliação | `lib/services/abacatepay-reconciliation-service.ts` | `runReconciliation()` compara saldo store MP vs carteiras internas; `reconciliation_logs`, `reconciliation_discrepancies`, `DISCREPANCY_ALERT_THRESHOLD = R$10` |
| Saque / cron | `app/api/ai/functions/execute-withdrawal`, `app/api/cron/sync-abacatepay` | Saque PIX + sync periódico |

> **Princípio de reuso (Fundação §Princípios.5):** **não jogamos isso fora.** O conector MP **espelha** esses padrões (idempotência por documento de controle, verificação antes de creditar, conciliação por discrepância) e reaproveita `toCents`/`toBRL`/`formatBRL` e a `WalletService`.

### 1.2 Por que Mercado Pago (e não só AbacatePay)

| Critério | AbacatePay | Mercado Pago | Veredito |
|---|---|---|---|
| **Split nativo (marketplace)** | Não tem split por destinatário; o dinheiro cai na conta da plataforma e o repasse é manual (saque PIX) | **Split nativo** via `marketplace_fee` + conta conectada do dono (OAuth) | **MP** — é a razão central |
| **Repasse ao dono** | Locai segura o saldo e faz saque PIX para o dono (`execute-withdrawal`) — Locai vira custódia de fato | Dinheiro **liquida direto na conta MP do dono**; Locai retém só o take-rate | **MP** — menos risco regulatório/custódia |
| **Take-rate da plataforma** | Implícito no fluxo de saque | **`marketplace_fee`** explícito por transação (~1% configurável) | **MP** |
| **Onboarding do dono** | Chave PIX do dono em settings | **OAuth** (autoriza Locai a cobrar em nome dele) | Empate funcional, MP é mais robusto |
| **Maturidade/cobertura BR** | Boa, PIX-first | Ampla (PIX, cartão, boleto), SDK consolidado | **MP** |
| **Caução em custódia** | Saldo fica na carteira interna | Pode ficar retido na conta do dono ou na plataforma (modelar — ver §5) | A modelar em ambos |

**Conclusão:** MP é escolhido **pelo split nativo + liquidação direta na conta do dono**, o que tira o Locai do papel de custodiante do dinheiro de aluguel (ele só fica com o take-rate). AbacatePay permanece como **provedor secundário** para tenants já configurados e como **fallback de migração**.

### 1.3 Coexistência e migração (estratégia)

```
                       ┌───────────────────────────────┐
                       │  PaymentProviderRouter        │
                       │  (lib/payments/provider.ts)   │
                       └───────────────┬───────────────┘
            settings.financial.paymentProvider          │
        ('mercadopago' | 'abacatepay' | 'auto')         │
              ┌──────────────────────┴──────────────────────┐
              ▼                                              ▼
   ┌────────────────────┐                       ┌──────────────────────┐
   │ MercadoPagoAdapter │  (novo, §3)           │ AbacatePayAdapter     │ (existente)
   │ functions/ + lib   │                       │ rotas Next.js atuais  │
   └────────────────────┘                       └──────────────────────┘
              │                                              │
              └──────────────┬───────────────────────────────┘
                             ▼
              deposits/{depositId}.provider = 'mercadopago' | 'abacatepay'
              transactions / WalletService (formato único, reusa toCents/toBRL)
```

**Regras de migração (incrementais, sem big-bang — Fundação Decisão 2):**

1. **Flag por tenant:** `settings/financial.paymentProvider`. Default para tenants novos: `mercadopago`. Tenants existentes ficam em `abacatepay` até reconectarem via OAuth.
2. **Sem migração retroativa de cobranças em aberto.** Uma cobrança criada na AbacatePay é confirmada/devolvida pela AbacatePay; uma criada no MP, pelo MP. O campo `deposits.provider` e `transactions.paymentProvider` carregam o roteamento.
3. **Camada de domínio única.** Toda escrita de saldo passa por `WalletService` e por `deposits/{depositId}` no **mesmo formato**, independentemente do provedor. Os adapters só traduzem a API externa.
4. **Conciliação por provedor.** A conciliação MP (§7) roda separada da `abacatepay-reconciliation-service.ts`, escrevendo nas **mesmas** coleções `reconciliation_logs`/`reconciliation_discrepancies` com `provider` discriminado.

**Trade-off:** manter dois provedores aumenta superfície de teste e exige um roteador. Aceito porque (a) evita reescrever um stack que funciona, (b) viabiliza rollout gradual e (c) dá fallback se o OAuth MP falhar no onboarding.

---

## 2. Modelo de dados

### 2.1 `deposits/{depositId}` — entidade canônica (Fundação §4.3)

Conforme a Fundação (não renomear; docs podem **adicionar** campos):

```typescript
// lib/types/deposit.ts  (NOVO)
export type DepositProvider = 'mercadopago' | 'abacatepay';

// Máquina de estados de NEGÓCIO da caução (este doc, §5)
export type DepositState =
  | 'PENDENTE'         // criada, ainda não cobrada
  | 'COBRADA'          // cobrança emitida (PIX/preference), aguardando pagamento
  | 'EM_CUSTODIA'      // paga e retida (caução em garantia durante a locação)
  | 'RETIDA_PARCIAL'   // retenção parcial autorizada (danos/débitos)
  | 'DEVOLVIDA'        // devolvida integralmente ao cliente
  | 'ENCERRADA';       // ciclo concluído (após devolução/retenção)

// Status de PAGAMENTO bruto (alinhado ao §4.3 da Fundação)
export type DepositPaymentStatus =
  | 'pending' | 'paid' | 'refunded' | 'failed' | 'cancelled';

export interface Deposit {
  depositId: string;
  reservationId?: string;
  conversationId: string;            // canônico = {tenantId}:{normalizedPhone}
  clientPhone: string;               // normalizado (normalizeBlockPhone)
  amount: number;                    // CENTAVOS (consistente com toCents/toBRL)
  currency: 'BRL';
  provider: DepositProvider;         // 'mercadopago' | 'abacatepay'
  providerRef: string;               // payment_id / preference_id / pix id / billing id
  splitTakeRate: number;             // ~0.01 (fração; take-rate da plataforma)

  // status de pagamento (Fundação)
  status: DepositPaymentStatus;

  // ---- campos ADICIONADOS por este doc (permitido; não renomeia) ----
  state: DepositState;               // máquina de estados de negócio (§5)
  stateUpdatedAt: Date;
  stateHistory: DepositStateChange[];// trilha de auditoria
  legalCapCents: number;             // teto legal calculado (art. 38, §6)
  monthlyRentCents?: number;         // aluguel mensal base do teto
  retainedAmountCents?: number;      // valor retido em RETIDA_PARCIAL
  retainReason?: string;             // motivo da retenção (danos, débitos)
  refundedAmountCents?: number;      // valor efetivamente devolvido
  refundProviderRef?: string;        // id do refund no provedor
  marketplaceFeeCents?: number;      // take-rate aplicado (split)
  ownerAccountId?: string;           // conta MP do dono (collector)

  paidAt?: Date;
  refundedAt?: Date;
  webhookEventIds: string[];         // idempotência de webhooks já aplicados
  createdAt: Date;
  updatedAt: Date;
}

export interface DepositStateChange {
  from: DepositState;
  to: DepositState;
  reason?: string;
  amountCents?: number;
  byUserId?: string;                 // dono que autorizou (se manual)
  at: Date;
}
```

Coleção (multi-tenant, Fundação §4.6): `tenants/{tenantId}/deposits/{depositId}`. Acesso **sempre** via `TenantServiceFactory` (novo service `services.deposits`).

> **Distinção importante:** `status` (pagamento bruto) e `state` (negócio da caução) são **campos distintos**. `status` espelha o provedor; `state` é a máquina legal/operacional. Mapeamento em §5.4.

### 2.2 Conexão OAuth do dono — `settings/financial`

```typescript
// estende app/api/tenant/settings/financial (settings/financial)
interface FinancialSettings {
  paymentProvider: 'mercadopago' | 'abacatepay' | 'auto';   // roteamento (§1.3)
  mercadopago?: {
    connected: boolean;
    collectorId: string;        // user_id MP do dono (collector / conta destino do split)
    nickname?: string;          // nome da conta para exibir em settings
    scope: string;
    connectedAt: Date;
    lastRefreshAt?: Date;
    // ⚠️ tokens NÃO ficam aqui (ver §8). Apenas metadados públicos.
  };
  takeRate: number;             // fração; default 0.01 (~1%)
}
```

**Segredos OAuth (access/refresh token) NÃO vão para o documento de settings** (Firestore legível pelo dashboard). Vão para coleção isolada cifrada — ver §8.2.

### 2.3 Coleções de controle (idempotência/auditoria)

| Coleção | Chave | Origem | Papel |
|---|---|---|---|
| `tenants/{tenantId}/deposits` | `depositId` | NOVO | Entidade de caução |
| `mp_oauth_states/{state}` | random `state` | NOVO | Anti-CSRF do OAuth (TTL curto) |
| `mp_webhook_events/{eventId}` | id MP | NOVO | Idempotência de webhook MP (espelha `processed_webhooks` da AbacatePay) |
| `processed_payments/{tenantId}_{providerRef}` | composta | **REUSO** do padrão `process-payment` | Idempotência de crédito |
| `reconciliation_logs` / `reconciliation_discrepancies` | id | **REUSO** | Conciliação (com `provider` discriminado) |

---

## 3. Conector Mercado Pago

### 3.1 Onde cada peça vive

| Componente | Local | Tipo |
|---|---|---|
| Adapter MP (SDK, assinatura de tipos) | `lib/payments/mercadopago/adapter.ts` | lib compartilhada (Next + Functions) |
| Roteador de provedor | `lib/payments/provider.ts` | lib |
| Tipos MP | `lib/types/mercadopago.ts` | lib |
| OAuth: iniciar conexão | `app/api/tenant/settings/mercadopago/connect/route.ts` | rota Next (dashboard, auth Firebase) |
| OAuth: callback | **`functions/` → `mpOauthCallback`** | Firebase Function (greenfield) |
| Criar cobrança de caução | **`functions/` → `mpCreateDepositCharge`** (worker) | Firebase Function |
| Webhook de confirmação | **`functions/` → `mpWebhook`** | Firebase Function |
| Devolução/retenção de caução | **`functions/` → `mpDepositRefundJob`** | Firebase Function |
| Conciliação MP | **`functions/` → `mpReconcileJob`** (cron) | Firebase Function |

> **Por que em Functions (Decisão 2):** webhooks de pagamento, geração de cobrança e jobs de devolução são **assíncronos/críticos** e se beneficiam de isolamento, retry e escala independentes do frontend. O [`08-backend-firebase-functions.md`](./08-backend-firebase-functions.md) define a estrutura, deploy, auth HMAC e logging compartilhados; aqui apenas **declaramos** que estas quatro funções são parte do "1º lote pesado".

### 3.2 Tipos e assinaturas do adapter

```typescript
// lib/payments/mercadopago/adapter.ts
import { toCents, toBRL } from '@/lib/types/abacatepay'; // REUSO de utilitários

export interface MpCreateDepositInput {
  tenantId: string;
  conversationId: string;
  clientPhone: string;            // normalizado
  amountCents: number;            // já validado contra o teto legal (§6)
  description: string;
  collectorId: string;            // conta MP do dono (do settings)
  takeRate: number;               // fração (~0.01)
  reservationId?: string;
  externalReference: string;      // = depositId (idempotência ponta-a-ponta)
  payerEmail?: string;
  payerTaxId?: string;            // CPF
}

export interface MpCreateDepositResult {
  providerRef: string;            // payment_id (PIX) ou preference_id (checkout)
  status: DepositPaymentStatus;   // mapeado de MP
  pixCopyPaste?: string;          // point_of_interaction.transaction_data.qr_code
  pixQrCodeBase64?: string;       // qr_code_base64
  checkoutUrl?: string;           // init_point (preference)
  marketplaceFeeCents: number;    // = round(amountCents * takeRate)
  expiresAt?: string;
}

export interface MpAdapter {
  // OAuth
  exchangeCodeForToken(code: string): Promise<MpTokenSet>;
  refreshToken(refreshToken: string): Promise<MpTokenSet>;

  // Cobrança (split): cria pagamento PIX OU preference com marketplace_fee
  createDepositCharge(input: MpCreateDepositInput, accessToken: string): Promise<MpCreateDepositResult>;

  // Consulta
  getPayment(paymentId: string, accessToken: string): Promise<MpPayment>;

  // Devolução total/parcial (refund). MP: POST /v1/payments/{id}/refunds
  refundPayment(paymentId: string, accessToken: string, amountCents?: number): Promise<MpRefund>;
}

export interface MpTokenSet {
  accessToken: string;
  refreshToken: string;
  collectorId: string;   // user_id
  scope: string;
  expiresIn: number;     // segundos
}
```

**Split na prática (MP):** ao criar o pagamento/preference em nome do dono (usando o **access token do dono** obtido por OAuth), o Locai informa `application_fee` / `marketplace_fee = round(amountCents * takeRate)`. O valor líquido liquida na conta do dono; o take-rate vai para a conta de aplicação do Locai. O cálculo do fee é **server-side** e nunca confiado ao cliente.

### 3.3 Mapeamento de status MP → interno

Espelha `mapAbacatePayStatus` do webhook AbacatePay (`app/api/webhooks/abacatepay/route.ts`):

```typescript
// lib/payments/mercadopago/adapter.ts
function mapMpStatus(mp: string): DepositPaymentStatus {
  switch (mp) {
    case 'approved':    return 'paid';
    case 'pending':
    case 'in_process':
    case 'authorized':  return 'pending';
    case 'refunded':
    case 'charged_back':return 'refunded';
    case 'cancelled':
    case 'rejected':    return 'cancelled';
    default:            return 'pending';
  }
}
```

---

## 4. OAuth: conectar a conta do dono (settings)

### 4.1 Diagrama de sequência

```
Dono (dashboard)        locai (Next)              MP OAuth            Function mpOauthCallback        Firestore
   │  clica "Conectar      │                         │                        │                          │
   │  Mercado Pago"        │                         │                        │                          │
   │──────────────────────▶│ GET .../mercadopago/    │                        │                          │
   │                       │ connect (auth Firebase) │                        │                          │
   │                       │  gera state aleatório    │                        │                          │
   │                       │  grava mp_oauth_states/  │                        │                          │
   │                       │  {state}={tenantId,exp} ─┼────────────────────────┼─────────────────────────▶│
   │                       │  302 → auth.mercadopago  │                        │                          │
   │◀──────────────────────┤  .com.br/authorization   │                        │                          │
   │  autoriza no MP ──────┼─────────────────────────▶│                        │                          │
   │                       │                          │  redirect_uri?code=… &state=…                     │
   │                       │                          │───────────────────────▶│ (Function pública)       │
   │                       │                          │                        │ valida state (lê+apaga)  │
   │                       │                          │                        │ (anti-CSRF + TTL)        │
   │                       │                          │  POST /oauth/token      │                          │
   │                       │                          │◀───────────────────────│ exchangeCodeForToken     │
   │                       │                          │  {access,refresh,user_id}                          │
   │                       │                          │                        │ cifra tokens → secrets   │
   │                       │                          │                        │ grava settings/financial │
   │                       │                          │                        │  .mercadopago.connected ─▶│
   │                       │                          │                        │ 302 → dashboard/settings │
   │◀──────────────────────┼──────────────────────────┼────────────────────────┤  ?mp=connected           │
```

### 4.2 Passo a passo

1. **Iniciar (`/api/tenant/settings/mercadopago/connect`, rota Next, `validateFirebaseAuth`):**
   - Gera `state` aleatório (32 bytes hex). Grava `mp_oauth_states/{state} = { tenantId, createdAt, expiresAt(+10min) }`.
   - Monta URL de autorização MP: `client_id=APP_ID`, `response_type=code`, `platform_id=mp`, `redirect_uri=<FUNCTION_URL>/mpOauthCallback`, `state`.
   - Responde `302` (ou retorna a URL para o front redirecionar).
2. **Callback (`functions/mpOauthCallback`, público):**
   - Lê `code` e `state`. **Valida `state`** contra `mp_oauth_states` (existe? não expirou?) e **apaga** (uso único — anti-CSRF/replay).
   - `exchangeCodeForToken(code)` → `{ accessToken, refreshToken, collectorId, scope, expiresIn }`.
   - **Cifra** access/refresh token e grava em `tenants/{tenantId}/secrets/mp_oauth` (§8.2). Grava metadados públicos em `settings/financial.mercadopago` (`connected:true`, `collectorId`, `nickname`, `connectedAt`).
   - Redireciona o dono para `/dashboard/settings/financial?mp=connected`.
3. **Refresh:** `mpReconcileJob` (ou um cron dedicado) renova tokens próximos da expiração via `refreshToken()`, atualizando `secrets/mp_oauth` e `lastRefreshAt`.

**Riscos/trade-offs OAuth:**
- **CSRF** mitigado por `state` de uso único com TTL. **Não** aceitar callback sem `state` válido.
- **Token leak:** tokens **nunca** no doc de settings nem em logs (PII/secret masking, Fundação §4.6). Coleção `secrets/*` com regras restritivas (§8).
- **Conta errada:** exibir `nickname`/`collectorId` em settings para o dono confirmar que conectou a conta certa antes de cobrar.

---

## 5. Ciclo da CAUÇÃO como máquina de estados

> A caução (depósito-garantia) tem um ciclo **legal e operacional** próprio, separado do status bruto de pagamento. Modelamos como máquina de estados em `deposits/{depositId}.state`, com **trilha de auditoria** (`stateHistory`).

### 5.1 Estados (Fundação — nomes fixos)

```
PENDENTE → COBRADA → EM_CUSTODIA → ┬─ RETIDA_PARCIAL ─┐
                                   └─ DEVOLVIDA ───────┴→ ENCERRADA
```

| Estado | Significado | Disparado por |
|---|---|---|
| `PENDENTE` | Caução criada, ainda sem cobrança emitida | criação do `deposit` (fechamento, doc [`02`](./02-fechamento-modalidades.md)) |
| `COBRADA` | Cobrança (PIX/checkout) emitida, aguardando pagamento | `mpCreateDepositCharge` concluído |
| `EM_CUSTODIA` | **Paga** e retida como garantia durante a locação | webhook `approved` |
| `RETIDA_PARCIAL` | Parte retida (danos/débitos), parte a devolver | autorização do dono (manual) |
| `DEVOLVIDA` | Devolução (total ou do saldo após retenção) emitida | `mpDepositRefundJob` |
| `ENCERRADA` | Ciclo concluído (devolução/retenção liquidada) | webhook de refund confirmado |

### 5.2 Transições e guardas

| De → Para | Guarda / condição | Efeito |
|---|---|---|
| `PENDENTE → COBRADA` | `amountCents` validado ≤ `legalCapCents` (§6) e provedor conectado | cria cobrança via adapter; grava `providerRef`, `state=COBRADA`, `status=pending` |
| `COBRADA → EM_CUSTODIA` | webhook `payment.approved` para `providerRef`; valor confere | `status=paid`, `paidAt`, `state=EM_CUSTODIA`; credita registro; notifica dono |
| `COBRADA → ENCERRADA` (atalho cancelamento) | cobrança expirada/cancelada antes de pagar | `status=cancelled`, `state=ENCERRADA` (caução não constituída) |
| `EM_CUSTODIA → DEVOLVIDA` | fim da locação, sem débitos; dono confirma OU automático por política | `mpDepositRefundJob(amount=total)`; `refundedAmountCents`, `state=DEVOLVIDA` |
| `EM_CUSTODIA → RETIDA_PARCIAL` | dono autoriza retenção `retainedAmountCents` com `retainReason` | registra retenção; emite refund do saldo (`amount=total−retido`); `state=RETIDA_PARCIAL` |
| `RETIDA_PARCIAL → ENCERRADA` | refund do saldo confirmado por webhook | `state=ENCERRADA` |
| `DEVOLVIDA → ENCERRADA` | refund confirmado por webhook | `state=ENCERRADA` |

**Toda transição** é atômica e gravada via um único helper:

```typescript
// lib/payments/deposit-state.ts (NOVO)
export async function setDepositState(
  tenantId: string,
  depositId: string,
  to: DepositState,
  ctx: { reason?: string; amountCents?: number; byUserId?: string }
): Promise<void>;
// Lê deposit, valida transição contra a tabela acima (rejeita inválida),
// grava { state:to, stateUpdatedAt:now, push em stateHistory }, atualiza campos derivados.
```

> Espelha a filosofia de `setConversationState()` da Fundação §4.1 (transição única, auditável). Transição inválida → erro logado, estado **não** muda.

### 5.3 Diagrama de sequência — cobrança e custódia (modalidade IA-finalizadora)

```
Cliente (WhatsApp)   agente (/process)   locai tools      Function mpCreateDeposit   MP        Function mpWebhook    Firestore
   │  "quero fechar"     │                    │                    │                  │              │                 │
   │────────────────────▶│ planner decide      │                    │                  │              │                 │
   │                     │ FECHAMENTO (doc 02) │                    │                  │              │                 │
   │                     │ cria deposit PENDENTE────────────────────┼──────────────────┼──────────────┼────────────────▶│
   │                     │ enfileira cobrança ─▶│ (Cloud Tasks)      │                  │              │                 │
   │                     │                      │───────────────────▶│ valida teto (§6) │              │                 │
   │                     │                      │                    │ createDepositCharge (split fee) │                 │
   │                     │                      │                    │─────────────────▶│              │                 │
   │                     │                      │                    │  PIX qr + payment_id            │                 │
   │                     │                      │                    │ state=COBRADA, status=pending ──┼──────────────────▶│
   │  ◀── PIX/QR enviado via /api/v1/messages/{tenantId}/send ───────┤                  │              │                 │
   │  paga o PIX ────────┼──────────────────────┼────────────────────┼─────────────────▶│              │                 │
   │                     │                      │                    │                  │ payment.approved (webhook)     │
   │                     │                      │                    │                  │─────────────▶│ getPayment(id) │
   │                     │                      │                    │                  │              │ idempotência → │
   │                     │                      │                    │                  │              │ state=EM_CUSTODIA, status=paid ─▶│
   │                     │                      │                    │                  │              │ /resume(taskId) (doc 01)        │
   │  ◀── "Caução confirmada! Tudo certo 💛" (re-engajamento via /resume) ──────────────┴──────────────┘                 │
```

> A confirmação **não** bloqueia o turno do cliente: o agente usa `defer_and_work`/`/resume` (Fundação §4.2) para re-engajar quando o webhook chega — exatamente o padrão proativo do doc [`01`](./01-agente-proativo-stateful.md). No modo **Dono-finalizador** (doc [`02`](./02-fechamento-modalidades.md)), antes de cobrar a IA alerta o dono (`notify_owner` + `AGUARDANDO_HUMANO`, Fundação §4.4) e só emite o PIX após o dono liberar.

### 5.4 Mapeamento `status` (pagamento) ↔ `state` (caução)

| `status` (bruto) | `state` típico | Observação |
|---|---|---|
| `pending` | `COBRADA` | aguardando pagamento |
| `paid` | `EM_CUSTODIA` | caução constituída |
| `refunded` | `DEVOLVIDA` ou `RETIDA_PARCIAL`→`ENCERRADA` | depende se houve retenção |
| `cancelled` | `ENCERRADA` (sem custódia) | cobrança não paga |
| `failed` | mantém estado anterior + alerta | erro técnico; reprocessar |

---

## 6. Teto legal (art. 38 da Lei 8.245/91) e devolução

### 6.1 Teto de 3 meses

A Lei do Inquilinato (Lei 8.245/91), **art. 38, §2º**, limita a **caução em dinheiro a, no máximo, 3 (três) meses de aluguel**. O Locai trata locação por temporada/curta como caução-garantia e aplica o teto como **guarda dura**:

```typescript
// lib/payments/deposit-legal.ts (NOVO)
export const DEPOSIT_LEGAL_CAP_MONTHS = 3; // art. 38 §2º Lei 8.245/91

export function legalCapCents(monthlyRentCents: number): number {
  return monthlyRentCents * DEPOSIT_LEGAL_CAP_MONTHS;
}

export function assertWithinLegalCap(amountCents: number, monthlyRentCents: number): void {
  const cap = legalCapCents(monthlyRentCents);
  if (amountCents > cap) {
    throw new PaymentValidationError(
      `Caução (${toBRL(amountCents)}) excede o teto legal de 3 aluguéis (${toBRL(cap)}).`
    );
  }
}
```

- A guarda roda **na transição `PENDENTE → COBRADA`** (server-side, antes de emitir a cobrança). Nunca confiar em valor vindo do cliente ou do LLM.
- `monthlyRentCents` vem da `Reservation`/`Property` (aluguel base). Se ausente → **não cobra** e sinaliza ao dono (Fundação §Princípios.1: sem dado, não fabrica; `costDataAvailable:false`).
- O teto também é exibido em settings como **valor sugerido máximo**, mas o enforcement é no servidor.

> **Honestidade (Fundação §Princípios.1):** a IA **nunca** inventa valor de caução. Ela usa o configurado pelo dono (política) ou o sugerido pelo teto, e se faltar dado pede ao dono via canal IA↔Dono (doc [`06`](./06-canal-ia-dono.md), no fluxo de fechamento do doc [`02`](./02-fechamento-modalidades.md)).

### 6.2 Devolução

- **Prazo:** a devolução segue a política do tenant (settings) + a obrigação legal de restituir ao fim da locação, **corrigida** quando aplicável (art. 38 §2º prevê correção; o cálculo de correção monetária é responsabilidade de política do tenant — o doc **não** fabrica índice).
- **Mecanismo:** `mpDepositRefundJob` chama `refundPayment(paymentId, amountCents?)`:
  - **Total:** `EM_CUSTODIA → DEVOLVIDA` (refund do valor pago, descontado nada).
  - **Parcial (retenção):** `EM_CUSTODIA → RETIDA_PARCIAL`; refund de `total − retainedAmountCents`; `retainReason` obrigatório; `byUserId` (dono que autorizou) registrado em `stateHistory`.
- **Confirmação:** o refund também é assíncrono — MP envia webhook do refund; só então `→ ENCERRADA`.

**Diagrama — devolução parcial:**

```
Dono (dashboard)     locai            Function mpDepositRefundJob     MP        Function mpWebhook   Firestore
   │ "reter R$300       │                       │                      │              │                │
   │  por danos, devolver resto"                │                      │              │                │
   │───────────────────▶│ valida deposit em      │                      │              │                │
   │                    │ EM_CUSTODIA, retido≤total                      │              │                │
   │                    │ setDepositState RETIDA_PARCIAL (byUserId) ─────┼──────────────┼───────────────▶│
   │                    │ enfileira refund(saldo)─▶│ refundPayment(id, total−300)       │                │
   │                    │                          │─────────────────────▶│             │                │
   │                    │                          │  refund pending       │             │                │
   │                    │                          │                       │ refund.approved (webhook)    │
   │                    │                          │                       │────────────▶│ idempotência   │
   │                    │                          │                       │             │ refundedAmount, │
   │                    │                          │                       │             │ state=ENCERRADA▶│
   │ ◀── notificação "Caução encerrada: retido R$300, devolvido R$X" ─────┴─────────────┘                │
```

---

## 7. Webhook idempotente e conciliação

### 7.1 Webhook `mpWebhook` (Function)

**Padrão espelhado do `app/api/webhooks/abacatepay/route.ts`** — mesma disciplina, adaptada ao MP:

1. **Auth do webhook:** MP envia header `x-signature` (HMAC com `MP_WEBHOOK_SECRET`) + `x-request-id`. Validar a assinatura. Rejeitar se inválida (espelha a checagem de `webhookSecret` do AbacatePay, mas com HMAC real).
2. **Idempotência — DEFESA EM CAMADA (Fundação §4.6, SET NX EX / doc de controle).** Idêntica à descrita no doc [`08`](./08-backend-firebase-functions.md); ambos os docs descrevem AS DUAS camadas, iguais entre si:
   - **Camada 1 — log de eventos do provedor (guarda primária):** `eventId = body.id` (id da notificação MP). Tenta `mp_webhook_events/{eventId}` (coleção análoga para AbacatePay) com create-if-absent (SET NX). Se já existe → responde `200` "already processed" (igual ao `processed_webhooks` do AbacatePay).
   - **Camada 2 — `deposits.webhookEventIds[]` (guarda de "evento já aplicado àquela caução"):** `deposits/{depositId}.webhookEventIds[]` registra os eventos já aplicados àquele depósito. Mesmo que um evento passe pela camada 1, a aplicação da transição só ocorre se o `eventId` ainda não constar neste array.
3. **Resolução do depósito:** a notificação MP traz `data.id` (payment_id). `getPayment(paymentId)` → lê `external_reference` (= `depositId`) e `status`. Resolve `tenantId` (de `external_reference` ou metadata).
4. **Aplicar transição:** `mapMpStatus(status)`; chama `setDepositState` conforme §5.2 (`approved`→`EM_CUSTODIA`; refund→`DEVOLVIDA`/`ENCERRADA`). Verifica **valor** (`amountCents` confere) antes de promover a `EM_CUSTODIA` (espelha "verify before credit" do `process-payment`).
5. **Re-engajar:** se há `activeTaskId` aguardando confirmação de caução, chama `/resume` (Fundação §4.2) — idempotente por `resume_done:{tenantId}:{taskId}`. Caso contrário, notifica via `notify_owner`/notificação.
6. **Janela temporal:** rejeitar eventos absurdamente antigos (o AbacatePay usa 15 min; para MP usar a recomendação do provedor + tolerância, mas **a idempotência é a defesa primária**, não a janela).

```typescript
// functions/src/mpWebhook.ts (esboço de contrato)
export const mpWebhook = onRequest(async (req, res) => {
  if (!verifyMpSignature(req)) return res.status(401).send('invalid signature');
  const eventId = req.body?.id ?? `${req.body?.type}_${req.body?.data?.id}`;
  const claimed = await claimWebhookEvent(eventId);      // SET NX no Firestore
  if (!claimed) return res.status(200).send('already processed');

  const paymentId = req.body?.data?.id;
  const { tenantId, accessToken } = await resolveTenantForPayment(paymentId);
  const payment = await mpAdapter.getPayment(paymentId, accessToken); // verify-before-apply
  const depositId = payment.external_reference;
  // ... transição via setDepositState + /resume (idempotente) ...
  return res.status(200).send('ok');
});
```

> **Por que em Function:** webhook precisa responder rápido (`200`) e processar com retry — exatamente o caso de uso de Functions (Decisão 2). HMAC e logging seguem o padrão compartilhado ([`08`](./08-backend-firebase-functions.md)).

### 7.2 Conciliação MP

Espelha `lib/services/abacatepay-reconciliation-service.ts`, mas **por conta de dono** (split → o dinheiro está na conta do dono, não numa store única):

- **Job:** `mpReconcileJob` (cron, Function). Para cada tenant conectado:
  1. Lista `deposits` em `COBRADA`/`EM_CUSTODIA`/`DEVOLVIDA` dos últimos N dias.
  2. Para cada um, `getPayment(providerRef)` e compara `status` MP vs `deposit.status`/`state`. Divergência → atualiza via webhook-replay seguro (idempotente) **e** registra em `reconciliation_discrepancies` com `provider:'mercadopago'`.
  3. Renova tokens OAuth próximos do vencimento (`refreshToken`).
- **Coleções reaproveitadas:** `reconciliation_logs`, `reconciliation_discrepancies` (mesmo formato, campo `provider` adicionado). `DISCREPANCY_ALERT_THRESHOLD` (R$10) reaproveitado.
- **Diferença de modelo:** AbacatePay concilia saldo-store-MP vs carteira interna (Locai custodia). MP concilia **status de cada cobrança** (Locai não custodia o principal — só o take-rate). Logo a conciliação MP é **por transação**, não por saldo agregado.

**Trade-off:** conciliar por transação é mais granular e custa mais chamadas à API MP. Mitigado por (a) só conciliar depósitos não-terminais, (b) processar em lotes (como `syncAllTenants` faz em batches de 5 com delay), (c) confiar no webhook como caminho primário e usar a conciliação só como rede de segurança.

---

## 8. Segurança

### 8.1 Princípios aplicados (Fundação §4.6 + CLAUDE.md)

- **Multi-tenant sempre** via `TenantServiceFactory`; `tenantId` em todo payload e chave.
- **Validação Zod** em toda rota (espelha `CreatePaymentSchema`/`ProcessPaymentSchema`). Valores **sempre em centavos**, positivos, dentro de limites.
- **Idempotência ponta-a-ponta:** `external_reference = depositId`; controle por `mp_webhook_events`, `processed_payments`, `webhookEventIds[]`, `resume_done:*` (SET NX EX).
- **Verify-before-apply:** nunca promover a `EM_CUSTODIA` só pela notificação; sempre `getPayment` e conferir `status` + `amount` (mesma postura do `process-payment` com `verifyWithAbacatePay`).
- **Logging com PII masking** (`logger`, mascara telefone/tenant/token); **nunca** logar token OAuth, `code` OAuth, ou `x-signature`.
- **HMAC interna** (`agent-auth.ts`/`auth.py`) para o eixo locai↔agente↔Functions; **assinatura MP** (`x-signature`) para o eixo MP→webhook.

### 8.2 Custódia de segredos OAuth

- Access/refresh tokens do dono ficam em `tenants/{tenantId}/secrets/mp_oauth`, **cifrados em repouso** (KMS/Secret Manager preferencial; no mínimo cifra simétrica com chave de ambiente — **nunca em texto puro no Firestore**).
- Regras Firestore: coleção `secrets/*` **não legível** pelo dashboard/cliente (só pelo backend/Functions com service account). Settings (`settings/financial.mercadopago`) expõe **apenas metadados** (`connected`, `collectorId`, `nickname`).
- Rotação: refresh automático no `mpReconcileJob`; revogação ao desconectar (settings → apaga `secrets/mp_oauth`, marca `connected:false`).

### 8.3 Anti-fraude / consistência

- **CSRF OAuth:** `state` de uso único com TTL (§4).
- **Replay de webhook:** idempotência por `eventId` (§7.1).
- **Valor adulterado:** o `marketplace_fee` e o `amountCents` são fixados server-side a partir do `deposit` e do teto legal; o cliente nunca define valor.
- **Conta errada do dono:** confirmação visual do `nickname`/`collectorId` em settings antes da 1ª cobrança.

---

## 9. O que reusa vs o que é novo

| Área | Reusa (existente) | Novo |
|---|---|---|
| Utilitários monetários | `toCents`/`toBRL`/`formatBRL` (`lib/types/abacatepay.ts`) | — |
| Carteira/saldo | `WalletService`, `lib/types/financial-wallet.ts` | registro de take-rate como receita do Locai |
| Idempotência de crédito | padrão `processed_payments` (`process-payment`) | `mp_webhook_events`, `webhookEventIds[]` |
| Webhook (disciplina) | padrão `app/api/webhooks/abacatepay/route.ts` | `functions/mpWebhook` (HMAC MP, verify-before-apply) |
| Conciliação | `abacatepay-reconciliation-service.ts`, `reconciliation_logs/discrepancies` | `mpReconcileJob` por-transação, campo `provider` |
| Re-engajamento | defer/resume `/resume` + `resume_done:*` (Fundação §4.2, doc [`01`](./01-agente-proativo-stateful.md)) | gatilho a partir do webhook de caução |
| Canal IA↔Dono | `notify_owner` + `AGUARDANDO_HUMANO` (Fundação §4.4, doc [`06`](./06-canal-ia-dono.md)) | alerta "caução paga"/"autorize retenção" |
| Fechamento | estado `FECHAMENTO` (doc [`02`](./02-fechamento-modalidades.md)) | emissão da caução dentro do fluxo |
| Settings financeiro | `app/api/tenant/settings/financial` | bloco `mercadopago` + OAuth connect/callback |
| Entidade | `transactions` (legado, mantido) | `deposits/{depositId}` + máquina de estados |
| Provedor | AbacatePay (todas as rotas atuais) | `MercadoPagoAdapter` + `PaymentProviderRouter` |
| Backend | rotas Next.js | `functions/` (doc [`08`](./08-backend-firebase-functions.md)): `mpOauthCallback`, `mpCreateDepositCharge`, `mpWebhook`, `mpDepositRefundJob`, `mpReconcileJob` |

---

## 10. Riscos e trade-offs (resumo)

| Risco | Impacto | Mitigação |
|---|---|---|
| Dois provedores em paralelo | Mais superfície de teste/manutenção | Camada de domínio única (`deposits`/`WalletService`); roteamento por flag; migração incremental |
| Token OAuth vazado | Cobranças indevidas em nome do dono | Tokens cifrados em `secrets/*`, fora do dashboard, sem log; rotação/revogação |
| Webhook duplicado/replay | Crédito/refund dobrado | Idempotência tripla (`mp_webhook_events` + `webhookEventIds[]` + verify-before-apply) |
| Caução acima do teto legal | Risco jurídico | Guarda dura `assertWithinLegalCap` na transição `PENDENTE→COBRADA` (server-side) |
| Falta de `monthlyRentCents` | Cálculo de teto impossível | Não cobra; sinaliza dono (honestidade, sem fabricar) |
| Refund parcial sem autorização | Conflito com cliente | `retainReason` + `byUserId` obrigatórios; trilha em `stateHistory` |
| Latência MP / token expirado na cobrança | Cobrança falha no fechamento | Refresh proativo (`mpReconcileJob`); retry da Function; fallback AbacatePay se configurado |
| Conciliação por transação (custo de API) | Muitas chamadas MP | Concilia só depósitos não-terminais, em lotes com delay; webhook como caminho primário |

---

## 11. Roadmap de implementação (dentro da Fase 3)

1. **Tipos + entidade:** `lib/types/mercadopago.ts`, `lib/types/deposit.ts`, service `deposits` no `TenantServiceFactory`; `lib/payments/deposit-state.ts` (`setDepositState`) e `lib/payments/deposit-legal.ts` (teto).
2. **OAuth:** rota `connect` (Next) + `functions/mpOauthCallback` + custódia cifrada de tokens + bloco de settings.
3. **Cobrança:** `MercadoPagoAdapter.createDepositCharge` (split fee) + `functions/mpCreateDepositCharge` (worker, enfileirado no fechamento — doc [`02`](./02-fechamento-modalidades.md)).
4. **Webhook:** `functions/mpWebhook` idempotente + verify-before-apply + transições `EM_CUSTODIA`/refunds + gatilho `/resume`.
5. **Devolução:** `functions/mpDepositRefundJob` (total/parcial) + UI de retenção no dashboard.
6. **Conciliação:** `functions/mpReconcileJob` (cron) reusando `reconciliation_logs/discrepancies` + refresh de tokens.
7. **Roteador/migração:** `PaymentProviderRouter` + flag `settings/financial.paymentProvider`; AbacatePay como fallback.

> Dependências: requer [`01`](./01-agente-proativo-stateful.md) (estado de conversa + defer/resume), [`02`](./02-fechamento-modalidades.md) (estado `FECHAMENTO` e modalidades), e o doc [`08`](./08-backend-firebase-functions.md) para a estrutura/deploy de `functions/`.
