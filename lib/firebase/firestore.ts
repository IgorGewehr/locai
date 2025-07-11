import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  writeBatch,
  onSnapshot,
  QuerySnapshot,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from './config';
import type {
  Property,
  Reservation,
  Client,
  Conversation,
  Message,
  Amenity,
  Payment,
  Transaction,
} from '@/lib/types';

// Collections
export const COLLECTIONS = {
  PROPERTIES: 'properties',
  RESERVATIONS: 'reservations',
  CLIENTS: 'clients',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  AMENITIES: 'amenities',
  PAYMENTS: 'payments',
  TRANSACTIONS: 'transactions',
} as const;

// Query options interface
export interface QueryOptions {
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  startAfter?: any;
}

// Generic CRUD operations
export class FirestoreService<T extends { id: string }> {
  protected collection: ReturnType<typeof collection>;
  protected db = { getDocs }; // Add db property for compatibility
  
  constructor(private collectionName: string) {
    this.collection = collection(db, this.collectionName);
  }

  protected async query(queryRef: any): Promise<T[]> {
    const querySnapshot = await getDocs(queryRef);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];
  }

  async create(data: Omit<T, 'id'>): Promise<T> {
    const docRef = await addDoc(collection(db, this.collectionName), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return {
      id: docRef.id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as T;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
    const updated = await this.get(id);
    if (!updated) {
      throw new Error('Document not found after update');
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await deleteDoc(docRef);
  }

  async get(id: string): Promise<T | null> {
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
  }

  // Alias for backward compatibility
  async getById(id: string): Promise<T | null> {
    return this.get(id);
  }

  async getAll(): Promise<T[]> {
    const querySnapshot = await getDocs(collection(db, this.collectionName));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];
  }

  async getWhere(
    field: string,
    operator: any,
    value: any,
    orderByField?: string,
    limitCount?: number
  ): Promise<T[]> {
    let q = query(collection(db, this.collectionName), where(field, operator, value));
    
    if (orderByField) {
      q = query(q, orderBy(orderByField, 'desc'));
    }
    
    if (limitCount) {
      q = query(q, limit(limitCount));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];
  }

  // Add method to support compatibility with existing services
  async queryDocuments(queryRef: any): Promise<T[]> {
    const querySnapshot = await getDocs(queryRef);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];
  }

  async getMany(
    filters: Array<{ field: string; operator: any; value: any }>,
    options?: QueryOptions
  ): Promise<T[]> {
    let constraints: any[] = filters.map(f => where(f.field, f.operator, f.value));
    
    if (options?.orderBy) {
      constraints.push(orderBy(options.orderBy, options.orderDirection || 'asc'));
    }
    
    if (options?.limit) {
      constraints.push(limit(options.limit));
    }
    
    if (options?.startAfter) {
      constraints.push(startAfter(options.startAfter));
    }

    const q = query(collection(db, this.collectionName), ...constraints);
    const querySnapshot = await getDocs(q);
    
    let results = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];

    // Handle offset for pagination
    if (options?.offset) {
      results = results.slice(options.offset);
    }

    return results;
  }

  async count(filters?: Array<{ field: string; operator: any; value: any }>): Promise<number> {
    let constraints: any[] = [];
    
    if (filters) {
      constraints = filters.map(f => where(f.field, f.operator, f.value));
    }

    const q = constraints.length > 0 
      ? query(collection(db, this.collectionName), ...constraints)
      : collection(db, this.collectionName);
      
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  }

  onSnapshot(callback: (data: T[]) => void, constraints?: any[]): () => void {
    let q = collection(db, this.collectionName);
    
    if (constraints?.length) {
      q = query(q, ...constraints) as any;
    }

    return onSnapshot(q, (snapshot: QuerySnapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as T[];
      callback(data);
    });
  }
}

// Specific services
export const propertyService = new FirestoreService<Property>(COLLECTIONS.PROPERTIES);
export const reservationService = new FirestoreService<Reservation>(COLLECTIONS.RESERVATIONS);
export const clientService = new FirestoreService<Client>(COLLECTIONS.CLIENTS);
export const conversationService = new FirestoreService<Conversation>(COLLECTIONS.CONVERSATIONS);
export const messageService = new FirestoreService<Message>(COLLECTIONS.MESSAGES);
export const amenityService = new FirestoreService<Amenity>(COLLECTIONS.AMENITIES);
export const paymentService = new FirestoreService<Payment>(COLLECTIONS.PAYMENTS);
export const transactionFirestoreService = new FirestoreService<Transaction>(COLLECTIONS.TRANSACTIONS);

