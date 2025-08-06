import {
  collection,
  doc,
  addDoc,
  setDoc,
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
  CollectionReference,
  DocumentReference,
} from 'firebase/firestore';
import { db } from './config';
import { queryOptimizer, QueryFilter } from '@/lib/utils/query-optimizer';
import { logger } from '@/lib/utils/logger';
import { createTransactionService } from '@/lib/services/transaction-service';
import { createAccountsService, createBankService, createCostCenterService, createCommissionService, createAlertsService } from '@/lib/services/accounts-service';
import { createCRMService } from '@/lib/services/crm-service';
import { createBillingService } from '@/lib/services/billing-service';
import { createSettingsService } from '@/lib/services/settings-service';
import { createMiniSiteService } from '@/lib/services/mini-site-service';
import { createAuditLogger } from '@/lib/services/audit-logger';

/**
 * Multi-tenant Firestore Service
 * Estrutura: tenants/{tenantId}/collections/{collectionName}/documents
 */
export class MultiTenantFirestoreService<T extends { id?: string }> {
  private tenantId: string;
  private collectionName: string;

  constructor(tenantId: string, collectionName: string) {
    this.tenantId = tenantId;
    this.collectionName = collectionName;
  }

  /**
   * Get the collection reference for this tenant
   */
  protected getCollectionRef(): CollectionReference {
    return collection(db, 'tenants', this.tenantId, this.collectionName);
  }

  /**
   * Get a document reference
   */
  protected getDocRef(docId: string): DocumentReference {
    return doc(db, 'tenants', this.tenantId, this.collectionName, docId);
  }

  /**
   * Create a new document
   */
  async create(data: Omit<T, 'id'>): Promise<string> {
    const docData = {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      tenantId: this.tenantId, // Always include tenantId for security
    };

    const docRef = await addDoc(this.getCollectionRef(), docData);
    return docRef.id;
  }

  /**
   * Set a document with specific ID
   */
  async set(id: string, data: T): Promise<void> {
    const docData = {
      ...data,
      id,
      tenantId: this.tenantId,
      updatedAt: Timestamp.now(),
    };

    await setDoc(this.getDocRef(id), this.filterUndefinedValues(docData));
  }

  /**
   * Update an existing document
   */
  async update(id: string, data: Partial<T>): Promise<void> {
    const updateData = {
      ...data,
      updatedAt: Timestamp.now(),
    };

    await updateDoc(this.getDocRef(id), this.filterUndefinedValues(updateData));
  }

  /**
   * Delete a document
   */
  async delete(id: string): Promise<void> {
    await deleteDoc(this.getDocRef(id));
  }

  /**
   * Get a single document by ID
   */
  async get(id: string): Promise<T | null> {
    const docSnap = await getDoc(this.getDocRef(id));
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
  }

  /**
   * Alias for backward compatibility
   */
  async getById(id: string): Promise<T | null> {
    return this.get(id);
  }

