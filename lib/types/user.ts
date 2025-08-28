import { User as FirebaseUser } from 'firebase/auth';

export interface UserProfile extends FirebaseUser {
  // Extended profile fields
  phone?: string;
  company?: string;
  role?: UserRole;
  isAdmin?: boolean; // Computed property for convenience
  avatar?: string;
  settings?: {
    notifications?: boolean;
    theme?: 'light' | 'dark';
    language?: string;
  };
  metadata?: {
    createdAt?: Date;
    updatedAt?: Date;
    lastLogin?: Date;
  };
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  emailVerified: boolean;
  role?: UserRole;
  isAdmin?: boolean; // Computed property for convenience
}

export type UserRole = 'admin' | 'agent' | 'user';

export interface UserSettings {
  notifications: {
    email: boolean;
    whatsapp: boolean;
    push: boolean;
  };
  preferences: {
    language: string;
    timezone: string;
    dateFormat: string;
  };
}