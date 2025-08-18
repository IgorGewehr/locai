/**
 * Enhanced Firebase Configuration with Better Error Handling
 * Handles connectivity issues and offline scenarios gracefully
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { logger } from '@/lib/utils/logger';

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyBKRDtn0BqMhE0Dk0wHI6iLaMmtForeChs',
  authDomain: 'locai-76dcf.firebaseapp.com',
  projectId: 'locai-76dcf',
  storageBucket: 'locai-76dcf.firebasestorage.app',
  messagingSenderId: '1000449765567',
  appId: '1:1000449765567:web:43b5a6e5c2948462f9a3b2',
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Enhanced Firestore initialization with better error handling
let db: ReturnType<typeof getFirestore>;

try {
  // Try to initialize with memory cache for better performance
  // Memory cache avoids IndexedDB issues but doesn't persist offline
  db = initializeFirestore(app, {
    localCache: memoryLocalCache(),
    ignoreUndefinedProperties: true,
    experimentalForceLongPolling: false, // Disable long polling to improve performance
  });
  
  logger.info('🔥 Firebase initialized with memory cache');
} catch (error) {
  // Fallback to standard initialization if custom fails
  logger.warn('⚠️ Falling back to standard Firestore initialization');
  db = getFirestore(app);
}

// Connection state manager
class FirebaseConnectionManager {
  private static instance: FirebaseConnectionManager;
  private isOnline: boolean = true;
  private retryCount: number = 0;
  private maxRetries: number = 3;
  private listeners: Array<(isOnline: boolean) => void> = [];

  private constructor() {
    this.setupConnectionMonitoring();
  }

  static getInstance(): FirebaseConnectionManager {
    if (!this.instance) {
      this.instance = new FirebaseConnectionManager();
    }
    return this.instance;
  }

  private setupConnectionMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Monitor browser online/offline events
    window.addEventListener('online', () => {
      logger.info('🟢 Network connection restored');
      this.isOnline = true;
      this.retryCount = 0;
      this.notifyListeners(true);
    });

    window.addEventListener('offline', () => {
      logger.warn('🔴 Network connection lost');
      this.isOnline = false;
      this.notifyListeners(false);
    });

    // Monitor Firestore connection state changes
    this.monitorFirestoreConnection();
  }

  private monitorFirestoreConnection(): void {
    // Add a simple connectivity check every 30 seconds
    if (typeof window !== 'undefined') {
      setInterval(() => {
        if (navigator.onLine && this.retryCount < this.maxRetries) {
          // Only log if we're having issues
          if (this.retryCount > 0) {
            logger.info(`🔄 Checking Firebase connection (attempt ${this.retryCount + 1}/${this.maxRetries})`);
          }
        }
      }, 30000);
    }
  }

  public onConnectionChange(callback: (isOnline: boolean) => void): () => void {
    this.listeners.push(callback);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(isOnline: boolean): void {
    this.listeners.forEach(listener => listener(isOnline));
  }

  public getConnectionState(): boolean {
    return this.isOnline && navigator.onLine;
  }

  public incrementRetryCount(): void {
    this.retryCount++;
  }

  public resetRetryCount(): void {
    this.retryCount = 0;
  }

  public hasExceededRetries(): boolean {
    return this.retryCount >= this.maxRetries;
  }
}

// Export connection manager instance
export const connectionManager = typeof window !== 'undefined' 
  ? FirebaseConnectionManager.getInstance() 
  : null;

// Wrapper for Firestore operations with better error handling
export async function executeFirestoreOperation<T>(
  operation: () => Promise<T>,
  operationName: string = 'Firestore operation'
): Promise<T | null> {
  try {
    // Check if we're online first
    if (connectionManager && !connectionManager.getConnectionState()) {
      logger.warn(`⚠️ ${operationName}: Operating in offline mode`);
    }

    const result = await operation();
    
    // Reset retry count on success
    if (connectionManager) {
      connectionManager.resetRetryCount();
    }
    
    return result;
  } catch (error: any) {
    // Handle specific Firestore errors
    if (error?.code === 'unavailable') {
      logger.warn(`⚠️ ${operationName}: Firestore unavailable, will retry when connection is restored`);
      
      if (connectionManager) {
        connectionManager.incrementRetryCount();
        
        if (connectionManager.hasExceededRetries()) {
          logger.error(`❌ ${operationName}: Max retries exceeded, operating in offline mode`);
        }
      }
      
      return null;
    }
    
    // Re-throw other errors
    logger.error(`❌ ${operationName} failed:`, error);
    throw error;
  }
}

// Initialize other Firebase services
export const storage = getStorage(app);
export const auth = getAuth(app);

// Export enhanced Firestore instance
export { db };
export default app;