  /**
   * Get all documents in the collection
   */
  async getAll(): Promise<T[]> {
    const querySnapshot = await getDocs(this.getCollectionRef());
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];
  }

  /**
   * Query documents with filters
   */
  async getWhere(
    field: string,
    operator: any,
    value: any,
    orderByField?: string,
    limitCount?: number
  ): Promise<T[]> {
    let q = query(this.getCollectionRef(), where(field, operator, value));
    
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

  /**
   * Query with multiple filters
   */
  async getMany(
    filters: Array<{ field: string; operator: any; value: any }>,
    options?: {
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
      limit?: number;
      startAfter?: any;
    }
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

    const q = query(this.getCollectionRef(), ...constraints);
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];
  }

  /**
   * Optimized query with performance optimizations
   */
  async getManyOptimized(
    filters: QueryFilter[],
    options?: {
      orderBy?: { field: string; direction: 'asc' | 'desc' }[];
      limit?: number;
      startAfter?: any;
    }
  ): Promise<T[]> {
    const startTime = Date.now();
    
    // Optimize the query using query optimizer
    const optimizedQuery = queryOptimizer.optimizeQuery(filters, options);
    
    logger.info('Executing optimized query', {
      tenantId: this.tenantId,
      collection: this.collectionName,
      filterCount: optimizedQuery.filters.length,
      estimatedCost: optimizedQuery.estimatedCost,
      reasoning: optimizedQuery.reasoning
    });

    // Build Firestore constraints from optimized filters
    let constraints: any[] = optimizedQuery.filters.map(f => where(f.field, f.operator, f.value));
    
    if (optimizedQuery.orderBy) {
      optimizedQuery.orderBy.forEach(orderByClause => {
        constraints.push(orderBy(orderByClause.field, orderByClause.direction));
      });
    }
    
    if (optimizedQuery.limit) {
      constraints.push(limit(optimizedQuery.limit));
    }
    
    if (options?.startAfter) {
      constraints.push(startAfter(options.startAfter));
    }

    const q = query(this.getCollectionRef(), ...constraints);
    const querySnapshot = await getDocs(q);
    
    const results = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];

    const executionTime = Date.now() - startTime;
    logger.info('Optimized query completed', {
      tenantId: this.tenantId,
      collection: this.collectionName,
      resultCount: results.length,
      executionTime: `${executionTime}ms`,
      estimatedCost: optimizedQuery.estimatedCost
    });

    return results;
  }

  /**
   * Count documents
   */
  async count(filters?: Array<{ field: string; operator: any; value: any }>): Promise<number> {
    let constraints: any[] = [];
    
    if (filters) {
      constraints = filters.map(f => where(f.field, f.operator, f.value));
    }

    const q = constraints.length > 0 
      ? query(this.getCollectionRef(), ...constraints)
      : this.getCollectionRef();
      
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  }

  /**
   * Subscribe to collection changes
   */
  onSnapshot(callback: (data: T[]) => void, constraints?: any[]): () => void {
    let q = this.getCollectionRef() as any;
    
    if (constraints?.length) {
      q = query(q, ...constraints);
    }

    return onSnapshot(q, (snapshot: QuerySnapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as T[];
      callback(data);
    });
  }

  /**
   * Subscribe to a specific document
   */
  subscribeToDocument(id: string, callback: (data: T | null) => void): () => void {
    const docRef = this.getDocRef(id);
    
    return onSnapshot(docRef, (snapshot: DocumentSnapshot) => {
      if (snapshot.exists()) {
        const data = {
          id: snapshot.id,
          ...snapshot.data(),
        } as T;
        callback(data);
      } else {
        callback(null);
      }
    });
  }

  /**
   * Batch operations
   */
  async batchCreate(items: Array<Omit<T, 'id'>>): Promise<void> {
    const batch = writeBatch(db);
    
    items.forEach(item => {
      const docRef = doc(this.getCollectionRef());
      batch.set(docRef, {
        ...item,
        tenantId: this.tenantId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });

    await batch.commit();
  }

  /**
   * Helper method to filter out undefined values
   */
  private filterUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.filterUndefinedValues(item));
    }
    
    if (typeof obj === 'object' && obj.constructor === Object) {
      const filtered: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          filtered[key] = this.filterUndefinedValues(value);
        }
      }
      return filtered;
    }
    
    return obj;
  }
}

/**
 * Factory function to create a multi-tenant service
 */
export function createMultiTenantService<T extends { id?: string }>(
  tenantId: string, 
  collectionName: string
): MultiTenantFirestoreService<T> {
  return new MultiTenantFirestoreService<T>(tenantId, collectionName);
}

/**
 * Service factory for all collections
 */
export class TenantServiceFactory {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  createService<T extends { id?: string }>(collectionName: string) {
    return new MultiTenantFirestoreService<T>(this.tenantId, collectionName);
  }

  // Convenience methods for common collections
  get properties() {
    return this.createService('properties');
  }

  get clients() {
    return this.createService('clients');
  }

  get reservations() {
    return this.createService('reservations');
  }

  get conversations() {
    return this.createService('conversations');
  }

  get messages() {
    return this.createService('messages');
  }

  get transactions() {
    return createTransactionService(this.tenantId);
  }

  // Specialized Services
  get accounts() {
    return createAccountsService(this.tenantId);
  }

  get banks() {
    return createBankService(this.tenantId);
  }

  get costCenters() {
    return createCostCenterService(this.tenantId);
  }

  get commissions() {
    return createCommissionService(this.tenantId);
  }

  get alerts() {
    return createAlertsService(this.tenantId);
  }

  get crm() {
    return createCRMService(this.tenantId);
  }

  get billing() {
    return createBillingService(this.tenantId);
  }

  get settings() {
    return createSettingsService(this.tenantId);
  }

  get miniSite() {
    return createMiniSiteService(this.tenantId);
  }

  get auditLogger() {
    return createAuditLogger(this.tenantId);
  }

  get payments() {
    return this.createService('payments');
  }

  get goals() {
    return this.createService('goals');
  }

  get leads() {
    return this.createService('leads');
  }

  get tasks() {
    return this.createService('tasks');
  }

  get automations() {
    return this.createService('automations');
  }

  get analytics() {
    return this.createService('analytics');
  }

  get visits() {
    return this.createService('visits');
  }

  get visitSchedules() {
    return this.createService('visitSchedules');
  }

  // Batch operations
  getBatch() {
    return writeBatch(db);
  }

  // Get a new document reference for batch operations
  getNewDocRef(collectionName: string) {
    return doc(collection(db, 'tenants', this.tenantId, collectionName));
  }
}