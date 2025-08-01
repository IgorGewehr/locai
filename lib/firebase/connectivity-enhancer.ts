// Firebase Connectivity Enhancer
// Melhorias específicas para resolver problemas de timeout e conectividade

import { logger } from '@/lib/utils/logger';

interface ConnectivityOptions {
  maxRetries?: number;
  baseDelay?: number;
  timeoutMs?: number;
  enableOfflineSupport?: boolean;
}

export class FirebaseConnectivityEnhancer {
  private static instance: FirebaseConnectivityEnhancer;
  private options: Required<ConnectivityOptions>;

  constructor(options: ConnectivityOptions = {}) {
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      baseDelay: options.baseDelay ?? 1000,
      timeoutMs: options.timeoutMs ?? 20000, // 20 segundos ao invés de 10
      enableOfflineSupport: options.enableOfflineSupport ?? true
    };
  }

  static getInstance(options?: ConnectivityOptions): FirebaseConnectivityEnhancer {
    if (!this.instance) {
      this.instance = new FirebaseConnectivityEnhancer(options);
    }
    return this.instance;
  }

  /**
   * Enhance Firestore connection with better timeout and retry settings
   */
  async enhanceFirestoreConnection(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // Dynamic import to avoid SSR issues
      const { getFirestore, enableNetwork, enableIndexedDbPersistence } = await import('firebase/firestore');
      const { getApp } = await import('firebase/app');
      
      const app = getApp();
      const db = getFirestore(app);

      // Enable offline support for better resilience
      if (this.options.enableOfflineSupport) {
        try {
          await enableIndexedDbPersistence(db);
          logger.info('🔥 Firebase offline persistence enabled');
        } catch (error) {
          const err = error as any;
          if (err.code === 'failed-precondition') {
            logger.warn('⚠️ Firebase persistence failed - multiple tabs open');
          } else if (err.code === 'unimplemented') {
            logger.warn('⚠️ Firebase persistence not supported in this browser');
          } else {
            logger.error('❌ Firebase persistence setup failed:', err);
          }
        }
      }

      // Ensure network is enabled (in case it was disabled)
      await enableNetwork(db);
      logger.info('🌐 Firebase network connectivity enhanced');

      // Setup connection monitoring
      this.setupConnectionMonitoring();

    } catch (error) {
      logger.error('❌ Failed to enhance Firebase connectivity:', error);
    }
  }

  /**
   * Monitor connection health and attempt recovery
   */
  private setupConnectionMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Monitor online/offline status
    window.addEventListener('online', () => {
      logger.info('🟢 Network connection restored');
      this.attemptReconnection();
    });

    window.addEventListener('offline', () => {
      logger.warn('🔴 Network connection lost - entering offline mode');
    });

    // Periodic connection health check
    setInterval(() => {
      this.checkConnectionHealth();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Attempt to reconnect when network is restored
   */
  private async attemptReconnection(): Promise<void> {
    try {
      const { enableNetwork, getFirestore } = await import('firebase/firestore');
      const { getApp } = await import('firebase/app');
      
      const app = getApp();
      const db = getFirestore(app);
      
      await enableNetwork(db);
      logger.info('🔄 Firebase reconnection successful');
    } catch (error) {
      logger.error('❌ Firebase reconnection failed:', error);
    }
  }

  /**
   * Check connection health with a simple test operation
   */
  private async checkConnectionHealth(): Promise<void> {
    if (!navigator.onLine) return;

    try {
      const { getFirestore, doc, getDoc } = await import('firebase/firestore');
      const { getApp } = await import('firebase/app');
      
      const app = getApp();
      const db = getFirestore(app);
      
      // Test with a non-existent document to avoid creating data
      const testDoc = doc(db, 'health-check', 'test');
      
      await Promise.race([
        getDoc(testDoc),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 10000)
        )
      ]);

      // Connection is healthy - no need to log success to avoid spam
    } catch (error) {
      logger.warn('⚠️ Firebase connection health check failed:', (error as Error).message);
      
      // Attempt recovery if health check fails
      setTimeout(() => this.attemptReconnection(), 5000);
    }
  }

  /**
   * Enhanced execute with retry - can be used by services
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'Firebase operation'
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        return await Promise.race([
          operation(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`${operationName} timeout after ${this.options.timeoutMs}ms`)),
              this.options.timeoutMs
            )
          )
        ]);
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain error types
        if (error instanceof Error) {
          const errorCode = (error as any).code;
          if (['permission-denied', 'not-found', 'already-exists', 'invalid-argument'].includes(errorCode)) {
            throw error;
          }
        }

        if (attempt === this.options.maxRetries) {
          logger.error(`❌ ${operationName} failed after ${this.options.maxRetries + 1} attempts:`, lastError.message);
          throw lastError;
        }

        const delay = this.options.baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        logger.warn(`🔄 ${operationName} failed (attempt ${attempt + 1}/${this.options.maxRetries + 1}), retrying in ${Math.round(delay)}ms`);

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }
}

// Initialize the enhancer on client-side
if (typeof window !== 'undefined') {
  const enhancer = FirebaseConnectivityEnhancer.getInstance({
    maxRetries: 4,
    baseDelay: 1500,
    timeoutMs: 25000, // 25 segundos
    enableOfflineSupport: true
  });

  // Enhance connection after a short delay to allow Firebase to initialize
  setTimeout(() => {
    enhancer.enhanceFirestoreConnection();
  }, 2000);
}

export const connectivityEnhancer = FirebaseConnectivityEnhancer.getInstance();