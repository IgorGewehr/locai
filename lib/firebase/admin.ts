import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// Firebase Admin configuration from environment variables
// SECURITY: These values MUST be set as environment variables, NEVER hardcode credentials
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || '';
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL || '';
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY || '';
const FIREBASE_STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || '';

// Initialize Firebase Admin
let app: App | null = null;

if (getApps().length === 0) {
  try {
    // Validate required environment variables
    if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
      throw new Error(
        'Missing required Firebase Admin environment variables. ' +
        'Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY'
      );
    }

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
  } catch (error) {
    console.error('Firebase Admin initialization error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hasProjectId: !!FIREBASE_PROJECT_ID,
      hasClientEmail: !!FIREBASE_CLIENT_EMAIL,
      hasPrivateKey: !!FIREBASE_PRIVATE_KEY,
    });
    throw new Error(`Firebase Admin initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} else {
  app = getApps()[0];
}

// Initialize services - only if app is available
export const adminDb = app ? getFirestore(app) : null;
export const db = adminDb; // Export as 'db' for backward compatibility
export const auth = app ? getAuth(app) : null;
export const storage = app ? getStorage(app) : null;

// Configure Firestore settings for production
if (process.env.NODE_ENV === 'production' && adminDb) {
  adminDb.settings({
    ignoreUndefinedProperties: true,
  });
}

// Generic Firebase service class for CRUD operations
export class FirebaseService<T = any> {
  private collectionName: string

  constructor(collectionName: string) {
    this.collectionName = collectionName
  }

  private ensureDb() {
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized. Make sure environment variables are set.');
    }
    return adminDb;
  }

  async create(data: Partial<T>): Promise<string> {
    const doc = await this.ensureDb().collection(this.collectionName).add({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    return doc.id
  }

  async getById(id: string): Promise<T | null> {
    const doc = await this.ensureDb().collection(this.collectionName).doc(id).get()
    if (!doc.exists) return null
    return { id: doc.id, ...doc.data() } as T
  }

  async getAll(): Promise<T[]> {
    const snapshot = await this.ensureDb().collection(this.collectionName).get()
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T))
  }

  async update(id: string, data: Partial<T>): Promise<void> {
    await this.ensureDb().collection(this.collectionName).doc(id).update({
      ...data,
      updatedAt: new Date()
    })
  }

  async delete(id: string): Promise<void> {
    await this.ensureDb().collection(this.collectionName).doc(id).delete()
  }

  async query(
    field: string, 
    operator: FirebaseFirestore.WhereFilterOp, 
    value: any
  ): Promise<T[]> {
    const snapshot = await adminDb
      .collection(this.collectionName)
      .where(field, operator, value)
      .get()
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T))
  }

  async exists(id: string): Promise<boolean> {
    const doc = await this.ensureDb().collection(this.collectionName).doc(id).get()
    return doc.exists
  }

  async count(): Promise<number> {
    const snapshot = await this.ensureDb().collection(this.collectionName).get()
    return snapshot.size
  }
}

export default app;