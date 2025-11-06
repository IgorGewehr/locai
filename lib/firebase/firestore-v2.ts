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
   * 🛡️ ENHANCED: Validação robusta e timeout protection
   */
  async create(data: Omit<T, 'id'>): Promise<string> {
    // Validação de parâmetros
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data: data must be an object');
    }

    if (!this.tenantId || typeof this.tenantId !== 'string') {
      throw new Error('Invalid tenantId');
    }

    const docData = {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      tenantId: this.tenantId, // Always include tenantId for security
    };

    // Timeout protection: 10 segundos
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Firestore create operation timeout after 10s')), 10000);
    });

    try {
      const docRef = await Promise.race([
        addDoc(this.getCollectionRef(), docData),
        timeoutPromise
      ]);

      // 🛡️ VERIFICAÇÃO: Confirmar que documento foi criado
      const verifyDoc = await getDoc(docRef);
      if (!verifyDoc.exists()) {
        throw new Error('Document creation failed - verification read returned no document');
      }

      logger.info('✅ [Firestore] Document created successfully', {
        collection: this.collectionName,
        tenantId: this.tenantId.substring(0, 8) + '***',
        docId: docRef.id
      });

      return docRef.id;
    } catch (error) {
      logger.error('❌ [Firestore] Create operation failed', {
        collection: this.collectionName,
        tenantId: this.tenantId.substring(0, 8) + '***',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Set a document with specific ID
   * 🛡️ ENHANCED: Validação robusta e timeout protection
   */
  async set(id: string, data: T): Promise<void> {
    // Validação de parâmetros
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid document ID');
    }

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data: data must be an object');
    }

    if (!this.tenantId || typeof this.tenantId !== 'string') {
      throw new Error('Invalid tenantId');
    }

    const docData = {
      ...data,
      id,
      tenantId: this.tenantId,
      updatedAt: Timestamp.now(),
    };

    // Timeout protection: 10 segundos
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Firestore set operation timeout after 10s')), 10000);
    });

    try {
      await Promise.race([
        setDoc(this.getDocRef(id), this.filterUndefinedValues(docData)),
        timeoutPromise
      ]);

      // 🛡️ VERIFICAÇÃO: Confirmar que documento foi atualizado
      const verifyDoc = await getDoc(this.getDocRef(id));
      if (!verifyDoc.exists()) {
        throw new Error('Document set failed - verification read returned no document');
      }

      logger.info('✅ [Firestore] Document set successfully', {
        collection: this.collectionName,
        tenantId: this.tenantId.substring(0, 8) + '***',
        docId: id
      });
    } catch (error) {
      logger.error('❌ [Firestore] Set operation failed', {
        collection: this.collectionName,
        tenantId: this.tenantId.substring(0, 8) + '***',
        docId: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Update an existing document
   * 🛡️ ENHANCED: Validação robusta, verificação de existência e timeout protection
   */
  async update(id: string, data: Partial<T>): Promise<void> {
    // Validação de parâmetros
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid document ID');
    }

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data: data must be an object');
    }

    if (!this.tenantId || typeof this.tenantId !== 'string') {
      throw new Error('Invalid tenantId');
    }

    // 🛡️ VERIFICAÇÃO: Documento existe antes de atualizar
    const docSnap = await getDoc(this.getDocRef(id));
    if (!docSnap.exists()) {
      throw new Error(`Document ${id} does not exist - cannot update`);
    }

    const updateData = {
      ...data,
      updatedAt: Timestamp.now(),
    };

    // Timeout protection: 10 segundos
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Firestore update operation timeout after 10s')), 10000);
    });

    try {
      await Promise.race([
        updateDoc(this.getDocRef(id), this.filterUndefinedValues(updateData)),
        timeoutPromise
      ]);

      logger.info('✅ [Firestore] Document updated successfully', {
        collection: this.collectionName,
        tenantId: this.tenantId.substring(0, 8) + '***',
        docId: id
      });
    } catch (error) {
      logger.error('❌ [Firestore] Update operation failed', {
        collection: this.collectionName,
        tenantId: this.tenantId.substring(0, 8) + '***',
        docId: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Delete a document
   * 🛡️ ENHANCED: Validação robusta e timeout protection
   */
  async delete(id: string): Promise<void> {
    // Validação de parâmetros
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid document ID');
    }

    if (!this.tenantId || typeof this.tenantId !== 'string') {
      throw new Error('Invalid tenantId');
    }

    // 🛡️ VERIFICAÇÃO: Documento existe antes de deletar
    const docSnap = await getDoc(this.getDocRef(id));
    if (!docSnap.exists()) {
      logger.warn('⚠️ [Firestore] Attempted to delete non-existent document', {
        collection: this.collectionName,
        tenantId: this.tenantId.substring(0, 8) + '***',
        docId: id
      });
      return; // Silent fail - document already doesn't exist
    }

    // Timeout protection: 10 segundos
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Firestore delete operation timeout after 10s')), 10000);
    });

    try {
      await Promise.race([
        deleteDoc(this.getDocRef(id)),
        timeoutPromise
      ]);

      logger.info('✅ [Firestore] Document deleted successfully', {
        collection: this.collectionName,
        tenantId: this.tenantId.substring(0, 8) + '***',
        docId: id
      });
    } catch (error) {
      logger.error('❌ [Firestore] Delete operation failed', {
        collection: this.collectionName,
        tenantId: this.tenantId.substring(0, 8) + '***',
        docId: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
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
   * 🚀 OTIMIZAÇÃO: Agora com limit para evitar carregar milhares de docs
   * @param limitCount - Máximo de documentos (default: 1000)
   */
  async getAll(limitCount: number = 1000): Promise<T[]> {
    const q = query(this.getCollectionRef(), limit(limitCount));
    const querySnapshot = await getDocs(q);

    logger.info(`[Firestore] getAll executed`, {
      collection: this.collectionName,
      tenant: this.tenantId,
      count: querySnapshot.size,
      limit: limitCount,
    });

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

  /**
   * Get Firestore database instance
   */
  get db() {
    return db;
  }

  createService<T extends { id?: string }>(collectionName: string) {
    return new MultiTenantFirestoreService<T>(this.tenantId, collectionName);
  }

  // Convenience methods for common collections with proper types
  get properties() {
    return this.createService<import('@/lib/types/property').Property>('properties');
  }

  get clients() {
    return this.createService<import('@/lib/types/client').Client>('clients');
  }

  get reservations() {
    return this.createService<import('@/lib/types/reservation').Reservation>('reservations');
  }

  get conversations() {
    return this.createService<import('@/lib/types/conversation').Conversation>('conversations');
  }

  get messages() {
    return this.createService<import('@/lib/types/conversation').Message>('messages');
  }

  get availability() {
    const { AvailabilityService } = require('@/lib/services/availability-service');
    return new AvailabilityService(this.tenantId);
  }

  get transactions() {
    const { createTransactionServiceV2 } = require('@/lib/services/transaction-service-v2');
    return createTransactionServiceV2(this.tenantId);
  }

  // Specialized Services
  get accounts() {
    const { createAccountsService } = require('@/lib/services/accounts-service');
    return createAccountsService(this.tenantId);
  }

  get banks() {
    const { createBankService } = require('@/lib/services/accounts-service');
    return createBankService(this.tenantId);
  }

  get costCenters() {
    const { createCostCenterService } = require('@/lib/services/accounts-service');
    return createCostCenterService(this.tenantId);
  }

  get commissions() {
    const { createCommissionService } = require('@/lib/services/accounts-service');
    return createCommissionService(this.tenantId);
  }

  get alerts() {
    const { createAlertsService } = require('@/lib/services/accounts-service');
    return createAlertsService(this.tenantId);
  }

  get crm() {
    const { createCRMService } = require('@/lib/services/crm-service');
    return createCRMService(this.tenantId);
  }

  get interactions() {
    return this.createService<import('@/lib/types/crm').Interaction>('interactions');
  }

  get billing() {
    const { createBillingService } = require('@/lib/services/billing-service');
    return createBillingService(this.tenantId);
  }

  get settings() {
    const { createSettingsService } = require('@/lib/services/settings-service');
    return createSettingsService(this.tenantId);
  }

  get miniSite() {
    const { createMiniSiteService } = require('@/lib/services/mini-site-service');
    return createMiniSiteService(this.tenantId);
  }

  get auditLogger() {
    const { createAuditLogger } = require('@/lib/services/audit-logger');
    return createAuditLogger(this.tenantId);
  }

  get payments() {
    return this.createService<import('@/lib/types/financial').Payment>('payments');
  }

  get goals() {
    return this.createService<import('@/lib/types/financial').FinancialGoal>('goals');
  }

  get financialMovements() {
    return this.createService<import('@/lib/types/financial').FinancialMovement>('financial_movements');
  }

  get leads() {
    return this.createService<import('@/lib/types/crm').Lead>('leads');
  }

  get tasks() {
    return this.createService<import('@/lib/types/crm').Task>('tasks');
  }

  get automations() {
    return this.createService<import('@/lib/types/automation').AutomationWorkflow>('automations');
  }

  get analytics() {
    return this.createService<any>('analytics');
  }

  get visits() {
    return this.createService<import('@/lib/types/visit-appointment').VisitAppointment>('visits');
  }

  get visitSchedules() {
    return this.createService<import('@/lib/types/visit-appointment').TenantVisitSchedule>('visitSchedules');
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