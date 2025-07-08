export interface WhatsAppMessage {
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact' | 'template'
  text?: { body: string }
  image?: { link: string; caption?: string }
  video?: { link: string; caption?: string }
  audio?: { link: string }
  document?: { link: string; filename?: string }
  location?: { latitude: number; longitude: number; name?: string; address?: string }
  contact?: { name: string; phone: string }
  template?: WhatsAppTemplate
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

export interface WhatsAppWebhookData {
  object: string
  entry: WhatsAppWebhookEntry[]
}

export interface WhatsAppWebhookEntry {
  id: string
  changes: WhatsAppWebhookChange[]
}

export interface WhatsAppWebhookChange {
  value: WhatsAppWebhookValue
  field: string
}

export interface WhatsAppWebhookValue {
  messaging_product: string
  metadata: WhatsAppMetadata
  contacts?: WhatsAppContact[]
  messages?: WhatsAppIncomingMessage[]
  statuses?: WhatsAppStatus[]
}

export interface WhatsAppMetadata {
  display_phone_number: string
  phone_number_id: string
}

export interface WhatsAppContact {
  profile: {
    name: string
  }
  wa_id: string
}

export interface WhatsAppIncomingMessage {
  id: string
  from: string
  timestamp: string
  type: MessageType
  text?: { body: string }
  image?: { 
    mime_type: string
    sha256: string
    id: string
    caption?: string
  }
  video?: {
    mime_type: string
    sha256: string
    id: string
    caption?: string
  }
  audio?: {
    mime_type: string
    sha256: string
    id: string
    voice: boolean
  }
  document?: {
    mime_type: string
    sha256: string
    id: string
    filename?: string
  }
  location?: {
    latitude: number
    longitude: number
    name?: string
    address?: string
  }
  contact?: {
    name: string
    phone: string
  }
  context?: {
    from: string
    id: string
  }
}

export interface WhatsAppStatus {
  id: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  recipient_id: string
  conversation?: {
    id: string
    expiration_timestamp?: string
    origin: {
      type: string
    }
  }
  pricing?: {
    billable: boolean
    pricing_model: string
    category: string
  }
}

export interface WhatsAppError {
  code: number
  title: string
  message: string
  error_data?: {
    messaging_product: string
    details: string
  }
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

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  LOCATION = 'location',
  CONTACT = 'contact',
  TEMPLATE = 'template'
}

export interface WhatsAppBusinessProfile {
  about?: string
  address?: string
  description?: string
  email?: string
  messaging_product: string
  profile_picture_url?: string
  websites?: string[]
  vertical?: string
}

export interface WhatsAppPhoneNumber {
  id: string
  display_phone_number: string
  verified_name: string
  code_verification_status: string
  quality_rating: string
  platform: string
  throughput: {
    level: string
  }
}

export interface WhatsAppWebhookVerification {
  'hub.mode': string
  'hub.verify_token': string
  'hub.challenge': string
}