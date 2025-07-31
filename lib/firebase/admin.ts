import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// Validate required environment variables
const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing Firebase environment variable: ${envVar}`);
    throw new Error(`Missing required environment variable: ${envVar}. Please check your .env file.`);
  }
}

// Initialize Firebase Admin
let app: App;

if (getApps().length === 0) {
  try {
    console.log('🔥 Initializing Firebase Admin...');
    console.log('📋 Project ID:', process.env.FIREBASE_PROJECT_ID);
    console.log('📧 Client Email:', process.env.FIREBASE_CLIENT_EMAIL);
    console.log('🗂️ Storage Bucket:', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
    
    // Parse the private key (handle escaped newlines)
    const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n');
    
    // Validate private key format
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----') || !privateKey.includes('-----END PRIVATE KEY-----')) {
      throw new Error('Invalid FIREBASE_PRIVATE_KEY format. Must include BEGIN and END markers.');
    }

    app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey,
      }),
      projectId: process.env.FIREBASE_PROJECT_ID!,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    });
    
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error);
    console.error('📋 Environment check:');
    console.error('  - FIREBASE_PROJECT_ID:', !!process.env.FIREBASE_PROJECT_ID);
    console.error('  - FIREBASE_CLIENT_EMAIL:', !!process.env.FIREBASE_CLIENT_EMAIL);
    console.error('  - FIREBASE_PRIVATE_KEY:', !!process.env.FIREBASE_PRIVATE_KEY);
    console.error('  - STORAGE_BUCKET:', !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
    
    if (error instanceof Error) {
      throw new Error(`Firebase Admin initialization failed: ${error.message}`);
    } else {
      throw new Error('Firebase Admin initialization failed with unknown error');
    }
  }
} else {
  console.log('♻️ Using existing Firebase Admin app');
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