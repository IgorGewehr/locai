# 10 — Onboarding progressivo

> Documento de implementação. Faz parte do blueprint Locai (`docs/blueprint/`).
> Lê e respeita a FUNDAÇÃO (`00-overview.md`): contratos transversais, nomes de
> coleções/estados e as 4 decisões. Não renomeia nem diverge desses contratos.
>
> **Escopo deste doc:** a *jornada de entrada* do dono — onboarding de baixa
> fricção, progressivo (ESSENCIAL primeiro, AVANÇADO depois), com defaults
> inteligentes. O *como* de cada recurso avançado (modos de fechamento, MP,
> contrato, SLA, canal do dono, persona) vive nos docs específicos (`02`, `03`,
> `04`, `06`, `12`). Os **esquemas de dados de config por tenant** (incluindo
> modalidade de fechamento e canal do dono) são donos do `11` (settings). Aqui
> descrevemos **a JORNADA**: a sequência, os gates, o que liga o quê e a evolução
> do Revolutionary Onboarding atual — não definimos esquemas de config.

---

## 1. Objetivo e princípio

A primeira sessão do dono tem **um único trabalho**: deixar a Sofia atendendo
clientes **hoje**. Tudo o que não é estritamente necessário pra isso é empurrado
pra depois, com default seguro. Onboarding não é um wizard de 12 telas; é uma
escada onde cada degrau só aparece quando o anterior foi vencido e quando o dono
tem contexto pra entender o porquê.

Dois eixos, alinhados à VISÃO do produto:

- **ESSENCIAL (Dia 0 — "ligar a Sofia"):** cadastrar **1 imóvel** + **conectar o
  WhatsApp**. Com isso a Sofia capta, responde, mostra fotos/mapa e qualifica.
  Esse é exatamente o escopo do `RevolutionaryOnboarding` atual (2 passos) — e
  **não muda**.
- **AVANÇADO (Dia 1+ — "destravar fechamento e operação"):** modo de fechamento
  (`02`), telefone do dono / canal IA↔Dono (`06`), conectar Mercado Pago
  (`03`), caução + contrato (`04`), SLA de re-ping (`06`), ajuste de persona da
  Sofia (`12`). Tudo com **default inteligente** que já funciona sem
  configuração.

Regra de ouro (princípio 1 da FUNDAÇÃO — Honestidade de dados): o onboarding
**nunca** marca um passo avançado como "feito" sem verificar a condição real
(ex.: `mpConnected===true` só após callback OAuth). Sem confirmação → o passo
fica `pending` e exibimos o estado real, nunca um "pronto" fabricado.

---

## 2. O que já existe (reuso) vs o que é novo

### 2.1 Reuso (não reescrever)

| Peça existente | Arquivo | Papel no onboarding |
|---|---|---|
| Hook base de progresso | `lib/hooks/useOnboarding.ts` | Persistência por `(userId, tenantId)` em `users/{uid}/onboarding/{tenantId}`; CRUD de `steps`, `completionPercentage`, `isCompleted`. |
| Hook estendido | `lib/hooks/useRevolutionaryOnboarding.ts` | Estado rico: `viewMode`, `activeDialog`, `stepInteractions`, `analytics`, badges, dialogs embarcados. |
| Tipos base | `lib/types/onboarding.ts` | `OnboardingStepId`, `OnboardingStepStatus`, `OnboardingProgress`, `DEFAULT_ONBOARDING_STEPS`. |
| Tipos estendidos | `lib/types/revolutionary-onboarding.ts` | `RevolutionaryOnboardingStep`, `OnboardingDialogMode`, `REVOLUTIONARY_ONBOARDING_STEPS`, `DEFAULT_REVOLUTIONARY_STATE`. |
| UI principal | `components/organisms/RevolutionaryOnboarding/RevolutionaryOnboarding.tsx` | Card compacto/expandido/fullscreen, progress bar, dialogs embarcados. |
| Passos | `.../steps/Step1PropertySetup`, `.../steps/Step3WhatsAppSetup` | Diálogos embarcados do imóvel e do WhatsApp. |
| Card de passo | `.../OnboardingStepCard.tsx` | Render de cada passo (ativo/feito/pulado, ação/concluir/pular). |
| Settings existentes | `app/dashboard/settings/{whatsapp,ai-config,financial,policies,profile,negotiation,company}` + `app/api/tenant/settings/*` | Destino dos passos avançados (esquemas no `11`). |
| Bloco manual / estados | `lib/utils/ai-block.ts` + `lib/conversation/state.ts` (doc `01`) | Base para "ligar a Sofia" e para o canal do dono. |

