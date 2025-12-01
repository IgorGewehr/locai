import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getStorage, Storage } from 'firebase-admin/storage';

// Firebase Admin configuration from environment variables
// SECURITY: These values MUST be set as environment variables, NEVER hardcode credentials

// Cached instances for lazy initialization
let app: App | null = null;
let adminDbInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let storageInstance: Storage | null = null;
let initializationAttempted = false;

/**
 * Initialize Firebase Admin lazily - only when needed
 * This prevents errors during build time when env vars are not available
 */
function initializeFirebaseAdmin(): App | null {
  // Skip if already attempted (prevents multiple error logs)
  if (initializationAttempted) {
    return app;
  }

  initializationAttempted = true;

  // Check if already initialized
  if (getApps().length > 0) {
    app = getApps()[0];
    return app;
  }

  const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || '';
  const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL || '';
  const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY || '';
  const FIREBASE_STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || '';

  // Validate required environment variables
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    // During build time, just return null silently
    if (process.env.SKIP_ENV_VALIDATION === '1') {
      console.warn('[Firebase Admin] Skipping initialization during build (SKIP_ENV_VALIDATION=1)');
      return null;
    }

    console.error('Firebase Admin initialization error:', {
      error: 'Missing required Firebase Admin environment variables. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY',
      hasProjectId: !!FIREBASE_PROJECT_ID,
      hasClientEmail: !!FIREBASE_CLIENT_EMAIL,
      hasPrivateKey: !!FIREBASE_PRIVATE_KEY,
    });
    return null;
  }

  try {
    // Parse the private key (handle escaped newlines)
    const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

    app = initializeApp({
      credential: cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
      projectId: FIREBASE_PROJECT_ID,
      storageBucket: FIREBASE_STORAGE_BUCKET,
    });

    // Configure Firestore settings for production
    if (process.env.NODE_ENV === 'production') {
      const db = getFirestore(app);
      db.settings({
        ignoreUndefinedProperties: true,
      });
    }

    return app;
  } catch (error) {
    console.error('Firebase Admin initialization error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hasProjectId: !!FIREBASE_PROJECT_ID,
      hasClientEmail: !!FIREBASE_CLIENT_EMAIL,
      hasPrivateKey: !!FIREBASE_PRIVATE_KEY,
    });
    return null;
  }
}

/**
 * Get Firebase Admin Firestore instance (lazy initialization)
 */
function getAdminDb(): Firestore | null {
  if (adminDbInstance) return adminDbInstance;

  const adminApp = initializeFirebaseAdmin();
  if (!adminApp) return null;

  adminDbInstance = getFirestore(adminApp);
  return adminDbInstance;
}

/**
 * Get Firebase Admin Auth instance (lazy initialization)
 */
function getAdminAuth(): Auth | null {
  if (authInstance) return authInstance;

  const adminApp = initializeFirebaseAdmin();
  if (!adminApp) return null;

  authInstance = getAuth(adminApp);
  return authInstance;
}

/**
 * Get Firebase Admin Storage instance (lazy initialization)
 */
function getAdminStorage(): Storage | null {
  if (storageInstance) return storageInstance;

  const adminApp = initializeFirebaseAdmin();
  if (!adminApp) return null;

  storageInstance = getStorage(adminApp);
  return storageInstance;
}

// Export getters instead of direct instances
// This allows lazy initialization at runtime instead of build time
export const adminDb = {
  get instance() {
    return getAdminDb();
  }
};

export const db = adminDb; // Alias for backward compatibility

export const auth = {
  get instance() {
    return getAdminAuth();
  },
  // Proxy methods for common operations
  async verifyIdToken(token: string) {
    const authInst = getAdminAuth();
    if (!authInst) {
      throw new Error('Firebase Admin Auth not initialized. Make sure environment variables are set.');
    }
    return authInst.verifyIdToken(token);
  },
  async getUser(uid: string) {
    const authInst = getAdminAuth();
    if (!authInst) {
      throw new Error('Firebase Admin Auth not initialized. Make sure environment variables are set.');
    }
    return authInst.getUser(uid);
  },
  async createUser(properties: any) {
    const authInst = getAdminAuth();
    if (!authInst) {
      throw new Error('Firebase Admin Auth not initialized. Make sure environment variables are set.');
    }
    return authInst.createUser(properties);
  },
  async updateUser(uid: string, properties: any) {
    const authInst = getAdminAuth();
    if (!authInst) {
      throw new Error('Firebase Admin Auth not initialized. Make sure environment variables are set.');
    }
    return authInst.updateUser(uid, properties);
  },
  async deleteUser(uid: string) {
    const authInst = getAdminAuth();
    if (!authInst) {
      throw new Error('Firebase Admin Auth not initialized. Make sure environment variables are set.');
    }
    return authInst.deleteUser(uid);
  }
};

export const storage = {
  get instance() {
    return getAdminStorage();
  },
  bucket(name?: string) {
    const storageInst = getAdminStorage();
    if (!storageInst) {
      throw new Error('Firebase Admin Storage not initialized. Make sure environment variables are set.');
    }
    return storageInst.bucket(name);
  }
};

// Generic Firebase service class for CRUD operations
export class FirebaseService<T = any> {
  private collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  private ensureDb(): Firestore {
    const db = getAdminDb();
    if (!db) {
      throw new Error('Firebase Admin not initialized. Make sure environment variables are set.');
    }
    return db;
  }

  async create(data: Partial<T>): Promise<string> {
    const doc = await this.ensureDb().collection(this.collectionName).add({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return doc.id;
  }

  async getById(id: string): Promise<T | null> {
    const doc = await this.ensureDb().collection(this.collectionName).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as T;
  }

  async getAll(): Promise<T[]> {
    const snapshot = await this.ensureDb().collection(this.collectionName).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  }

  async update(id: string, data: Partial<T>): Promise<void> {
    await this.ensureDb().collection(this.collectionName).doc(id).update({
      ...data,
      updatedAt: new Date()
    });
  }

  async delete(id: string): Promise<void> {
    await this.ensureDb().collection(this.collectionName).doc(id).delete();
  }

  async query(
    field: string,
    operator: FirebaseFirestore.WhereFilterOp,
    value: any
  ): Promise<T[]> {
    const snapshot = await this.ensureDb()
      .collection(this.collectionName)
      .where(field, operator, value)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  }

  async exists(id: string): Promise<boolean> {
    const doc = await this.ensureDb().collection(this.collectionName).doc(id).get();
    return doc.exists;
  }

  async count(): Promise<number> {
    const snapshot = await this.ensureDb().collection(this.collectionName).get();
    return snapshot.size;
  }
}

// Export the app getter
export function getApp(): App | null {
  return initializeFirebaseAdmin();
}

export default app;
