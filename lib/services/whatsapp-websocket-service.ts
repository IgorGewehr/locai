'use client';

import { WhatsAppWebSocketMessage, WhatsAppStatusData } from '@/lib/hooks/useWhatsAppStatus';

export type WebSocketEventHandler = (data: WhatsAppStatusData) => void;

export class WhatsAppWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private handlers = new Map<string, WebSocketEventHandler>();
  private isConnecting = false;
  private userId: string | null = null;

  constructor() {
    // Auto-conectar quando WebSocket estiver disponível
    if (typeof window !== 'undefined' && 'WebSocket' in window) {
      this.setupEventListeners();
    }
  }

  // Conectar ao WebSocket
  connect(userId: string): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.userId = userId;
    this.isConnecting = true;

    try {
      // URL do WebSocket - configurar quando backend suportar
      const wsUrl = process.env.NEXT_PUBLIC_WHATSAPP_WS_URL || 'ws://localhost:3001';
      this.ws = new WebSocket(`${wsUrl}/whatsapp/status/${userId}`);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);

    } catch (error) {
      console.warn('[WhatsAppWebSocket] Erro ao conectar:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  // Desconectar
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  // Adicionar handler de eventos
  on(event: string, handler: WebSocketEventHandler): void {
    this.handlers.set(event, handler);
  }

  // Remover handler
  off(event: string): void {
    this.handlers.delete(event);
  }

  // Enviar mensagem
  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  // Handlers de eventos WebSocket
  private handleOpen(): void {
    console.log('[WhatsAppWebSocket] Conectado com sucesso');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    
    // Solicitar status inicial
    this.send({
      type: 'get_status',
      timestamp: Date.now()
    });
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WhatsAppWebSocketMessage = JSON.parse(event.data);
      
      // Processar mensagem baseada no tipo
      switch (message.type) {
        case 'status':
          this.notifyHandlers('status', message.data);
          break;
        case 'qr':
          this.notifyHandlers('qr', message.data);
          break;
        case 'connected':
          this.notifyHandlers('connected', message.data);
          break;
        case 'disconnected':
          this.notifyHandlers('disconnected', message.data);
          break;
        case 'error':
          this.notifyHandlers('error', message.data);
          break;
        default:
          console.warn('[WhatsAppWebSocket] Tipo de mensagem desconhecido:', message.type);
      }
    } catch (error) {
      console.error('[WhatsAppWebSocket] Erro ao processar mensagem:', error);
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log('[WhatsAppWebSocket] Conexão fechada:', event.code, event.reason);
    this.ws = null;
    this.isConnecting = false;

    // Reconectar automaticamente se não foi fechamento manual
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  private handleError(error: Event): void {
    console.error('[WhatsAppWebSocket] Erro na conexão:', error);
    this.isConnecting = false;
  }

  // Agendar reconexão
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WhatsAppWebSocket] Máximo de tentativas de reconexão atingido');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[WhatsAppWebSocket] Reagendando reconexão em ${delay}ms (tentativa ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (this.userId) {
        this.connect(this.userId);
      }
    }, delay);
  }

  // Notificar handlers
  private notifyHandlers(event: string, data: WhatsAppStatusData): void {
    const handler = this.handlers.get(event);
    if (handler) {
      handler(data);
    }
  }

  // Setup event listeners para lifecycle da página
  private setupEventListeners(): void {
    window.addEventListener('beforeunload', () => {
      this.disconnect();
    });

    // Reconectar quando página volta ao foco
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.userId && !this.ws) {
        this.connect(this.userId);
      }
    });

    // Reconectar quando volta online
    window.addEventListener('online', () => {
      if (this.userId && !this.ws) {
        this.connect(this.userId);
      }
    });

    // Desconectar quando fica offline
    window.addEventListener('offline', () => {
      this.disconnect();
    });
  }

  // Getter para status da conexão
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get connectionState(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'unknown';
    }
  }
}

// Instância singleton
export const whatsappWebSocketService = new WhatsAppWebSocketService();