### 2.2 Novo (greenfield neste doc)

- **Nova fase de steps "avançados"** — extensão de `OnboardingStepId` e de
  `REVOLUTIONARY_ONBOARDING_STEPS` (detalhe §4). Aditivo: nenhum tipo renomeado.
- **Card persistente pós-essencial** — o "Painel de Configuração Avançada"
  (a versão expandida do mesmo componente, em `/dashboard/settings`).
- **Verificadores de conclusão server-side** (gates reais) — pequenos
  resolvers que dizem se um passo avançado está de fato satisfeito.
- **`onboardingProfile`** em settings (`11`) — defaults inteligentes e flags de
  conclusão derivadas do estado real do tenant.

> Decisão travada (FUNDAÇÃO §Backend): nada de inflar o frontend com lógica
> pesada. Os verificadores avançados são **leituras** simples (settings + flags),
> não jobs. Geração de contrato, webhook de pagamento etc. continuam nos docs
> `03`/`04` e migram a Functions (`08`).

---

## 3. Modelo de dados (aditivo, camelCase)

A persistência **não muda de lugar**: continua em
`users/{uid}/onboarding/{tenantId}` (escrita pelos hooks existentes). Estendemos
o conjunto de `OnboardingStepId` e adicionamos um espelho de "flags reais" em
settings do tenant para os gates.

### 3.1 `lib/types/onboarding.ts` (estender, não renomear)

```ts
// ANTES (mantido):
export type OnboardingStepId = 'add_property' | 'connect_whatsapp';

// DEPOIS (aditivo) — fase ESSENCIAL + fase AVANÇADA:
export type OnboardingStepId =
  // --- Essencial (fase 0, já existe) ---
  | 'add_property'
  | 'connect_whatsapp'
  // --- Avançado (fase 1+, novo, todos isOptional:true) ---
  | 'set_owner_channel'      // telefone do dono + push -> doc 06 / settings 11
  | 'choose_closing_mode'    // 'ia' | 'owner'         -> doc 02 / settings 11
  | 'connect_mercadopago'    // OAuth MP + split       -> doc 03 / settings 11
  | 'enable_deposit_contract'// caução + contrato       -> docs 03/04 / settings 11
  | 'tune_persona'           // ajuste da Sofia/Analista-> doc 12 / settings 11
  | 'set_sla';               // re-ping do dono         -> doc 06 / settings 11
```

`OnboardingStepStatus` e `OnboardingProgress` **não mudam de forma** — só passam
a conter mais chaves em `steps` (o cálculo de `completionPercentage` já é
genérico: conta `completed/total` em `Object.keys(steps)`).

> **Trade-off / risco — diluição da barra de progresso.** Se jogarmos os 6 passos
> avançados no mesmo `steps` da fase essencial, a barra cai de 50% (1/2) para
> ~12% (1/8) e o dono pensa que "não fez nada". **Mitigação obrigatória:**
> separar em **dois conjuntos de progresso** (ver §5): a barra ESSENCIAL conta só
> `add_property`+`connect_whatsapp`; a barra AVANÇADA conta os 6 opcionais. Os
> hooks já suportam isso porque `completionPercentage` é derivado das chaves
> presentes — basta inicializar dois documentos lógicos (`phase: 'essential' |
> 'advanced'`) OU calcular as duas porcentagens por subconjunto de chaves. Doc
> recomenda **subconjunto de chaves** (1 documento, 2 contadores) para não
> fragmentar a persistência atual.

### 3.2 Flags reais de conclusão — `tenants/{tenantId}/config/onboarding`

> **Esquemas de config não são donos deste doc.** A modalidade de fechamento e o
> canal do dono têm esquema canônico no `11` (settings): a modalidade vive em
> `tenants/{tenantId}/config/closing` (`mode: 'ia' | 'owner'`, default `'owner'`)
> e o canal do dono em `tenants/{tenantId}/config/owner-channel`
> (`ownerWhatsappPhone` normalizado via `normalizeBlockPhone`, `channel`,
> `alertOn*`, `quietHours`). O onboarding **lê e escreve nesses esquemas
> canônicos** — não duplica `closingMode`/`ownerPhone` aqui.

