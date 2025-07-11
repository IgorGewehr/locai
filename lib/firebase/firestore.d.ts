// lib/firebase/firestore.d.ts
import type { Client, Conversation } from '@/lib/types';

declare module './firestore' {
  interface FirestoreService<T> {
    // Tenant-aware methods
    getConversationByWhatsAppAndTenant?(
      whatsappNumber: string, 
      tenantId: string
    ): Promise<Conversation | null>;
    
    getConversationsByTenant?(
      tenantId: string,
      active?: boolean
    ): Promise<Conversation[]>;
    
    getClientByPhoneAndTenant?(
      phone: string, 
      tenantId: string
    ): Promise<Client | null>;
    
    getClientsByTenant?(
      tenantId: string,
      active?: boolean
    ): Promise<Client[]>;
  }
}