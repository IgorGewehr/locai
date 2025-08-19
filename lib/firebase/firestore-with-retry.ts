/**
 * Firestore operations with enhanced retry logic
 * Handles connectivity issues gracefully
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  QueryConstraint,
  DocumentData,
  DocumentReference,
  CollectionReference,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './config';
import { logger } from '@/lib/utils/logger';

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: any) => boolean;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  shouldRetry: (error: any) => {
    // Only retry on network/unavailable errors
    const retryableCodes = ['unavailable', 'deadline-exceeded', 'aborted', 'internal'];
    return retryableCodes.includes(error?.code);
  }
};

/**
 * Execute a Firestore operation with retry logic
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      // Add timeout to prevent hanging
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), 30000)
        )
      ]);
      
      // Success - reset any error state
      if (attempt > 0) {
        logger.info(`✅ ${operationName} succeeded after ${attempt} retries`);
      }
      
      return result;
    } catch (error: any) {
      lastError = error;
      
      // Check if we should retry
      if (!opts.shouldRetry(error) || attempt === opts.maxRetries) {
        if (error?.code === 'unavailable') {
          logger.warn(`⚠️ ${operationName}: Firestore unavailable, operating in offline mode`);
        } else {
          logger.error(`❌ ${operationName} failed:`, error?.message || error);
        }
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        opts.maxDelay
      );
      
      logger.warn(`🔄 ${operationName} failed (attempt ${attempt + 1}/${opts.maxRetries + 1}), retrying in ${Math.round(delay)}ms`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Enhanced Firestore operations with retry logic
 */
export const firestoreWithRetry = {
  /**
   * Get a document with retry
   */
  async getDoc<T = DocumentData>(
    docRef: DocumentReference<T>,
    options?: RetryOptions
  ) {
    return withRetry(
      () => getDoc(docRef),
      `getDoc(${docRef.path})`,
      options
    );
  },

  /**
   * Get documents with retry
   */
  async getDocs<T = DocumentData>(
    collectionRef: CollectionReference<T> | ReturnType<typeof query>,
    options?: RetryOptions
  ) {
    return withRetry(
      () => getDocs(collectionRef as any),
      `getDocs`,
      options
    );
  },

  /**
   * Set a document with retry
   */
  async setDoc<T = DocumentData>(
    docRef: DocumentReference<T>,
    data: T,
    options?: RetryOptions
  ) {
    return withRetry(
      () => setDoc(docRef, data),
      `setDoc(${docRef.path})`,
      options
    );
  },

  /**
   * Update a document with retry
   */
  async updateDoc<T = DocumentData>(
    docRef: DocumentReference<T>,
    data: Partial<T>,
    options?: RetryOptions
  ) {
    return withRetry(
      () => updateDoc(docRef, data as any),
      `updateDoc(${docRef.path})`,
      options
    );
  },

  /**
   * Delete a document with retry
   */
  async deleteDoc<T = DocumentData>(
    docRef: DocumentReference<T>,
    options?: RetryOptions
  ) {
    return withRetry(
      () => deleteDoc(docRef),
      `deleteDoc(${docRef.path})`,
      options
    );
  },

  /**
   * Create a query with retry for getDocs
   */
  createQuery<T = DocumentData>(
    collectionRef: CollectionReference<T>,
    ...constraints: QueryConstraint[]
  ) {
    return query(collectionRef, ...constraints);
  },

  /**
   * Listen to real-time updates with error handling
   */
  onSnapshot<T = DocumentData>(
    reference: DocumentReference<T> | ReturnType<typeof query>,
    onNext: (snapshot: any) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    let retryCount = 0;
    const maxRetries = 3;
    
    const handleError = (error: any) => {
      if (error?.code === 'unavailable' && retryCount < maxRetries) {
        retryCount++;
        logger.warn(`⚠️ Snapshot listener disconnected (attempt ${retryCount}/${maxRetries}), will retry...`);
        
        // Retry after delay
        setTimeout(() => {
          // Resubscribe
          unsubscribe();
          unsubscribe = subscribe();
        }, Math.min(1000 * Math.pow(2, retryCount), 10000));
      } else {
        logger.error('❌ Snapshot listener error:', error);
        if (onError) onError(error);
      }
    };
    
    const subscribe = () => onSnapshot(
      reference as any,
      (snapshot) => {
        retryCount = 0; // Reset on success
        onNext(snapshot);
      },
      handleError
    );
    
    let unsubscribe = subscribe();
    return unsubscribe;
  }
};

/**
 * Helper to create Firestore references
 */
export const firestoreRefs = {
  collection: <T = DocumentData>(path: string) => 
    collection(db, path) as CollectionReference<T>,
  
  doc: <T = DocumentData>(path: string, ...pathSegments: string[]) => 
    doc(db, path, ...pathSegments) as DocumentReference<T>,
};