Documento NOVO em config (lido pelos gates; esquema no `11`). **Fonte de verdade
da condição**, não da intenção. Guarda apenas **flags derivadas/de progresso** que
não pertencem a outro esquema canônico. O onboarding compara
`steps[x]==='completed'` com estas flags (e com os esquemas canônicos); se
divergirem, a fonte canônica manda (princípio de honestidade).

```ts
// tenants/{tenantId}/config/onboarding (camelCase)
interface OnboardingFlags {
  // defaults inteligentes (ver §6) — aplicados no provisionamento do tenant.
  // NOTA: closingMode e telefone do dono NÃO vivem aqui — esquemas canônicos
  // são config/closing e config/owner-channel (doc 11). Aqui só flags de progresso.
  slaOwnerRepingMinutes: number;      // default: 30 (re-ping do ask_owner, doc 06)
  personaTuned: boolean;              // default: false (Sofia roda no default)

  // flags DERIVADAS do estado real (read-only p/ os gates) — nunca fabricar:
  mpConnected: boolean;               // true só após callback OAuth MP (03)
  depositContractReady: boolean;      // true só com provider de assinatura + MP ok (04)

  updatedAt: Timestamp;
}
```

> Coexistência AbacatePay (decisão 1): `connect_mercadopago` é o caminho
> recomendado (split nativo). Se o tenant já tem AbacatePay e ainda não conectou
> MP, o passo fica **`pending`** com copy "Pagamentos via AbacatePay já ativos —
> conecte o Mercado Pago para split e repasse automático". Nunca apresentamos MP
> como "feito" só porque AbacatePay existe.

---

## 4. Catálogo de passos

### 4.1 ESSENCIAL (inalterado — Dia 0)

Igual a `REVOLUTIONARY_ONBOARDING_STEPS` / `DEFAULT_ONBOARDING_STEPS` hoje:

| id | título | dialog embarcado | rota fallback | obrigatório |
|---|---|---|---|---|
| `add_property` | Adicionar a primeira propriedade | `property_import` (`Step1PropertySetup`) | `/dashboard/properties/create` | sim |
| `connect_whatsapp` | Conectar o WhatsApp | `whatsapp_connect` (`Step3WhatsAppSetup`) | `/dashboard/settings?tab=whatsapp` | sim |

**Gate de "ligar a Sofia":** ambos `completed`. Não introduzimos verificação
nova aqui — os diálogos atuais já confirmam (imóvel criado / sessão WhatsApp
conectada). A partir desse ponto a Sofia **já atende** com defaults inteligentes
(modo `owner`, persona padrão), sem exigir nenhum passo avançado.

### 4.2 AVANÇADO (novo — Dia 1+, todos `isOptional: true`)

`REVOLUTIONARY_ONBOARDING_STEPS` ganha estes itens (mesmo shape de
`RevolutionaryOnboardingStep`). `dialogMode` reusa o padrão: passos que abrem
config inline usam dialog; o resto deep-linka pra settings (`actionUrl`).

| id | título | ação | gate real (flag) | doc dono |
|---|---|---|---|---|
| `set_owner_channel` | Definir seu canal direto com a IA | dialog inline (telefone + push) | `config/owner-channel.ownerWhatsappPhone != null && push on` | `06` |
| `choose_closing_mode` | Escolher quem fecha a venda | dialog inline (IA vs Você) | `config/closing.mode` definido por escolha explícita | `02` |
| `connect_mercadopago` | Conectar o Mercado Pago | redirect OAuth (`/api/payments/mercadopago/oauth/start`) | `mpConnected===true` | `03` |
| `enable_deposit_contract` | Ativar caução + contrato | dialog (provider de assinatura) | `depositContractReady===true` | `03`+`04` |
| `tune_persona` | Ajustar o jeito da Sofia | deep-link `/dashboard/settings?tab=ai-config` | `personaTuned===true` | `12` |
| `set_sla` | Definir seu SLA de resposta | dialog inline (slider de minutos) | `slaOwnerRepingMinutes` salvo explicitamente | `06` |

