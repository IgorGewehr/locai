import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth } from './config';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  tenantId?: string;
  role?: 'admin' | 'user';
}

export class AuthService {
  static async signIn(email: string, password: string): Promise<AuthUser> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return this.mapFirebaseUser(userCredential.user);
  }

  static async signUp(email: string, password: string, displayName?: string): Promise<AuthUser> {
    try {
      // Add retry logic for network failures
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          
          if (displayName) {
            await updateProfile(userCredential.user, { displayName });
          }
          
          return this.mapFirebaseUser(userCredential.user);
        } catch (error: any) {
          attempts++;
          
          // If it's a network error and we haven't exhausted retries, wait and try again
          if (error.code === 'auth/network-request-failed' && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
            continue;
          }
          
          // Re-throw the error if it's not a network error or we've exhausted retries
          throw error;
        }
      }
      
      throw new Error('Failed to create account after multiple attempts');
    } catch (error: any) {
      console.error('Auth SignUp Error:', error);
      throw error;
    }
  }

  static async signOut(): Promise<void> {
    await signOut(auth);
  }

  static async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  }

  static async updateUserProfile(displayName?: string, photoURL?: string): Promise<void> {
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName, photoURL });
    }
  }

  static onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    return onAuthStateChanged(auth, (user) => {
      callback(user ? this.mapFirebaseUser(user) : null);
    });
  }

  static getCurrentUser(): AuthUser | null {
    return auth.currentUser ? this.mapFirebaseUser(auth.currentUser) : null;
  }

  private static mapFirebaseUser(user: User): AuthUser {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      tenantId: (user as any).tenantId,
      role: (user as any).role,
    };
  }
}

export default AuthService;