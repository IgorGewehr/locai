import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Prevent Firebase initialization during build time
const isBuilding = process.env.NODE_ENV === 'production' && typeof window === 'undefined';

const firebaseConfig = {
  apiKey: isBuilding ? 'AIzaSyBKRDtn0BqMhE0Dk0wHI6iLaMmtForeChs' : process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: isBuilding ? 'locai-76dcf.firebaseapp.com' : process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: isBuilding ? 'locai-76dcf' : process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: isBuilding ? 'locai-76dcf.firebasestorage.app' : process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: isBuilding ? '1000449765567' : process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: isBuilding ? '1:1000449765567:web:43b5a6e5c2948462f9a3b2' : process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  // @ts-ignore - suppress type checking for optional measurementId
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Debug: Log configuration to help troubleshoot
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Firebase configuration validated - using professional logging instead of console.log
  // Configuration check moved to env-validator.ts for centralized validation
}

// Initialize Firebase
// @ts-ignore - suppress type checking for Firebase options
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase services with enhanced configurations
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// Validate storage bucket configuration silently
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  if (!firebaseConfig.storageBucket || firebaseConfig.storageBucket === 'undefined') {
    console.error('❌ [Firebase] Storage bucket is not configured!');
  }
}

// Basic connectivity settings - disabled to prevent INTERNAL ASSERTION FAILED
// Network is enabled by default in Firestore
// Removed enableNetwork call that was causing initialization issues

// Initialize Analytics (client-side only)
export const analytics = typeof window !== 'undefined' && firebaseConfig.measurementId 
  ? getAnalytics(app) 
  : null;

// DISABLED: offline persistence - causes internal assertion failures
// if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
//   import('firebase/firestore').then(({ enableNetwork, enableIndexedDbPersistence }) => {
//     enableIndexedDbPersistence(db).catch((err) => {
//       if (err.code === 'failed-precondition') {
//         // Multiple tabs open
//       } else if (err.code === 'unimplemented') {
//         // Not supported
//       }
//     });
//   });
// }

export default app;