// Specialized methods
export const propertyQueries = {
  async getActiveProperties(): Promise<Property[]> {
    return propertyService.getWhere('isActive', '==', true, 'createdAt');
  },

  async searchProperties(filters: {
    location?: string;
    bedrooms?: number;
    maxGuests?: number;
    amenities?: string[];
    priceRange?: { min: number; max: number };
  }): Promise<Property[]> {
    let constraints: any[] = [where('isActive', '==', true)];

    if (filters.location) {
      constraints.push(where('location', '==', filters.location));
    }

    if (filters.bedrooms) {
      constraints.push(where('bedrooms', '>=', filters.bedrooms));
    }

    if (filters.maxGuests) {
      constraints.push(where('maxGuests', '>=', filters.maxGuests));
    }

    const q = query(collection(db, COLLECTIONS.PROPERTIES), ...constraints);
    const querySnapshot = await getDocs(q);
    
    let results = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Property[];

    // Filter by amenities (client-side filtering)
    if (filters.amenities?.length) {
      results = results.filter(property =>
        filters.amenities!.every(amenity => property.amenities.includes(amenity))
      );
    }

    // Filter by price range (client-side filtering)
    if (filters.priceRange) {
      results = results.filter(property =>
        property.pricing.basePrice >= filters.priceRange!.min &&
        property.pricing.basePrice <= filters.priceRange!.max
      );
    }

    return results;
  },
};

export const reservationQueries = {
  async getReservationsByProperty(propertyId: string): Promise<Reservation[]> {
    return reservationService.getWhere('propertyId', '==', propertyId, 'checkIn');
  },

  async getReservationsByClient(clientId: string): Promise<Reservation[]> {
    return reservationService.getWhere('clientId', '==', clientId, 'createdAt');
  },

  async getReservationsByDateRange(
    propertyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Reservation[]> {
    const constraints = [
      where('propertyId', '==', propertyId),
      where('checkIn', '>=', Timestamp.fromDate(startDate)),
      where('checkIn', '<=', Timestamp.fromDate(endDate)),
    ];

    const q = query(collection(db, COLLECTIONS.RESERVATIONS), ...constraints);
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Reservation[];
  },

  async getPendingReservations(): Promise<Reservation[]> {
    return reservationService.getWhere('status', '==', 'pending', 'createdAt');
  },
};

export const conversationQueries = {
  async getConversationByWhatsApp(whatsappNumber: string): Promise<Conversation | null> {
    const results = await conversationService.getWhere('whatsappNumber', '==', whatsappNumber);
    return results.length > 0 ? results[0] : null;
  },

  async getConversationByWhatsAppAndTenant(whatsappNumber: string, tenantId: string): Promise<Conversation | null> {
    const results = await conversationService.getMany([
      { field: 'whatsappNumber', operator: '==', value: whatsappNumber },
      { field: 'tenantId', operator: '==', value: tenantId }
    ]);
    return results.length > 0 ? results[0] : null;
  },

  async getActiveConversations(): Promise<Conversation[]> {
    return conversationService.getWhere('isActive', '==', true, 'lastMessageAt');
  },

  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return messageService.getWhere('conversationId', '==', conversationId, 'timestamp');
  },
};

// Add the missing methods to the conversationService to maintain compatibility
(conversationService as any).getConversationByWhatsApp = conversationQueries.getConversationByWhatsApp;
(conversationService as any).getConversationByWhatsAppAndTenant = conversationQueries.getConversationByWhatsAppAndTenant;
(conversationService as any).getMessagesByConversation = conversationQueries.getMessagesByConversation;

export const clientQueries = {
  async getClientByPhone(phone: string): Promise<Client | null> {
    const results = await clientService.getWhere('phone', '==', phone);
    return results.length > 0 ? results[0] : null;
  },
  
  async getClientByPhoneAndTenant(phone: string, tenantId: string): Promise<Client | null> {
    const results = await clientService.getMany([
      { field: 'phone', operator: '==', value: phone },
      { field: 'tenantId', operator: '==', value: tenantId }
    ]);
    return results.length > 0 ? results[0] : null;
  },

  async getClientByWhatsApp(whatsappNumber: string): Promise<Client | null> {
    const results = await clientService.getWhere('whatsappNumber', '==', whatsappNumber);
    return results.length > 0 ? results[0] : null;
  },

  async getTopClients(limit: number = 10): Promise<Client[]> {
    const q = query(
      collection(db, COLLECTIONS.CLIENTS),
      orderBy('totalSpent', 'desc'),
      limit(limit)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Client[];
  },
};

// Add the missing method to the clientService to maintain compatibility
(clientService as any).getClientByPhoneAndTenant = clientQueries.getClientByPhoneAndTenant;

// Batch operations
export const batchOperations = {
  async createMultipleAmenities(amenities: Omit<Amenity, 'id'>[]): Promise<void> {
    const batch = writeBatch(db);
    
    amenities.forEach(amenity => {
      const docRef = doc(collection(db, COLLECTIONS.AMENITIES));
      batch.set(docRef, {
        ...amenity,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });

    await batch.commit();
  },

  async updatePropertyAvailability(
    propertyId: string,
    reservationData: Partial<Reservation>
  ): Promise<void> {
    const batch = writeBatch(db);
    
    // Create reservation
    const reservationRef = doc(collection(db, COLLECTIONS.RESERVATIONS));
    batch.set(reservationRef, {
      ...reservationData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Update property last booking date
    const propertyRef = doc(db, COLLECTIONS.PROPERTIES, propertyId);
    batch.update(propertyRef, {
      lastBookingDate: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    await batch.commit();
  },
};

// Helper functions
export const convertTimestampToDate = (timestamp: any): Date => {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

export const convertDateToTimestamp = (date: Date): Timestamp => {
  return Timestamp.fromDate(date);
};