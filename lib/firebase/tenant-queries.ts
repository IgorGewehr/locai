// lib/firebase/tenant-queries.ts
import { query, where, orderBy, getDocs, and, collection } from 'firebase/firestore';
import { db } from './config';
import type { Client, Conversation } from '@/lib/types';
import { conversationService, clientService } from './firestore';

// Extended queries with tenant isolation
export const tenantQueries = {
  async getClientByPhoneAndTenant(phone: string, tenantId: string): Promise<Client | null> {
    const q = query(
      collection(db, 'clients'),
      and(
        where('phone', '==', phone),
        where('tenantId', '==', tenantId)
      )
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as Client;
  },

  async getConversationByWhatsAppAndTenant(
    whatsappNumber: string, 
    tenantId: string
  ): Promise<Conversation | null> {
    const q = query(
      collection(db, 'conversations'),
      and(
        where('whatsappNumber', '==', whatsappNumber),
        where('tenantId', '==', tenantId)
      )
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as Conversation;
  },

  async getConversationsByTenant(
    tenantId: string,
    active?: boolean
  ): Promise<Conversation[]> {
    let q = query(
      collection(db, 'conversations'),
      where('tenantId', '==', tenantId)
    );
    
    if (active !== undefined) {
      q = query(
        collection(db, 'conversations'),
        and(
          where('tenantId', '==', tenantId),
          where('isActive', '==', active)
        ),
        orderBy('lastMessageAt', 'desc')
      );
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Conversation[];
  },

  async getClientsByTenant(
    tenantId: string,
    active?: boolean
  ): Promise<Client[]> {
    let q = query(
      collection(db, 'clients'),
      where('tenantId', '==', tenantId)
    );
    
    if (active !== undefined) {
      q = query(
        collection(db, 'clients'),
        and(
          where('tenantId', '==', tenantId),
          where('isActive', '==', active)
        ),
        orderBy('createdAt', 'desc')
      );
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Client[];
  }
};

// Extend existing services with tenant-aware methods
conversationService.getConversationByWhatsAppAndTenant = tenantQueries.getConversationByWhatsAppAndTenant;
conversationService.getConversationsByTenant = tenantQueries.getConversationsByTenant;

clientService.getClientByPhoneAndTenant = tenantQueries.getClientByPhoneAndTenant;
clientService.getClientsByTenant = tenantQueries.getClientsByTenant;