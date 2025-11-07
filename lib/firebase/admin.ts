import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// Hardcoded Firebase Admin configuration
const FIREBASE_PROJECT_ID = 'locai-76dcf';
const FIREBASE_CLIENT_EMAIL = 'firebase-adminsdk-fbsvc@locai-76dcf.iam.gserviceaccount.com';
const FIREBASE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDNkqtT0TfbBH0b\n685DqfeOd4NWsQqKJmrByHsmvvAxSE32RJn1zwtYNJt5AoqBWqg3NjitBBZzGYol\nIrYBpbMVmIMu7LRzzrUQsV/6hbqlPFVTG6sQZKPHPp1F1fBAfcuvafEa7G9dDc+A\niEhGupzN/2zpenKOUMlVJD4rko4LHA3i2XG/4oDWu60YL6bGeMr1uKSyF7nExBhB\nU4eC/CXRmDNE4808MgWgUWIbJTf7drZhZO3x4JGv24lYI9MPLS6VT3CFaU1Yu9CH\nWdHvl5q8W2/wE5h4KyFbpIB1j9F7dkFaMOmpVBRxeVuxKRpseehaYwhFyLWzAzqq\n+9ZO5BXjAgMBAAECggEADDjqr86SJBb1u0m/Vz2NRu6rI+Xdyw3yrffV/p0+maeD\nXx+ACeHX+lQSZFT22C8ELlgucXb7QLelg4S3TozEA4YwUoNnTTVehZIOM05tJPLb\n3deYyZ46MJfz8NmB8cuo5xKE78Vb76vpCOrRZUcmGIdVueH6WqTJ+6JugdeyU02p\n6S8HEcmzP7guVmPSE9J6xzoICQ6q50Raw6xrR62CgBGxJ3mC+cuwuGzPfLk+D7xW\njM64RjgJlM0OwL96J9GfpWpLjSnTA9f4uVMtt/c4tZcK6PHha04VBLxFayoWc0sL\nMZjQu9GeKWau5BBs5b/4Eg5SypA4Gtypc/MhAQAMuQKBgQDsVxM9nu0tqTHik5ZL\n8KrH9qinQ9bQeYXiRZf/7ok8O7TxVEDMxI4M8g1aw/UDvLS3qRmJwgKAS21y8Ivz\nJAydJqCznTf9o1tXtmTKqZdA9pVZpVfHcUE4upge+PK8oP6mtp7QFFSpCSTWTKbM\nYUHvFDZhtWxuzTWFetf+Pb6EGQKBgQDerGX4KCJ9wbqrCwLFyQ4g1+rzZ9WgNPyT\nFA/1B5oXPecehElbgeD5CNTFgceXShCWFUZs9kLMlQn1CrYR9mBddgt5w6vtvSFc\n12bzB0MGUCd8wHtXRdJEr8/UAY6esyVqC2iv7Xj3P6wMD7PP9DuAHyfU7DVWsXS6\nsxMgXIBJWwKBgQCNWVasmAyKLpMjS9mr+Xhqt98OishDTyr/tVe/Pc7eM2d4nkdT\nMIs0ut+51VEItyfuYDhh56LPUE1ZXPyWoozYwG2EfxcpnzXWM8P8YYmQ1OlmADmL\nkvTLFO4+N+4VWsRyuO4qzL4Fiu55LMblnZVtg80yiusbKahE+L+N0yfKoQKBgQCH\ncCjdldvUzd7yZlIbZz0WsP4Rati/BzuRYiSKj0MkW9yV7TSJWigykTKJp3R1CvGn\nt+0MHYVn1kcmKouvxUG71y8HswKCKgV+6O2PaJ1V268I7DKZVLieWql4dDIBSUm6\nhJH6X+Cx0qKc+3gNRqpiNZEOq1WOE4XCgWViy6Cj/QKBgDzz7mK8C+s5clP6vsgr\nZTE6PxM9REyIRuPP1jDA23/ptpDhxnYnxZYn/+1DSUSThIgOn9DiWNOmI0XVFJ8Y\nszZltIPgFVsbW4yO5ek3qpo+06I66LijWQnbnRIxZHVXyZHg0iz1n2SnZ65EOf9i\ng9PAIdY38uJUMXDP0kYT2Rv7\n-----END PRIVATE KEY-----\n";
const FIREBASE_STORAGE_BUCKET = 'locai-76dcf.firebasestorage.app';

// Initialize Firebase Admin
let app: App | null = null;

if (getApps().length === 0) {
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
  } catch (error) {
    console.error('Firebase Admin initialization error:', {
      error: error instanceof Error ? error.message : 'Unknown error'
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