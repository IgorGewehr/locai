// Single instance of WhatsApp session manager
import { WhatsAppSessionManager } from './session-manager';

// Create a single instance to be reused
export const whatsappSessionManager = new WhatsAppSessionManager();