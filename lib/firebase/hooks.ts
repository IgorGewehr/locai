import { useState, useEffect } from 'react';
import { 
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs
} from 'firebase/firestore';
import { db } from './config';
import { useTenant } from '@/contexts/TenantContext';
import { logger } from '@/lib/utils/logger';

export function useFirestore<T>(
  collectionName: string,
  queryConstraints?: any[]
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    try {
      const collectionRef = collection(db, collectionName);
      let q = collectionRef as any;

      if (queryConstraints && queryConstraints.length > 0) {
        q = query(collectionRef, ...queryConstraints);
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const items = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setData(items as T);
          setLoading(false);
        },
        (err) => {
          logger.error(`Error fetching ${collectionName}:`, { error: err, collectionName });
          setError(err as Error);
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (err) {
      logger.error(`Error setting up listener for ${collectionName}:`, { error: err, collectionName });
      setError(err as Error);
      setLoading(false);
    }
  }, [collectionName, queryConstraints]);

  return { data, loading, error };
}

// Hook multi-tenant genérico
export function useTenantFirestore<T>(
  collectionName: string,
  queryConstraints?: any[]
) {
  const { tenantId, isReady } = useTenant();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isReady || !tenantId) {
      logger.warn('No tenant found in useTenantFirestore', { collectionName, tenantId, isReady });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const tenantPath = `tenants/${tenantId}/${collectionName}`;
      const collectionRef = collection(db, tenantPath);
      let q = collectionRef as any;

      if (queryConstraints && queryConstraints.length > 0) {
        q = query(collectionRef, ...queryConstraints);
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const items = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setData(items as T);
          setLoading(false);
        },
        (err) => {
          logger.error(`Error fetching ${collectionName}:`, { 
            error: err,
            tenantId,
            collectionName 
          });
          setError(err as Error);
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (err) {
      logger.error(`Error setting up listener for ${collectionName}:`, {
        error: err,
        tenantId,
        collectionName
      });
      setError(err as Error);
      setLoading(false);
    }
  }, [collectionName, tenantId, isReady, JSON.stringify(queryConstraints)]);

  return { data, loading, error };
}

// Hook específico para reservas
export function useReservations() {
  return useTenantFirestore<any[]>('reservations', [
    orderBy('checkIn', 'asc')
  ]);
}

// Hook específico para propriedades
export function useProperties() {
  return useTenantFirestore<any[]>('properties', [
    orderBy('name', 'asc')
  ]);
}

// Hook específico para clientes  
export function useClients() {
  return useTenantFirestore<any[]>('clients', [
    orderBy('name', 'asc')
  ]);
}