`OnboardingDialogMode` é estendido (aditivo) para os passos com dialog inline:

```ts
export type OnboardingDialogMode =
  | 'property_import'
  | 'property_create'
  | 'whatsapp_connect'
  // novos (aditivos):
  | 'owner_channel'
  | 'closing_mode'
  | 'deposit_contract'
  | 'sla'
  | null;
```

Cada novo dialog é um componente irmão de `Step1PropertySetup`/`Step3WhatsAppSetup`
sob `components/organisms/RevolutionaryOnboarding/steps/` (ex.:
`StepOwnerChannel/`, `StepClosingMode/`). O switch de render no
`RevolutionaryOnboarding.tsx` (hoje em `state.activeDialog.mode === ...`) ganha
os novos casos — **mesmo padrão `onComplete`/`onSkip`** já presente.

> **Dependências entre passos avançados** (gating suave, não bloqueante):
> `enable_deposit_contract` só faz sentido depois de `connect_mercadopago`
> (precisa de provedor de cobrança com split p/ caução). O card de
> `enable_deposit_contract` aparece **bloqueado/atenuado** até `mpConnected`,
> com copy "Conecte o Mercado Pago primeiro". Não é um hard-lock no dado — é UX:
> o gate real (`depositContractReady`) já exige `mpConnected` no resolver.

---

## 5. UI / fluxo do dono

### 5.1 Onde cada fase vive

- **ESSENCIAL** → continua como hoje: card injetado no topo do `/dashboard`
  (via `SafeRevolutionaryOnboarding`), com `shouldShow` controlado pelo hook.
  Auto-some ao chegar a 100% da fase essencial (lógica já existe:
  `isFullyCompleted` → auto-dismiss em 3s).
- **AVANÇADO** → **não** aparece no `/dashboard` como pop-up agressivo. Vive como
  uma seção persistente "Configuração avançada" no hub de settings
  (`/dashboard/settings`), reusando o **mesmo componente** em `variant="expanded"`
  filtrado para os passos avançados. Aparece também um *nudge* discreto no
  dashboard ("Você já pode receber pagamentos — conecte o Mercado Pago") só
  quando há ganho claro e o passo está `pending`.

### 5.2 Dois contadores de progresso (mitigação do §3.1)

O componente calcula duas porcentagens a partir do mesmo `steps`:

```ts
const ESSENTIAL_IDS = ['add_property', 'connect_whatsapp'] as const;
const ADVANCED_IDS  = ['set_owner_channel','choose_closing_mode',
  'connect_mercadopago','enable_deposit_contract','tune_persona','set_sla'] as const;

const pct = (ids: readonly OnboardingStepId[]) =>
  Math.round(100 * ids.filter(id => steps[id] === 'completed').length / ids.length);

const essentialPct = pct(ESSENTIAL_IDS); // barra "Ligar a Sofia"
const advancedPct  = pct(ADVANCED_IDS);  // barra "Operação completa"
```

A barra verde existente (`completionPercentage` no card) passa a refletir
`essentialPct` no card do dashboard e `advancedPct` no painel de settings.

### 5.3 Fluxo passo a passo (texto)

**Sessão 1 (Dia 0):**
1. Dono faz signup → tenant provisionado com `OnboardingSettings` default (§6).
2. `useRevolutionaryOnboarding` cria `users/{uid}/onboarding/{tenantId}` com os
   passos essenciais `pending` (comportamento atual).
3. Card compacto no dashboard → "Continuar" abre `Step1PropertySetup`
   (`property_import`). Ao concluir → `completeStep('add_property')`.
4. Próximo passo vira `connect_whatsapp` → `Step3WhatsAppSetup`
   (`whatsapp_connect`) → QR → sessão conectada → `completeStep`.
5. `essentialPct===100` → celebração → auto-dismiss. **Sofia já está atendendo.**

**Sessão 2+ (Dia 1+ — descoberta progressiva):**
6. Ao entrar em `/dashboard/settings`, a seção "Configuração avançada" mostra os
   6 passos opcionais com `advancedPct`. Defaults já ativos, então nada está
   "quebrado"; cada passo é um *upgrade*, não um *requisito*.
