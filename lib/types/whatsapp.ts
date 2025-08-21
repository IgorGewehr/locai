// WhatsApp Types - APENAS Baileys Microservice

export interface WhatsAppSettings {
  businessName?: string;
  webhookUrl?: string;
  mode: 'baileys_microservice';
  connected?: boolean;
  lastSync?: Date | null;
  updatedAt?: Date;
  updatedBy?: string;
  tenantId: string;
}

// WhatsApp Microservice Webhook Data
export interface WhatsAppMicroserviceWebhook {
  event: 'message' | 'status_change' | 'qr_code';
  tenantId: string;
  data: {
    from?: string;
    message?: string;
    messageId?: string;
    status?: 'connected' | 'disconnected' | 'qr';
    qrCode?: string;
    phoneNumber?: string;
    businessName?: string;
  };
}

// Baileys Message Types
export interface BaileysIncomingMessage {
  id: string;
  from: string;
  timestamp: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact';
  text?: {
    body: string;
  };
  image?: {
    caption?: string;
    mimetype: string;
    url?: string;
  };
  video?: {
    caption?: string;
    mimetype: string;
    url?: string;
  };
  audio?: {
    mimetype: string;
    url?: string;
    ptt?: boolean; // push to talk
  };
  document?: {
    caption?: string;
    filename?: string;
    mimetype: string;
    url?: string;
  };
  location?: {
    degreesLatitude: number;
    degreesLongitude: number;
    name?: string;
    address?: string;
  };
}

// WhatsApp Web Types (Baileys-based)

export interface WhatsAppMessage {
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact'
  text?: { body: string }
  image?: { link: string; caption?: string }
  video?: { link: string; caption?: string }
  audio?: { link: string }
  document?: { link: string; filename?: string }
  location?: { latitude: number; longitude: number; name?: string; address?: string }
  contact?: { name: string; phone: string }
}

export interface WhatsAppTemplate {
  name: string
  language: { code: string }
  components: WhatsAppTemplateComponent[]
}

export interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'footer' | 'button'
  sub_type?: 'quick_reply' | 'url'
  index?: number
  parameters?: WhatsAppTemplateParameter[]
}

export interface WhatsAppTemplateParameter {
  type: 'text' | 'image' | 'video' | 'document'
  text?: string
  image?: { link: string }
  video?: { link: string }
  document?: { link: string; filename?: string }
}

// WhatsApp Web Session Types
export interface WhatsAppWebSession {
  id: string
  tenantId: string
  connected: boolean
  phone?: string
  name?: string
  qrCode?: string
  lastActivity: Date
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
}

export interface WhatsAppWebMessage {
  id: string
  from: string
  to: string
  body: string
  timestamp: Date
  type: 'incoming' | 'outgoing'
  mediaUrl?: string
  mediaType?: string
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  LOCATION = 'location',
  CONTACT = 'contact'
}

export interface WhatsAppMediaResponse {
  id: string
}

export interface WhatsAppMediaDetails {
  url: string
  mime_type: string
  sha256: string
  file_size: number
  id: string
}

// Error handling
export class WhatsAppError extends Error {
  code: number
  title: string
  timestamp: Date

  constructor(code: number, message: string, title: string = 'WhatsApp Error') {
    super(message)
    this.name = 'WhatsAppError'
    this.code = code
    this.title = title
    this.timestamp = new Date()
  }
}

// Rate limiting types
export interface RateLimitInfo {
  remaining: number
  resetTime: Date
  limit: number
}

// Connection event types
export interface ConnectionEvent {
  type: 'connecting' | 'connected' | 'disconnected' | 'qr' | 'error'
  data?: any
  timestamp: Date
}