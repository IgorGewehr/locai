import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// Hardcoded Firebase Admin configuration
const FIREBASE_PROJECT_ID = 'locai-76dcf';
const FIREBASE_CLIENT_EMAIL = 'firebase-adminsdk-fbsvc@locai-76dcf.iam.gserviceaccount.com';
const FIREBASE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDASTbJp3VRgZpl\ntr2uvLkwpcR5sVmIQA33ziSCktN1tjTAfjLROFvoh4LfJs3Vv6h4qgXvpXpCW8vH\nyCJlDIkzKlPkm/3RuDshdnzHRKpNDRmee3VCcyS3KNJCO2Jwjcl6bSA0IJis6nJa\nLArB/rgh1KclZcHZtN5wur9GDzHiXGdaaSOSO2Jnl8UPTb0Hrbf0ZVXGX2mWRwOx\nTnJGnmNXzmrDHgWmEZlqu8PYmOTSNJZO6Ra+wCXqX25QjR9Do1ICdymBnSl7i/Hw\nxgL+I0kovYkrN+qm2BbQRsy4eaTxn+K+6DOhlbBTEhuZr/uaUUpEHDCorXg+btnk\nW7l476WpAgMBAAECggEAGrDO+xTUkxjDXsUL9Vpa9ma8LAwzGleR2MjzhnBtC9Tb\n47Bgy2vgThmpT+JqBfaRoxYutsIog1eMpNGh/JbN4J1KgdwpUlgZVR7GWT6tyP49\nhSMr9qpW+VmgPfNSSb9UrTrCkpnHt5DfiKa+Y4lA8+k5vlYun1Kc4db6P/ZR/VKK\nqJY0J4C2+2j8nW1GrOxkSaP0HGkaS35LCsFLPGYWcrC6egeh7sO8GfO7VrlRW0Wp\nnT8QTVf64dR0894Lm7Re2CeOTeFZ7nS786rbSg7wLHrVnkabZyS8UKSvflYkJJmC\nDWjGjZSvPQefrrGCqzYZ+j3RzBR5qkPn1IzyNW8uJQKBgQDgyQZWF1UTLBL6Vx8C\n8Z/dWt2rcP4OlOSTBbGMYfg3x4BZEXUjBXcxnPdbKMPFpd5KrlrjHe7nNtrwR8uo\niwwsDPc1A14adh/VFp7oBi509eTandhQ0iGyAZrvPEf+M+tkAHjrornBGNP0l/6A\nlrQei+5+jy7apfA9QwnrqSNuiwKBgQDa/NxhM4Jd3MSzICOUgxlixhlGT0SE5At/\nPwG6XhGsdNWQZGjArY6z2ZdYxjbhwKsk6FMPywVpiZPkQwk9Ces/KJ77WOmn1UEL\nlyA9eNYe0TJHzknpwj98Co5BwFyxnF4cj89FkLxzGt6Jb3dqRyi+3B7WCeWQJsnN\nYsvUqt2XGwKBgAe7IjqnxsdIBscRZAGn6cWlMGaLFlHOESZ1VavsWqsgc2uczBiO\nQZE1QtShzEnp8IFFCd8x0lulaVZGQdzkG2EQeRgbq4rhcSrVAlYckFB5fIuATkZJ\nU9tZbsi3nApEIt5nncEM8bKQdgm9iIVHqZ47VdKIfiYK+v5AZgDy6kMNAoGALiKd\nj0DZ00qCijZYKJ6iB4QyqPRkPBcLMQimJYxR7uJCaAQvaYBnEw7hast/nnoH1GO5\ntBcSkdRxOuLAnIJtdEXrkIp/12L/LCDvouPFQILUM/qK6duJomla5RFQtf56eUv2\n3/IJMbrUbWH1Z4eMVwFq4a7+FSuG0mVhCfHhc0cCgYBjMbgal53mlfOFZmgMB14r\nj1K0R1oo+daZhYWSPQXLS3hfTXgSxPoz8YG9H9O1uOOHII2wRIJE7Gm4jFq7DhIr\n1mK13TR6WLNH1gJeIp/eH781RiCbBTzMikjGEu4bAunGu8rS0czTQreDI62VHfS/\n/suP25cNFjVc1+xWcoL7Ig==\n-----END PRIVATE KEY-----\n";
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