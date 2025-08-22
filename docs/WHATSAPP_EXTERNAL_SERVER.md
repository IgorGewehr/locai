# Solução: Servidor Externo para WhatsApp (Baileys)

## Por que esta solução?

✅ **Multi-tenant**: Cada cliente conecta seu próprio WhatsApp via QR  
✅ **Dinâmico**: Sem aprovação prévia necessária  
✅ **Simples**: QR code + scan = conectado  
✅ **Escalável**: Suporta múltiplos clientes simultaneamente  

## Arquitetura

```
[Netlify App] ←→ [Servidor WhatsApp] ←→ [WhatsApp Web]
    (API)           (Baileys + API)       (Múltiplas sessões)
```

## Implementação

### 1. Servidor WhatsApp Dedicado (Node.js + Express)

```javascript
// whatsapp-server/server.js
const express = require('express');
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const app = express();

const sessions = new Map(); // tenant → socket
const qrCodes = new Map(); // tenant → qr

// API: Iniciar sessão e gerar QR
app.post('/sessions/:tenantId/start', async (req, res) => {
  const { tenantId } = req.params;
  
  try {
    const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${tenantId}`);
    
    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['LocAI', 'Chrome', '120.0.0']
    });

    socket.ev.on('creds.update', saveCreds);
    
    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        const qrDataUrl = await QRCode.toDataURL(qr);
        qrCodes.set(tenantId, qrDataUrl);
        console.log(`QR gerado para ${tenantId}`);
      }
      
      if (connection === 'open') {
        sessions.set(tenantId, socket);
        console.log(`${tenantId} conectado!`);
      }
    });

    res.json({ success: true, message: 'Sessão iniciada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Obter QR Code
app.get('/sessions/:tenantId/qr', (req, res) => {
  const { tenantId } = req.params;
  const qr = qrCodes.get(tenantId);
  
  if (qr) {
    res.json({ qrCode: qr });
  } else {
    res.json({ qrCode: null });
  }
});

// API: Enviar mensagem
app.post('/sessions/:tenantId/send', async (req, res) => {
  const { tenantId } = req.params;
  const { to, message } = req.body;
  
  const socket = sessions.get(tenantId);
  if (!socket) {
    return res.status(400).json({ error: 'Sessão não conectada' });
  }
  
  try {
    await socket.sendMessage(to, { text: message });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => {
  console.log('Servidor WhatsApp rodando na porta 3001');
});
```

### 2. Deploy do Servidor

**Opções de hospedagem:**

#### A) **DigitalOcean Droplet** ($6/mês)
```bash
# Criar droplet Ubuntu
# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clonar e rodar servidor
git clone seu-repo/whatsapp-server
cd whatsapp-server
npm install
npm start
```

#### B) **Render** (Grátis)
```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

#### C) **Render** (Grátis)
- Deploy automático via GitHub
- Auto-scaling incluído

### 3. Integração com Netlify

```typescript
// lib/whatsapp/external-whatsapp-api.ts
export class ExternalWhatsAppAPI {
  private baseUrl = process.env.WHATSAPP_SERVER_URL; // https://seu-servidor.ondigitalocean.app
  
  async startSession(tenantId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/sessions/${tenantId}/start`, {
      method: 'POST'
    });
    return response.ok;
  }
  
  async getQRCode(tenantId: string): Promise<string | null> {
    const response = await fetch(`${this.baseUrl}/sessions/${tenantId}/qr`);
    const data = await response.json();
    return data.qrCode;
  }
  
  async sendMessage(tenantId: string, to: string, message: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/sessions/${tenantId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, message })
    });
    return response.ok;
  }
}
```

## Opção 2: Serviços Terceirizados (WhatsApp como Serviço)

### A) **WhatsApp Business Solution Providers (BSPs)**

1. **360Dialog** - €49/mês
   - API completa do WhatsApp
   - QR code para cada cliente
   - Suporte multi-tenant

2. **Twilio** - $0.005/mensagem
   - WhatsApp Business API
   - Múltiplos números
   - Webhooks incluídos

3. **MessageBird** - €9/mês
   - WhatsApp API
   - Dashboard para cada cliente
   - Integração simples

### B) **APIs Não-Oficiais (Mais Simples)**

1. **WhatsApp-Web.js Services**
   - Chat API: $29/mês
   - WhatsMate: $15/mês
   - Ultramsg: $10/mês

2. **Baileys como Serviço**
   - WA Business: $20/mês
   - WhatsAPI: $25/mês

## Opção 3: Híbrida (Melhor Custo-Benefício)

### Servidor Próprio + Multi-instância

```javascript
// Servidor que suporta múltiplas instâncias
class WhatsAppMultiTenant {
  constructor() {
    this.instances = new Map();
  }
  
  async createInstance(tenantId) {
    // Criar pasta isolada para o tenant
    const authDir = `./sessions/${tenantId}`;
    
    // Cada tenant tem sua própria sessão Baileys
    const socket = await this.initializeBaileys(authDir);
    
    this.instances.set(tenantId, {
      socket,
      status: 'disconnected',
      qr: null,
      phone: null
    });
  }
  
  // APIs REST para cada operação
  // /api/tenants/:id/start
  // /api/tenants/:id/qr  
  // /api/tenants/:id/send
  // /api/tenants/:id/status
}
```

## Custos Comparativos

| Solução | Custo Mensal | Complexidade | Multi-tenant |
|---------|-------------|--------------|---------------|
| Servidor DigitalOcean | $6 | Média | ✅ Ilimitado |
| Render/Heroku | $0-$20 | Baixa | ✅ Ilimitado |
| 360Dialog BSP | €49 | Baixa | ✅ Com limites |
| Twilio | Por uso | Baixa | ✅ Por número |
| Chat API | $29 | Muito Baixa | ✅ Incluído |

## Recomendação

**Para seu caso (SaaS multi-tenant):**

1. **Melhor opção**: Servidor DigitalOcean/Render + Baileys próprio
2. **Mais simples**: Chat API ou WhatsMate  
3. **Mais robusta**: 360Dialog BSP

## Implementação Imediata

Vou implementar a **Opção 1** agora mesmo:
- Servidor externo com Baileys
- APIs REST para comunicação
- Deploy no DigitalOcean (droplet $6/mês)
- Integração com seu Netlify

Esta é a ÚNICA forma de ter QR code dinâmico para cada cliente!