7. Dono abre `choose_closing_mode` → escolhe IA-finalizadora ou Você-finaliza →
   grava `config/closing.mode` (esquema do `11`; modalidade no `02`) →
   `completeStep('choose_closing_mode')`.
8. Abre `connect_mercadopago` → redirect OAuth → callback grava `mpConnected` →
   gate resolve verdadeiro → `completeStep('connect_mercadopago')`.
9. `enable_deposit_contract` desbloqueia (porque `mpConnected`) → conecta
   provedor de assinatura (`04`) → `depositContractReady` → `completeStep`.
10. `set_owner_channel` / `set_sla` / `tune_persona` em qualquer ordem.

### 5.4 Diagrama de sequência — passo avançado com gate real (ex.: MP)

```
Dono            RevolutionaryOnboarding        locai API                MP OAuth
 │  clica "Conectar Mercado Pago"                                          │
 ├──────────────▶ handleStepAction(connect_mercadopago)                    │
 │               startStep('connect_mercadopago')  // status in_progress    │
 │               window.location = /api/payments/mercadopago/oauth/start    │
 │ ─────────────────────────────────────────────────────────────────────▶ │ (consent)
 │ ◀───────────────────────────── redirect c/ code ────────────────────────┤
 │                                  /api/payments/mercadopago/oauth/callback │
 │                                   ├─ troca code->token (server, doc 03)   │
 │                                   ├─ config/onboarding.mpConnected=true   │
 │                                   └─ config/payments.* (doc 03)           │
 │  volta a /dashboard/settings                                             │
 ├──────────────▶ resolver de gate: GET /api/onboarding/status             │
 │               ◀── { connect_mercadopago: 'satisfied' }                   │
 │               completeStep('connect_mercadopago')  // honesto: só agora   │
 │               advancedPct recalcula                                       │
```

Pontos-chave: o passo só vira `completed` **depois** do callback gravar a flag —
a UI não confia no clique. O troca-de-token e o webhook idempotente são do doc
`03` (e migram a Functions, `08`); aqui só consumimos a flag.

---

## 6. Defaults inteligentes (o que já funciona sem configurar)

Aplicados no **provisionamento do tenant** (escrita nos esquemas canônicos do
`11` + criação das flags de onboarding), de modo que a Sofia opere bem **antes**
de qualquer passo avançado:

| Campo (esquema) | Default | Por quê |
|---|---|---|
| `config/closing.mode` (doc `11`) | `'owner'` | Princípio 2 (copiloto > autônomo): por padrão o dono fecha; IA faz a parte chata. Modo `'ia'` é opt-in consciente. Esquema dono: `02`/`11`. |
| `config/owner-channel.ownerWhatsappPhone` (doc `11`) | `null` | Sem telefone → canal IA↔Dono cai em **fallback no app** (alerta visual + push web), nunca trava (doc `06`). |
| `config/owner-channel` push | `on` | Alertas web já funcionam sem configurar nada (doc `06`). |
| `slaOwnerRepingMinutes` | `30` | SLA sensato de re-ping do `ask_owner` (doc `06`/`01` §defer). |
| `personaTuned` | `false` | Sofia roda na persona padrão de `prompts.py` (simpática/humanizada) e a Analista no `/operate`. Funciona sem ajuste (doc `12`). |
| `mpConnected` | `false` | Pagamentos seguem via AbacatePay até MP ser conectado (coexistência, decisão 1; doc `03`). |
| `depositContractReady` | `false` | Caução/contrato exigem provedores; até lá, fechamento usa fluxo manual do dono (docs `03`/`04`). |

Consequência: **um tenant que só faz a fase essencial tem um produto completo de
captação/atendimento.** A fase avançada agrega receita/automação, não viabilidade.

---

## 7. Resolver de gates — `GET /api/onboarding/status`

Endpoint NOVO, leve, **read-only**, autenticado por `validateFirebaseAuth`
(usuário/dono no browser — não é caminho do agente). Responde o estado *real* de
cada passo avançado para o componente decidir o que marcar como `completed`.

