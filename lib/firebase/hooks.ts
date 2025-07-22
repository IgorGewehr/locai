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
          console.error(`Error fetching ${collectionName}:`, err);
          setError(err as Error);
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (err) {
      console.error(`Error setting up listener for ${collectionName}:`, err);
      setError(err as Error);
      setLoading(false);
    }
  }, [collectionName, queryConstraints]);

  return { data, loading, error };
}

// Hook específico para reservas
export function useReservations() {
  return useFirestore<any[]>('reservations', [
    orderBy('checkIn', 'asc')
  ]);
}

// Hook específico para propriedades
export function useProperties() {
  return useFirestore<any[]>('properties', [
    orderBy('name', 'asc')
  ]);
}

// Hook específico para clientes  
export function useClients() {
  return useFirestore<any[]>('clients', [
    orderBy('name', 'asc')
  ]);
}