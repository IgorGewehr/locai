import { db } from '@/lib/firebase/config';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ConversationContext } from '@/lib/types/ai-agent';

export class FirestoreService {
  private tenantId: string;
  
  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  async saveContext(clientPhone: string, context: ConversationContext): Promise<void> {
    try {
      const conversationRef = doc(db, 'conversations', `${this.tenantId}:${clientPhone}`);
      
      await setDoc(conversationRef, {
        tenantId: this.tenantId,
        clientPhone,
        context,
        lastUpdate: serverTimestamp(),
        updatedAt: new Date()
      }, { merge: true });
    } catch (error) {
      console.error('❌ Error saving context:', error);
      throw error;
    }
  }

  async getContext(clientPhone: string): Promise<ConversationContext | null> {
    try {
      const conversationRef = doc(db, 'conversations', `${this.tenantId}:${clientPhone}`);
      const docSnap = await getDoc(conversationRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return data.context || this.getDefaultContext();
      }
      
      return this.getDefaultContext();
    } catch (error) {
      console.error('❌ Error getting context:', error);
      return this.getDefaultContext();
    }
  }

  async updateContext(clientPhone: string, updates: Partial<ConversationContext>): Promise<void> {
    try {
      const conversationRef = doc(db, 'conversations', `${this.tenantId}:${clientPhone}`);
      const currentDoc = await getDoc(conversationRef);
      
      if (currentDoc.exists()) {
        const currentContext = currentDoc.data().context || this.getDefaultContext();
        const updatedContext = { ...currentContext, ...updates };
        
        await updateDoc(conversationRef, {
          context: updatedContext,
          lastUpdate: serverTimestamp(),
          updatedAt: new Date()
        });
      } else {
        await this.saveContext(clientPhone, { ...this.getDefaultContext(), ...updates });
      }
    } catch (error) {
      console.error('❌ Error updating context:', error);
      throw error;
    }
  }

  private getDefaultContext(): ConversationContext {
    return {
      searchFilters: {},
      interestedProperties: [],
      pendingReservation: undefined,
      clientProfile: {
        phone: '',
        preferences: {},
        lastInteraction: new Date()
      }
    };
  }

  async saveConversationHistory(
    clientPhone: string, 
    userMessage: string, 
    aiResponse: string
  ): Promise<void> {
    try {
      const conversationRef = doc(db, 'conversations', `${this.tenantId}:${clientPhone}`);
      const docSnap = await getDoc(conversationRef);
      
      const newMessage = {
        user: userMessage,
        ai: aiResponse,
        timestamp: new Date()
      };
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const history = data.history || [];
        
        // Manter apenas as últimas 10 mensagens para economizar
        const updatedHistory = [...history.slice(-9), newMessage];
        
        await updateDoc(conversationRef, {
          history: updatedHistory,
          lastMessage: userMessage,
          lastResponse: aiResponse,
          lastUpdate: serverTimestamp()
        });
      } else {
        await setDoc(conversationRef, {
          tenantId: this.tenantId,
          clientPhone,
          history: [newMessage],
          lastMessage: userMessage,
          lastResponse: aiResponse,
          lastUpdate: serverTimestamp(),
          createdAt: new Date()
        });
      }
    } catch (error) {
      console.error('❌ Error saving conversation history:', error);
      throw error;
    }
  }

  async getConversationHistory(clientPhone: string): Promise<any[]> {
    try {
      const conversationRef = doc(db, 'conversations', `${this.tenantId}:${clientPhone}`);
      const docSnap = await getDoc(conversationRef);
      
      if (docSnap.exists()) {
        return docSnap.data().history || [];
      }
      
      return [];
    } catch (error) {
      console.error('❌ Error getting conversation history:', error);
      return [];
    }
  }

  async logAgentAction(
    clientPhone: string, 
    action: string, 
    details: any
  ): Promise<void> {
    try {
      const logRef = doc(db, 'agent_logs', `${this.tenantId}:${clientPhone}:${Date.now()}`);
      
      await setDoc(logRef, {
        tenantId: this.tenantId,
        clientPhone,
        action,
        details,
        timestamp: new Date(),
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('❌ Error logging agent action:', error);
      // Não falhar por causa de log
    }
  }
}