```ts
// app/api/onboarding/status/route.ts  (App Router, multi-tenant)
// GET -> { steps: Record<OnboardingStepId, 'satisfied' | 'pending' | 'locked'> }
//
// Implementação:
//   const services = new TenantServiceFactory(auth.tenantId);
//   const ob = await services /* config/onboarding (flags) */ .get();
//   const closing = await services /* config/closing (doc 11) */ .get();
//   const owner = await services /* config/owner-channel (doc 11) */ .get();
//   const propertyCount = await services.properties.count();   // gate add_property
//   const waConnected = /* status sessão WhatsApp */;          // gate connect_whatsapp
//   return:
//     add_property:       propertyCount > 0
//     connect_whatsapp:   waConnected
//     set_owner_channel:  owner.ownerWhatsappPhone != null && push on   // doc 06/11
//     choose_closing_mode:closing.modeChosenExplicitly === true         // doc 02/11
//     connect_mercadopago:ob.mpConnected === true
//     enable_deposit_contract: ob.depositContractReady === true   // 'locked' se !mpConnected
//     tune_persona:       ob.personaTuned === true
//     set_sla:            ob.slaChosenExplicitly === true
```

Regras:
- Sem dado → `'pending'` (ou `'locked'`), **nunca `'satisfied'`** (honestidade).
- `enable_deposit_contract` retorna `'locked'` enquanto `!mpConnected` (UX de
  dependência §4.2).
- O resolver **não** dispara mutações nem jobs — é leitura pura, barata.

Trade-off: poderíamos derivar tudo no client lendo settings direto via
`useTenantServices`. Optamos por um endpoint para (a) centralizar a regra de
honestidade num lugar testável e (b) evitar duplicar a lógica de `'locked'` em
React. Custo: um GET extra por abertura do painel — desprezível.

---

## 8. Persistência de escolhas avançadas (settings)

Cada dialog avançado grava no **esquema de config canônico** (doc `11`, dono dos
esquemas), não num store paralelo do onboarding:

| Passo | Grava em (esquema canônico do `11`) | Endpoint |
|---|---|---|
| `set_owner_channel` | `config/owner-channel.{ownerWhatsappPhone,channel,alertOn*,quietHours}` | `PUT /api/tenant/settings/owner-channel` (doc `11`; canal: doc `06`) |
| `choose_closing_mode` | `config/closing.{mode,modeChosenExplicitly}` | `PUT /api/tenant/settings/closing` (doc `11`; modalidade: doc `02`) |
| `set_sla` | `config/onboarding.slaOwnerRepingMinutes` + `slaChosenExplicitly` | `PUT /api/tenant/settings/onboarding` (doc `11`) |
| `connect_mercadopago` | `config/payments.*` + `config/onboarding.mpConnected` | callback OAuth (doc `03`) |
| `enable_deposit_contract` | `config/contracts.*` + `config/onboarding.depositContractReady` | doc `04` |
| `tune_persona` | `config/ai-config.*` | `app/api/tenant/settings/ai-config` (existe; persona: doc `12`) |

O documento `users/{uid}/onboarding/{tenantId}` guarda **só o progresso/UX**
(qual passo, status, analytics). A **configuração real** vive em
`tenants/{tenantId}/config/*` (esquemas canônicos do doc `11`) — multi-tenant,
compartilhável, fonte dos gates.
Isso evita o anti-padrão de duplicar config de negócio dentro do estado de
onboarding de um único usuário (o tenant pode ter vários donos/operadores).

> **Risco — onboarding por-usuário vs config por-tenant.** O progresso é
> `users/{uid}/...` (cada dono vê sua própria escada), mas as flags são do
> tenant. Se o dono A conecta o MP, o gate `connect_mercadopago` resolve
> `'satisfied'` para o dono B também (correto: a config é do negócio). O
> componente deve, ao montar, **reconciliar**: para cada passo cujo gate é
> `'satisfied'` mas o `steps[id]!=='completed'` daquele usuário, chamar
> `completeStep(id)` silenciosamente. Assim a escada de B já reflete o que o
> negócio tem, sem refazer trabalho.

---

## 9. Evolução do Revolutionary Onboarding (resumo do diff)

O que muda no código existente (tudo aditivo):

1. `lib/types/onboarding.ts` — estender `OnboardingStepId` (§3.1).
2. `lib/types/revolutionary-onboarding.ts` — estender `OnboardingDialogMode` e
   adicionar os 6 itens avançados em `REVOLUTIONARY_ONBOARDING_STEPS`
   (`isOptional:true`, `hasEmbeddedDialog` conforme §4.2); ampliar
   `DEFAULT_REVOLUTIONARY_STATE.stepInteractions` com as novas chaves (o hook já
   faz merge com `DEFAULT_REVOLUTIONARY_STATE`, então estados antigos não quebram).
