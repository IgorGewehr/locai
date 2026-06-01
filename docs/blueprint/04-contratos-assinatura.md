# 04 — Contratos e assinatura (ZapSign/Clicksign)

> **🚩 PÓS-MVP.** Parte do *finalizador automático* (ver recorte de MVP em
> [`00-overview.md §6`](./00-overview.md)). No MVP o humano cuida do contrato após
> fechar; este doc é ativado na fase de automação do fechamento.

> **Decisão travada (Fundador #3):** integrar um **PROVEDOR de assinatura** (ZapSign ou Clicksign) — **não** construir e-signature do zero. **Geração por template determinístico; o LLM só preenche slots.** Webhook idempotente. PDF assinado em **storage seguro** vinculado à reserva.
>
> **Onde a lógica vive (Decisão travada #2 — Functions incremental):** geração de contrato e webhook de assinatura são **assíncronos/pesados → nascem em `functions/`** (greenfield). A UI de exibição/trilha vive no Next.js (App Router). Auth HMAC e multi-tenant preservados em ambos.
>
> **Posição no roadmap (Decisão travada #4):** Fase 3 — pagamento/contrato. Vem **depois** do agente proativo+stateful, do canal IA↔Dono e das modalidades de fechamento. Este doc descreve a entidade `contracts` (canônica, ver `00-overview.md` §4.3) e o fluxo de geração+assinatura+armazenamento+exibição.

---

## 0. Índice

1. Objetivo e escopo
2. Princípios inegociáveis aplicados a contrato
3. Modelo de dados — entidade `contracts` (canônica)
4. Template determinístico (o coração anti-alucinação)
5. Slots: catálogo, tipos, validação e papel do LLM
6. Cláusulas jurídicas obrigatórias (art. 49 CDC, prazo ≤90 dias, pagamento antecipado)
7. Provedor de assinatura — ZapSign vs Clicksign (comparação + recomendação)
8. Camada de abstração `SignatureProvider`
9. Fluxo passo a passo: geração → envio → assinatura → armazenamento
10. Diagramas de sequência (texto)
11. Armazenamento seguro (Firebase Storage) vinculado à reserva
12. Trilha de assinatura (audit trail)
13. Exibição (UI dashboard + WhatsApp)
14. Webhook idempotente do provedor
15. Guard-rails contra alucinação jurídica
16. O que reusa vs o que é novo
17. Trade-offs e riscos
18. Checklist de implementação

---

## 1. Objetivo e escopo

Quando uma conversa entra em `FECHAMENTO` (ver `02-fechamento-modalidades.md` / máquina de estados `01-agente-proativo-stateful.md`) e o fluxo decide emitir o contrato de locação por temporada, o sistema:

1. **Gera** um contrato a partir de um **template versionado e determinístico**, preenchendo apenas **slots** (campos como nome, CPF, datas, valores). A IA **nunca** redige cláusulas livremente.
2. **Envia** o documento para assinatura eletrônica via **provedor** (ZapSign/Clicksign).
3. **Detecta** a assinatura via **webhook idempotente**.
4. **Armazena** o PDF assinado em **Firebase Storage** com regras restritivas, **vinculado à reserva** (`reservationId`) e à conversa (`conversationId`).
5. **Exibe** status e trilha de assinatura no dashboard e, opcionalmente, manda o cliente um aviso pelo WhatsApp.

**Fora de escopo deste doc:** cobrança da caução e split de pagamento (ver `03-pagamentos-caucao-mercadopago.md`); travamento de datas no iCal (ver `05-ical-disponibilidade.md`); detalhes da máquina de estados (ver `01-agente-proativo-stateful.md`). Este doc **consome** os contratos transversais daqueles.

---

## 2. Princípios inegociáveis aplicados a contrato

| Princípio FUNDAÇÃO | Aplicação em contrato |
|---|---|
| **Honestidade de dados** | Slot sem dado confiável ⇒ contrato **não é gerado**. Nunca preencher CPF/valor "aproximado". Falta de dado → `status:draft` bloqueado + alerta ao dono. |
| **Copiloto > autônomo** | Na modalidade Dono-finalizador, o dono **aprova** o draft antes do envio. IA-finalizadora pode enviar direto, mas o template é fixo. |
| **Custo sob controle** | Preenchimento de slots usa tier **`FAST`** (`gpt-4o-mini`) ou, idealmente, **extração estruturada determinística sem LLM** quando os dados já estão na reserva. `DEEP` jamais aqui. |
| **Humano-no-loop** | Falha de geração/envio/assinatura → `notify_owner` + estado `AGUARDANDO_HUMANO`. |
| **Reuso** | `TenantServiceFactory`, HMAC, `StorageService`, `webhookEventIds[]` idempotência, outbound do microserviço, padrão de webhook AbacatePay. |

---

## 3. Modelo de dados — entidade `contracts` (canônica)

> **Fonte canônica:** FUNDAÇÃO §4.3 (ver `00-overview.md` §4.3). Reproduzido aqui **sem renomear**. Este doc apenas **adiciona** campos (permitido pela FUNDAÇÃO: "Docs específicos podem ADICIONAR campos, nunca renomear").

Coleção: `tenants/{tenantId}/contracts/{contractId}` (camelCase).

```typescript
// lib/types/contract.ts  (NOVO)
export interface Contract {
  // --- Canônicos (FUNDAÇÃO §4.3) ---
  contractId: string;
  reservationId?: string;          // vínculo com a reserva (Reservation.id)
  conversationId: string;          // canônico = `${tenantId}:${normalizedPhone}`
  clientPhone: string;             // normalizado via normalizeBlockPhone()
  templateId: string;              // ex.: 'temporada-cdc-v'
  templateVersion: string;         // ex.: '2026-05-01' (versionamento explícito)
  slots: ContractSlots;            // valores que preencheram o template
  provider: 'zapsign' | 'clicksign';
  providerDocId: string;           // id do documento no provedor
  status: 'draft' | 'sent' | 'signed' | 'refused' | 'expired';
  signedPdfUrl?: string;           // Storage path/URL do PDF assinado
  signedAt?: string;               // ISO
  webhookEventIds: string[];       // idempotência (FUNDAÇÃO §4.6)
  createdAt: string;               // ISO
  updatedAt: string;               // ISO

  // --- Adicionados por este doc (NÃO renomear canônicos) ---
  tenantId: string;
  unsignedPdfUrl?: string;         // PDF gerado antes da assinatura (draft)
  signers: ContractSigner[];       // signatários (cliente + dono/imobiliária)
  auditTrailUrl?: string;          // trilha/“log de assinatura” do provedor (PDF/JSON)
  expiresAt?: string;              // prazo de validade do link de assinatura
  guardrailReport?: GuardrailReport; // resultado dos guard-rails (ver §15)
  closingMode?: 'ia' | 'owner';    // espelha conversations.closingMode
  ownerApprovedAt?: string;        // quando o dono aprovou (modalidade owner)
  sentAt?: string;
}

export interface ContractSigner {
  role: 'tenant' | 'landlord';     // locatário / locador
  name: string;
  email?: string;
  phone?: string;                  // normalizado
  cpf?: string;
  signedAt?: string;
  status: 'pending' | 'signed' | 'refused';
  providerSignerId?: string;
}
```

> **Decisão de design:** `slots` é tipado (não `Record<string,any>` aberto) — isso é parte do guard-rail (§5). `webhookEventIds`, `templateVersion` e o vínculo `reservationId`/`conversationId` são os contratos transversais que não podem mudar.

---

## 4. Template determinístico (o coração anti-alucinação)

**Regra dura:** o texto jurídico do contrato é **estático**, versionado e revisado por humano (idealmente advogado). O sistema **não gera prosa jurídica com LLM**. O documento final = `render(template[templateId@templateVersion], slots)`.

### 4.1 Onde vivem os templates

```
functions/src/contracts/templates/
  temporada-cdc-v.2026-05-01.hbs      # template base (HTML/Handlebars-like)
  temporada-cdc-v.2026-05-01.meta.json # metadados: lista de slots obrigatórios, tipos, cláusulas fixas
  README.md                            # changelog + responsável jurídico por versão
```

- Formato: **HTML + placeholders nomeados** (`{{tenantName}}`, `{{checkIn}}`, ...) renderizado para PDF (ver §9).
- **Cláusulas fixas** (art. 49, prazo, foro, multa) ficam **no template**, não em slots. O LLM não consegue tocá-las.
- O `meta.json` declara o **schema dos slots** (nomes, tipos, obrigatoriedade, formato). É a fonte de verdade para validação Zod (§5).

### 4.2 Versionamento

- `templateId` + `templateVersion` são **persistidos no `Contract`**. Isso garante reprodutibilidade: dado um contrato antigo, sabemos exatamente qual texto foi assinado.
- Nova revisão jurídica = **nova `templateVersion`** (nunca editar in-place uma versão já usada em assinatura).
- Trade-off: duplicação de arquivos por versão. Aceitável — auditoria jurídica > economia de arquivos.

---

## 5. Slots: catálogo, tipos, validação e papel do LLM

### 5.1 Catálogo de slots (`ContractSlots`)

```typescript
// lib/types/contract.ts (continuação)
export interface ContractSlots {
  // Locador (imobiliária/dono) — vem de settings (company)
  landlordName: string;
  landlordDocument: string;        // CNPJ/CPF
  landlordAddress: string;

  // Locatário (cliente) — vem de Client/GuestDetail
  tenantName: string;
  tenantDocument: string;          // CPF (validado)
  tenantDocumentType: 'cpf' | 'rg' | 'passport';
  tenantPhone: string;
  tenantEmail?: string;

  // Imóvel — vem de Property
  propertyTitle: string;
  propertyAddress: string;

  // Período — vem de Reservation (checkIn/checkOut)
  checkIn: string;                 // ISO date
  checkOut: string;                // ISO date
  nights: number;                  // derivado/validado contra checkIn/checkOut

  // Financeiro — vem de Reservation (totalAmount) + caução
  totalAmount: number;             // centavos
  depositAmount: number;           // caução, centavos (do doc 03)
  paymentMethod: string;
  currency: 'BRL';

  // Hóspedes
  guestsCount: number;
}
```

Origem dos dados (todos **já existem** no repo):

| Slot | Fonte (repo) |
|---|---|
| `landlord*` | `settings/company` (`app/api/tenant/settings/company`) |
| `tenant*` | `Reservation.client` / `GuestDetail` (isMainGuest), `lib/types/reservation.ts` |
| `property*` | `Property` (`lib/types/property.ts`) |
| `checkIn`/`checkOut`/`nights`/`totalAmount` | `Reservation` (`lib/types/reservation.ts`) |
| `depositAmount` | `deposits/{depositId}.amount` (FUNDAÇÃO §4.3, doc 03) |

### 5.2 Papel do LLM (estritamente limitado)

> **A IA SÓ preenche slots — e somente quando o dado não está estruturado.** Na esmagadora maioria dos casos, **todos os slots já existem como dados estruturados na reserva**, então o caminho padrão é **preenchimento determinístico sem LLM**.

Dois modos de preenchimento:

1. **Determinístico (preferencial):** mapear campos de `Reservation`/`Client`/`Property`/`settings` → `ContractSlots`. Zero LLM. É o caminho default e o mais barato/seguro.
2. **Assistido por LLM (`FAST`, exceção):** apenas quando um dado precisa ser **extraído de texto livre** da conversa (ex.: cliente mandou o CPF por mensagem e não foi salvo em `GuestDetail`). O LLM recebe um prompt de **extração estruturada** (saída JSON com schema fixo), nunca redação. Resultado passa por **validação Zod estrita** antes de virar slot.

### 5.3 Validação (Zod) — barreira obrigatória

```typescript
// functions/src/contracts/slots.schema.ts
const ContractSlotsSchema = z.object({
  tenantName: z.string().min(3).max(120),
  tenantDocument: z.string().refine(isValidCPF, 'CPF inválido'),
  checkIn: z.string().datetime(),
  checkOut: z.string().datetime(),
  nights: z.number().int().positive(),
  totalAmount: z.number().int().positive(),
  depositAmount: z.number().int().nonnegative(),
  // ...
}).refine(
  s => daysBetween(s.checkIn, s.checkOut) <= 90,
  'Prazo de locação por temporada deve ser <= 90 dias'
).refine(
  s => s.nights === daysBetween(s.checkIn, s.checkOut),
  'nights inconsistente com checkIn/checkOut'
);
```

**Se a validação falhar, o contrato NÃO é gerado.** Estado → `draft` com `guardrailReport` populado + `notify_owner`. Honestidade de dados acima de tudo.

---

## 6. Cláusulas jurídicas obrigatórias

As três exigências do escopo são tratadas como **cláusulas fixas no template** + **validações nos slots**:

### 6.1 Art. 49 do CDC — direito de arrependimento e pagamento antecipado

- O contrato de **locação por temporada** envolve **pagamento antecipado**. O template inclui cláusula que referencia o **art. 49 do CDC** (direito de arrependimento em compras fora do estabelecimento, 7 dias) e a **política de cancelamento/reembolso** do tenant.
- A cláusula é **texto fixo** no template — o LLM não a escreve nem a parametriza além dos campos de valor/prazo.
- Slot relacionado: a política concreta (prazos de reembolso) vem de `settings/policies` (já existe: `get-cancellation-policies`, `app/dashboard/settings/policies`). Apenas **valores** entram como slot; o **enunciado jurídico** é fixo.

> Nota: a aplicabilidade literal do art. 49 a locação por temporada é assunto jurídico; o sistema **não decide isso** — ele apenas insere a cláusula que o template (revisado por advogado do tenant) definiu. Ver guard-rails §15.

### 6.2 Prazo ≤ 90 dias

- Locação **por temporada** (Lei 8.245/91, art. 48) tem prazo máximo de **90 dias**.
- **Validação dura** no `ContractSlotsSchema` (§5.3): `daysBetween(checkIn, checkOut) <= 90`. Falha ⇒ contrato bloqueado + alerta ao dono (pode ser caso de outro tipo de contrato, fora do escopo de temporada).

### 6.3 Pagamento antecipado na temporada

- Cláusula fixa: pagamento e caução devidos **antecipadamente** (vínculo com `deposits` e o split MP do doc 03).
- O contrato referencia `totalAmount` e `depositAmount` (slots), mas a **mecânica de cobrança** é do doc de pagamentos. O contrato **declara**, o doc 03 **executa**.

---

## 7. Provedor de assinatura — ZapSign vs Clicksign

> Decisão travada: usar **provedor**. Aqui comparamos os dois candidatos e recomendamos um default, mantendo o sistema **provider-agnóstico** via abstração (§8) — `Contract.provider` é `'zapsign' | 'clicksign'` (canônico).

| Critério | **ZapSign** | **Clicksign** |
|---|---|---|
| Posicionamento | Foco em volume/SMB, API simples, preço agressivo | Mais enterprise, forte em jurídico/compliance |
| API | REST, criação de doc por **template** ou upload de PDF; webhooks por evento | REST robusta, templates, webhooks; documentação madura |
| Assinatura por **WhatsApp** | **Sim, nativo** (envio do link por WhatsApp) — casa com nosso canal | Suporta, foco maior em e-mail |
| Templates com variáveis | Sim (placeholders) — permite delegar render ao provedor | Sim |
| Validade jurídica (BR) | ICP-Brasil opcional, assinatura eletrônica + trilha de auditoria (MP 2.200-2/2001) | Idem, com forte ênfase em compliance/ICP-Brasil |
| Trilha de auditoria | PDF/JSON com IP, timestamp, geolocalização, hash | PDF de auditoria detalhado |
| Preço (ordem de grandeza) | Mais barato por documento; bom para SMB imobiliário | Mais caro; planos enterprise |
| Webhook idempotência | Evento traz id único do documento/evento → mapeia direto em `webhookEventIds[]` | Idem |

### 7.1 Recomendação (default)

**ZapSign como provider default**, pelos motivos alinhados ao produto:

1. **Assinatura via WhatsApp nativa** — coerente com o canal central do Locai (Sofia opera no WhatsApp). O cliente assina sem sair do canal.
2. **Custo menor por documento** — alinha-se ao princípio "Custo sob controle" para SMB imobiliário (o ICP típico do Locai).
3. **API simples** com templates e webhooks suficientes para o fluxo determinístico.

**Clicksign** fica como **alternativa de primeira classe** (já contemplada no enum) para tenants que exijam compliance/ICP-Brasil mais pesado. A abstração (§8) torna a troca uma questão de config por tenant.

> **A escolha por tenant** vive em settings (ver `11-settings.md`): `settings/contracts.provider`. Default global = `zapsign`.

---

## 8. Camada de abstração `SignatureProvider`

Para não acoplar o domínio a um SaaS, define-se uma interface única; cada provedor é um adapter.

```typescript
// functions/src/contracts/providers/types.ts
export interface SignatureProvider {
  readonly id: 'zapsign' | 'clicksign';

  // Cria o documento no provedor a partir do PDF não-assinado + signatários
  createDocument(input: {
    tenantId: string;
    contractId: string;
    pdfBuffer: Buffer;            // PDF determinístico já renderizado
    fileName: string;
    signers: ContractSigner[];
    sendVia: 'whatsapp' | 'email';
    expiresAt?: string;
  }): Promise<{ providerDocId: string; signUrls: Record<string /*role*/, string> }>;

  // Verifica autenticidade do webhook (assinatura/secret do provedor)
  verifyWebhook(rawBody: string, headers: Record<string, string>): boolean;

  // Normaliza o payload do webhook num evento canônico
  parseWebhook(rawBody: string): {
    providerDocId: string;
    eventId: string;             // → webhookEventIds[]
    status: 'sent' | 'signed' | 'refused' | 'expired';
    signedPdfUrl?: string;       // URL temporária no provedor (baixamos e re-armazenamos)
    auditTrailUrl?: string;
    signerUpdates?: Array<{ role: string; status: ContractSigner['status']; signedAt?: string }>;
  };

  // Baixa o PDF assinado final + trilha (para re-armazenar no nosso Storage)
  fetchSignedArtifacts(providerDocId: string): Promise<{ signedPdf: Buffer; auditTrail?: Buffer }>;
}
```

Adapters:
```
functions/src/contracts/providers/zapsign.ts     # ZapSignProvider implements SignatureProvider
functions/src/contracts/providers/clicksign.ts   # ClicksignProvider implements SignatureProvider
functions/src/contracts/providers/index.ts       # getProvider(tenantId) → lê settings, retorna adapter
```

Credenciais por tenant (API token do provedor) em settings, **nunca** no código. Mascaradas em log.

---

## 9. Fluxo passo a passo: geração → envio → assinatura → armazenamento

### 9.1 Gatilho

Disparado quando o fluxo de fechamento decide emitir contrato:
- **IA-finalizadora:** automaticamente ao entrar/avançar em `FECHAMENTO` com pagamento/caução encaminhados.
- **Dono-finalizador:** o dono diz "pode mandar o contrato" no canal IA↔Dono (`/operate`), ou clica num botão no dashboard.

Em ambos os casos, a ação concreta é uma **task assíncrona** (coerente com FUNDAÇÃO §4.2 e Decisão #2). A geração de contrato é um `task_type` candidato (ou um endpoint Function dedicado) — **não** roda no caminho síncrono do WhatsApp.

### 9.2 Passos

1. **Reunir dados** (determinístico): carregar `Reservation`, `Client`/`GuestDetail`, `Property`, `settings/company`, `settings/policies`, `deposits` via `TenantServiceFactory`.
2. **Montar slots** → `ContractSlots`. Se algum dado estiver em texto livre da conversa, extração `FAST` com schema (exceção, §5.2).
3. **Validar slots** com `ContractSlotsSchema` (Zod) — inclui **prazo ≤90d** e CPF. Falha ⇒ `draft` bloqueado + `notify_owner`. **Para aqui.**
4. **Rodar guard-rails** (§15) → `guardrailReport`. `DENY` ⇒ não gera.
5. **Renderizar PDF** determinístico: `render(template@version, slots)` → HTML → PDF (lib de PDF na Function, ex. headless/puppeteer-core ou pdf-lib). Resultado = `unsignedPdf`.
6. **Armazenar `unsignedPdf`** no Storage (§11), gravar `Contract` com `status:draft`, `templateId`, `templateVersion`, `slots`, `unsignedPdfUrl`.
7. **(Dono-finalizador) Aguardar aprovação:** estado conversa permanece, dono aprova (seta `ownerApprovedAt`). IA-finalizadora pula este passo.
8. **Criar documento no provedor:** `getProvider(tenantId).createDocument(...)` → `providerDocId` + `signUrls`. Atualiza `Contract`: `provider`, `providerDocId`, `status:sent`, `sentAt`, `expiresAt`.
9. **Enviar link ao cliente:** via WhatsApp usando o **outbound existente** (`POST {microserviceUrl}/api/v1/messages/{tenantId}/send`, extraído para `lib/whatsapp/outbound.ts`). ZapSign também pode disparar por WhatsApp nativo — escolher 1 para evitar duplicidade (preferir nosso canal para manter UX única).
10. **Cliente assina** no provedor.
11. **Provedor chama nosso webhook** (`signed`) → idempotência por `eventId` → baixar PDF assinado + trilha → **re-armazenar no nosso Storage** → `status:signed`, `signedPdfUrl`, `signedAt`, `auditTrailUrl`.
12. **Transição de estado** (FUNDAÇÃO §4.2): `IA_TRABALHANDO`/`FECHAMENTO` → conforme regra do doc de fechamento. Notificar dono e/ou cliente.

---

## 10. Diagramas de sequência (texto)

### 10.1 Geração + envio (IA-finalizadora)

```
[FECHAMENTO trigger]
   │
   ▼
Next.js (defer_and_work / botão)  ──cria task──▶  deferred_tasks (queued)  ──enqueue──▶  Cloud Tasks
                                                                                            │
                                                                                            ▼
                                                            Function: generateContract worker
                                                              1. carrega Reservation/Client/Property/settings/deposits
                                                              2. monta ContractSlots (determinístico; FAST só p/ extração)
                                                              3. valida Zod (prazo<=90d, CPF)         ──falha──▶ contracts(draft) + notify_owner ▶ FIM
                                                              4. guard-rails (§15)                    ──DENY──▶ idem ▶ FIM
                                                              5. render(template@version, slots) → PDF (unsigned)
                                                              6. Storage.upload(unsigned) + cria contracts(draft)
                                                              7. getProvider(tenant).createDocument() → providerDocId, signUrls
                                                              8. contracts.status=sent
                                                              9. outbound → WhatsApp: "Seu contrato: <signUrl>"
                                                             10. /resume (task done)  → estado conversa atualizado
```

### 10.2 Geração + aprovação (Dono-finalizador)

```
Dono no canal IA↔Dono (/operate): "pode mandar o contrato"
   │
   ▼
mesma task de geração (passos 1–6) → contracts(draft) + unsignedPdfUrl
   │
   ▼
IA mostra preview do draft ao DONO (deep-link p/ contrato no dashboard)
   │
   ├─ Dono aprova ──▶ ownerApprovedAt set ──▶ passos 7–9 (createDocument + envio ao cliente)
   └─ Dono rejeita ──▶ contracts permanece draft / cancelado ; ajusta dados ; regenera
```

### 10.3 Assinatura (webhook idempotente)

```
Cliente assina no ZapSign/Clicksign
   │
   ▼
Provedor ──POST──▶ Function: POST /webhooks/signature/{provider}   (endpoint kebab-case)
                       │ verifyWebhook(secret)            ──inválido──▶ 401
                       │ parseWebhook() → { providerDocId, eventId, status, signedPdfUrl }
                       │ idempotência: contracts.webhookEventIds inclui eventId?  ──sim──▶ 200 (no-op)
                       │ não:
                       │   fetchSignedArtifacts(providerDocId) → signedPdf + auditTrail
                       │   Storage.upload(signedPdf)  → signedPdfUrl (NOSSO storage)
                       │   Storage.upload(auditTrail) → auditTrailUrl
                       │   contracts.update({ status:'signed', signedPdfUrl, auditTrailUrl,
                       │                       signedAt, webhookEventIds: arrayUnion(eventId) })
                       │   (se vinculado) reservations.update({ contractSignedAt })
                       └─ notify_owner + (opcional) WhatsApp ao cliente: "Contrato assinado ✓"
                       ▼
                      200 OK
```

---

## 11. Armazenamento seguro (Firebase Storage) vinculado à reserva

### 11.1 Onde

Padrão consistente com `lib/firebase/storage.ts` (que já define `StorageService` com `basePath`, e serviços especializados como `clientDocumentService = new StorageService('clients/documents')`).

**Caminho dos contratos:**
```
contracts/{tenantId}/{contractId}/unsigned.pdf
contracts/{tenantId}/{contractId}/signed.pdf
contracts/{tenantId}/{contractId}/audit-trail.pdf
```

Novo serviço especializado, reusando a classe existente:
```typescript
// lib/firebase/storage.ts (ADIÇÃO — reusa StorageService)
export const contractStorageService = (tenantId: string) =>
  new StorageService(`contracts/${tenantId}`);
```

> Nas Functions (admin SDK) o upload usa o **Firebase Admin Storage** (não o client SDK do `storage.ts`, que é browser-oriented). O **path/convenção** é o mesmo; a Function escreve via `bucket.file(path).save(buffer, { metadata })`. A classe `StorageService` do client é usada na **UI** para leitura/exibição.

### 11.2 Segurança (regras)

Contratos são PII jurídica sensível → **nunca públicos**.

- **Storage Rules:** o path `contracts/{tenantId}/**` só é legível por usuários autenticados **do mesmo tenant** (regra baseada em custom claim `tenantId`). Sem URLs públicas perenes.
- **Acesso na UI:** via **signed URLs de curta duração** geradas server-side (Function/route autenticada), nunca `getDownloadURL` perene em PDF assinado.
- **Vínculo com a reserva:** `Contract.reservationId` + `Contract.conversationId`. Opcional: gravar `reservations.contractId`/`contractSignedAt` para navegação rápida (adição, não renomeia nada de `Reservation`).
- **Metadata customizada** no objeto Storage: `{ tenantId, contractId, reservationId, templateVersion }` (via `updateMetadata`/`save` metadata) — facilita auditoria e rastreio.
- **PII em log:** mascarar CPF/telefone/URLs (FUNDAÇÃO §4.6).

---

## 12. Trilha de assinatura (audit trail)

Duas camadas complementares:

1. **Trilha do provedor** (`auditTrailUrl`): PDF/JSON gerado por ZapSign/Clicksign com IP, timestamp, geolocalização, hash do documento, identidade dos signatários, base legal (MP 2.200-2/2001). Baixado no webhook e re-armazenado no nosso Storage. **É a prova jurídica.**
2. **Trilha interna** (eventos no `Contract`): cada transição de `status` e cada `webhookEventId` ficam registrados. Recomenda-se subcoleção append-only para histórico humano-legível:

```
tenants/{tenantId}/contracts/{contractId}/events/{eventId}
  { type: 'generated'|'sent'|'viewed'|'signed'|'refused'|'expired'|'owner_approved',
    at: ISO, actor: 'ai'|'owner'|'client'|'provider', meta: {...} }
```

Isso alimenta a exibição (§13) e dá rastreabilidade sem depender só do provedor.

---

## 13. Exibição (UI dashboard + WhatsApp)

### 13.1 Dashboard

- **Na reserva** (`/dashboard/reservations` → detalhe): seção "Contrato" mostrando `status` (badge: Rascunho/Enviado/Assinado/Recusado/Expirado), `templateVersion`, signatários, botões "Baixar PDF assinado" (signed URL curta) e "Ver trilha".
- **Na conversa** (`/dashboard/conversas`): card de contrato no fluxo de `FECHAMENTO`, com deep-link (coerente com canal IA↔Dono `06`).
- **Componente novo:** `components/organisms/contracts/ContractPanel.tsx` (segue estética minimalista/elegante/sem emojis na UI, paleta indigo — preferência registrada). Carrega via `useTenantServices` (mesmo padrão do `ReceitaPerdidaPanel`).

### 13.2 Rota de leitura segura

```
GET /api/contracts/{contractId}/download   // valida Firebase auth + tenant, gera signed URL curta
```
Auth via `validateFirebaseAuth` (padrão do repo). Nunca expõe o path bruto do Storage.

### 13.3 WhatsApp

- Envio do link de assinatura ao cliente via outbound existente.
- Aviso de "assinado ✓" opcional pós-webhook. Texto é **fixo/determinístico** (não passa por LLM) — é notificação transacional.

---

## 14. Webhook idempotente do provedor

Endpoint (Function, kebab-case, FUNDAÇÃO §4.6):
```
POST /webhooks/signature/zapsign
POST /webhooks/signature/clicksign
```

Regras (espelham o padrão **AbacatePay** já existente, FUNDAÇÃO §4.6):
1. **Autenticação:** `verifyWebhook(rawBody, headers)` do adapter (HMAC/secret do provedor). Inválido → 401.
2. **Idempotência:** `eventId` do payload. Se já está em `Contract.webhookEventIds[]` → **200 no-op**. Atualização com `arrayUnion(eventId)` (SET-like). Garante reprocessamento seguro.
3. **Mapeamento de status:** `parseWebhook` → status canônico (`sent|signed|refused|expired`).
4. **Efeitos colaterais** só na **primeira** vez: baixar artefatos, re-armazenar, atualizar `Contract`, notificar.
5. **Resposta rápida:** 200 imediato; trabalho pesado (download/re-upload) pode ser enfileirado (mesma infra de tasks) para não exceder timeout do webhook.

> Onde vive: **`functions/`** (Decisão #2 — webhooks pesados/assíncronos nascem em Functions). HMAC interno do agente não se aplica aqui (é webhook externo do provedor); a autenticação é o secret do provedor.

---

## 15. Guard-rails contra alucinação jurídica

Camadas defensivas, da mais forte à mais fraca:

1. **Template estático** — o LLM **não escreve texto jurídico**. Cláusulas (art. 49, prazo, foro, multa) são fixas e revisadas por humano. Esta é a defesa primária e a mais importante.
2. **Slots tipados + Zod** — o LLM só pode produzir valores que **passam** no schema (`ContractSlotsSchema`). CPF inválido, data fora de formato, prazo >90d ⇒ rejeitado. Extração LLM sempre produz JSON validado, nunca prosa.
3. **Allowlist de slots** — o render só aceita as chaves declaradas no `meta.json` do template. Chave desconhecida vinda do LLM é **descartada** (não injeta no documento).
4. **Sem free-text no documento** — nenhum slot é "observações livres preenchidas pela IA". Campos como `specialRequests` da reserva, se incluídos, passam por sanitização e entram em seção marcada como "declaração do cliente", nunca como cláusula.
5. **`guardrailReport` (PASS/WARN/DENY)** persistido no `Contract`:
   - `DENY`: dado faltante crítico, prazo inválido, CPF inválido, template não encontrado → **não gera**.
   - `WARN`: dado preenchido por LLM (não determinístico) → gera, mas **força revisão do dono** (mesmo na modalidade IA-finalizadora, exige `ownerApprovedAt`).
   - `PASS`: 100% determinístico e válido.
6. **Revisão humana obrigatória quando há LLM** — qualquer slot que veio de extração LLM ⇒ `WARN` ⇒ humano-no-loop antes do envio.
7. **Honestidade de dados** — nunca inventar CPF/valor; faltando, **não gera** e alerta o dono (FUNDAÇÃO §1).
8. **Versionamento auditável** — `templateId@templateVersion` no `Contract` permite provar exatamente qual texto foi assinado.

> Resumo do contrato anti-alucinação: **"o LLM nunca toca o texto; só sugere valores; todo valor é validado; valor de origem LLM exige aprovação humana."**

---

## 16. O que reusa vs o que é novo

### Reusa (já existe no repo)
- **`StorageService`** (`lib/firebase/storage.ts`) — base/convenção de upload, `getFileUrl`, `updateFileMetadata`. Novo `contractStorageService('contracts/{tenantId}')`.
- **`Reservation`/`GuestDetail`/`Client`/`Property`** (`lib/types/reservation.ts`, etc.) — fonte dos slots; vínculo por `reservationId`.
- **`TenantServiceFactory`** (`lib/firebase/firestore-v2.ts`) — leitura/escrita multi-tenant.
- **Outbound WhatsApp** — `POST {microserviceUrl}/api/v1/messages/{tenantId}/send` (extrair `lib/whatsapp/outbound.ts`, FUNDAÇÃO §4.2).
- **Padrão de webhook idempotente** do AbacatePay (`app/api/webhooks/abacatepay`, `webhookEventIds[]`).
- **`notify_owner`** + estado `AGUARDANDO_HUMANO` (canal IA↔Dono, doc `06`).
- **`validateFirebaseAuth`** para rota de download; **HMAC** (`agent-auth.ts`/`auth.py`) entre agente e locai.
- **Tier `FAST`** (`config.py`) para extração de slots; settings (`app/dashboard/settings/*`) para provider/credenciais.
- **Máquina de estados** `FECHAMENTO` (docs `01`/`02`) como gatilho.

### Novo (greenfield)
- Entidade `contracts` + `lib/types/contract.ts` (canônico FUNDAÇÃO §4.3).
- Templates versionados em `functions/src/contracts/templates/`.
- `SignatureProvider` + adapters `zapsign.ts`/`clicksign.ts`.
- Função de geração (worker em `functions/`) + render HTML→PDF.
- Webhooks `POST /webhooks/signature/{provider}` (Functions).
- Rota `GET /api/contracts/{contractId}/download` + `ContractPanel.tsx`.
- Subcoleção `contracts/{id}/events` (trilha interna).
- Settings de contrato (`settings/contracts`: provider, credenciais, template default).

---

## 17. Trade-offs e riscos

| Tema | Trade-off / Risco | Mitigação |
|---|---|---|
| **Template determinístico** | Menos flexível; cada caso novo exige nova versão de template | É exatamente o objetivo (anti-alucinação). Versionamento barato. |
| **Dependência de provedor** | Lock-in, indisponibilidade, mudança de preço | Abstração `SignatureProvider` + enum `zapsign|clicksign`; troca por config. |
| **ZapSign default** | Menos "enterprise" que Clicksign em compliance | Clicksign já é cidadão de 1ª classe; escolha por tenant em settings. |
| **Validade jurídica do art. 49 em temporada** | Aplicabilidade é tema jurídico controverso | Sistema não decide; cláusula é definida no template revisado pelo advogado do tenant. Guard-rail §15. |
| **Render PDF em Function** | Puppeteer é pesado (cold start, memória) | Preferir lib leve (pdf-lib/HTML simples) ou Function com memória dedicada; é assíncrono, fora do caminho do WhatsApp. |
| **Re-armazenar PDF assinado** | URLs do provedor expiram; duplicação | Baixar no webhook e guardar **nosso** PDF é proposital (não depender do provedor para prova). |
| **Extração de slots por LLM** | Risco residual de erro em CPF/valor | Só como exceção; Zod estrito + `WARN` + aprovação humana obrigatória. |
| **PII sensível em Storage** | Vazamento de contrato | Rules por tenant, sem URL pública, signed URLs curtas, metadata + log mascarado. |
| **Idempotência do webhook** | Reentrega do provedor causa duplicidade | `webhookEventIds[]` + arrayUnion; efeitos só na 1ª vez. |
| **Functions ainda inexistentes** | Toda a infra é greenfield | Coerente com Decisão #2; reusa HMAC/logging; ver `08-backend-firebase-functions.md`. |

---

## 18. Checklist de implementação

1. [ ] `lib/types/contract.ts` (`Contract`, `ContractSlots`, `ContractSigner`) — campos canônicos FUNDAÇÃO §4.3.
2. [ ] `functions/src/contracts/templates/temporada-cdc-v.<versão>.{hbs,meta.json}` revisado juridicamente (art. 49, prazo ≤90d, pagamento antecipado fixos).
3. [ ] `slots.schema.ts` (Zod) com validação prazo ≤90d + CPF + consistência `nights`.
4. [ ] Montagem determinística de slots a partir de `Reservation`/`Client`/`Property`/`settings`/`deposits`.
5. [ ] `SignatureProvider` + `ZapSignProvider` (default) + `ClicksignProvider` + `getProvider(tenantId)`.
6. [ ] Worker de geração em `functions/` (render HTML→PDF, upload unsigned, cria `contracts` draft).
7. [ ] `contractStorageService` + paths `contracts/{tenantId}/{contractId}/*` + Storage Rules por tenant.
8. [ ] Envio do link via outbound WhatsApp (`lib/whatsapp/outbound.ts`).
9. [ ] Fluxo de aprovação do dono (modalidade owner; `ownerApprovedAt`; guard-rail `WARN`).
10. [ ] Webhooks `POST /webhooks/signature/{provider}` idempotentes (`webhookEventIds[]`, verify secret).
11. [ ] Download+re-armazenamento do PDF assinado + trilha de auditoria.
12. [ ] Subcoleção `events` (trilha interna).
13. [ ] `GET /api/contracts/{contractId}/download` (signed URL curta, `validateFirebaseAuth`).
14. [ ] `ContractPanel.tsx` na reserva e na conversa (estética minimalista, sem emojis na UI).
15. [ ] Settings de contrato (`settings/contracts`: provider, token, template default) — ver `11`.
16. [ ] Guard-rails §15 com `guardrailReport` PASS/WARN/DENY persistido.
17. [ ] Logging com PII mascarada; HMAC onde aplicável; multi-tenant via `TenantServiceFactory`.

---

> **Resumo de contratos transversais respeitados:** entidade `contracts` canônica (FUNDAÇÃO §4.3, sem renomear); `webhookEventIds[]` + idempotência (§4.6); template versionado + LLM só preenche slots (Decisão #3); lógica de geração/webhook em `functions/` (Decisão #2); gatilho em `FECHAMENTO` (§4.1); `notify_owner`/`AGUARDANDO_HUMANO` (§4.4); tier `FAST` só para extração, nunca `DEEP` no caminho síncrono (§4.5); outbound, Storage, HMAC e `TenantServiceFactory` reusados (§1.5).
