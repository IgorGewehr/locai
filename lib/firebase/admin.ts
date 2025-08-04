import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// Validate required environment variables
const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Initialize Firebase Admin
let app: App;

if (getApps().length === 0) {
  try {
    // Parse the private key (handle escaped newlines)
    const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n');

    app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey,
      }),
      projectId: process.env.FIREBASE_PROJECT_ID!,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    });
  } catch (error) {
    console.error('Firebase Admin initialization error details:', error);
    throw new Error(`Firebase Admin initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} else {
  app = getApps()[0];
}

// Initialize services
export const adminDb = getFirestore(app);
export const db = adminDb; // Export as 'db' for backward compatibility
export const auth = getAuth(app);
export const storage = getStorage(app);

// Configure Firestore settings for production
if (process.env.NODE_ENV === 'production') {
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

  async create(data: Partial<T>): Promise<string> {
    const doc = await adminDb.collection(this.collectionName).add({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    return doc.id
  }

  async getById(id: string): Promise<T | null> {
    const doc = await adminDb.collection(this.collectionName).doc(id).get()
    if (!doc.exists) return null
    return { id: doc.id, ...doc.data() } as T
  }

  async getAll(): Promise<T[]> {
    const snapshot = await adminDb.collection(this.collectionName).get()
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T))
  }

  async update(id: string, data: Partial<T>): Promise<void> {
    await adminDb.collection(this.collectionName).doc(id).update({
      ...data,
      updatedAt: new Date()
    })
  }

  async delete(id: string): Promise<void> {
    await adminDb.collection(this.collectionName).doc(id).delete()
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
    const doc = await adminDb.collection(this.collectionName).doc(id).get()
    return doc.exists
  }

  async count(): Promise<number> {
    const snapshot = await adminDb.collection(this.collectionName).get()
    return snapshot.size
  }
}

export default app;