3. `useOnboarding.ts` / `useRevolutionaryOnboarding.ts` — os `initialSteps`
   continuam só com os 2 essenciais (os opcionais entram como `pending` via merge
   do default). Sem mudança de assinatura nos hooks.
4. `RevolutionaryOnboarding.tsx` — (a) novos casos no switch de `activeDialog`;
   (b) computar `essentialPct`/`advancedPct` (§5.2); (c) reconciliação de gates
   no mount (§8) chamando `GET /api/onboarding/status`.
5. Novos componentes `steps/StepOwnerChannel`, `steps/StepClosingMode`,
   `steps/StepDepositContract`, `steps/StepSla` (espelham `Step3WhatsAppSetup`:
   props `open/onClose/onComplete/onSkip`).
6. Novo `app/api/onboarding/status/route.ts` (§7) e os PUTs de settings
   (`owner-channel`, `closing`, `onboarding`) — §8, esquemas formalizados no doc `11`.

**Compatibilidade:** estados de onboarding já salvos continuam válidos —
`loadProgress`/`loadState` fazem spread do default, então as novas chaves de
`steps` simplesmente aparecem como `pending`. `completionPercentage` salvo no
documento legado refletia 2 passos; passa a ser **recalculado por subconjunto**
no client (não confiamos no valor persistido para a barra), evitando o salto
visual descrito no §3.1.

---

## 10. Trade-offs e riscos (consolidado)

- **Fricção vs completude.** Empurrar tudo pra avançado maximiza ativação Dia 0,
  mas alguns donos nunca conectam MP/contrato. Mitigação: *nudges*
  contextuais (§5.1) disparados por evento de negócio real (ex.: 1º lead em
  `closing`) em vez de lembrete genérico.
- **Honestidade dos gates** (FUNDAÇÃO §1). O risco é marcar avançado como feito
  no clique. Mitigado pelo resolver server-side (§7) que só reporta `'satisfied'`
  com dado real; UI nunca completa por otimismo.
- **Diluição da barra** (§3.1). Mitigado por dois contadores derivados de
  subconjuntos de chaves — sem fragmentar a persistência atual.
- **Config tenant vs progresso por-usuário** (§8). Mitigado por reconciliação no
  mount.
- **Dependência MP → caução/contrato** (§4.2). Mitigado por estado `'locked'` no
  resolver + UX atenuada, sem hard-lock no dado.
- **Coexistência AbacatePay/MP** (decisão 1). Onboarding nunca trata AbacatePay
  como substituto do passo MP; copy explícita de "ative split conectando o MP".
- **Custo** (princípio 3). O resolver é leitura barata; nenhuma lógica pesada
  entra no frontend — geração de contrato/webhooks ficam em `03`/`04`/`08`.

---

## 11. Critérios de pronto (DoD)

- [ ] Fase essencial inalterada: dono cadastra 1 imóvel + conecta WhatsApp e a
      Sofia atende, sem tocar em nada avançado.
- [ ] `OnboardingStepId`/`REVOLUTIONARY_ONBOARDING_STEPS` estendidos (aditivo);
      estados legados carregam sem erro.
- [ ] Dois contadores (`essentialPct`/`advancedPct`); barra não dá salto em
      tenants antigos.
- [ ] `GET /api/onboarding/status` retorna estado real; `'satisfied'` só com dado
      confirmado; `enable_deposit_contract` = `'locked'` sem MP.
- [ ] Escolhas avançadas gravam nos esquemas canônicos `tenants/{tenantId}/config/*`
      (doc `11`; fechamento em `config/closing`, canal do dono em
      `config/owner-channel` — não no doc de progresso); reconciliação no mount
      funciona entre donos do mesmo tenant.
- [ ] Defaults inteligentes (§6) aplicados no provisionamento; modo padrão
      `'owner'`.
- [ ] Nenhum nome/coleção/estado da FUNDAÇÃO renomeado; cada passo aponta para o
      doc dono (`02/03/04/06/12`) e os esquemas de config vivem no `11`.
```
