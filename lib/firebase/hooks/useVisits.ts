// lib/firebase/hooks/useVisits.ts
import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { VisitAppointment } from '@/lib/types/visit-appointment';
import { useTenant } from '@/contexts/TenantContext';
import { logger } from '@/lib/utils/logger';

export function useVisits() {
  const [visits, setVisits] = useState<VisitAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { tenantId } = useTenant();

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'visit_appointments'),
      where('tenantId', '==', tenantId),
      orderBy('scheduledDate', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const visitsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as VisitAppointment));
        
        setVisits(visitsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        logger.error('Error fetching visits', { error: err });
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tenantId]);

  return { data: visits, loading, error };
}

export function useUpcomingVisits(days: number = 7) {
  const [visits, setVisits] = useState<VisitAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { tenantId } = useTenant();

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    endDate.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, 'visit_appointments'),
      where('tenantId', '==', tenantId),
      where('scheduledDate', '>=', today),
      where('scheduledDate', '<=', endDate),
      where('status', 'in', ['scheduled', 'confirmed']),
      orderBy('scheduledDate', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const visitsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as VisitAppointment));
        
        setVisits(visitsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        logger.error('Error fetching upcoming visits', { error: err });
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tenantId, days]);

  return { data: visits, loading, error };
}

export function useTodayVisits() {
  const [visits, setVisits] = useState<VisitAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { tenantId } = useTenant();

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const q = query(
      collection(db, 'visit_appointments'),
      where('tenantId', '==', tenantId),
      where('scheduledDate', '>=', today),
      where('scheduledDate', '<', tomorrow),
      orderBy('scheduledDate', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const visitsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as VisitAppointment));
        
        setVisits(visitsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        logger.error('Error fetching today visits', { error: err });
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tenantId]);

  return { data: visits, loading, error };
}