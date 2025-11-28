/**
 * ✅ MÉDIO 9: Import Progress Service
 *
 * Persiste o progresso de importação no Firestore ao invés de memória
 * Isso permite:
 * - Recuperação após restart do servidor
 * - Funcionamento em ambiente com múltiplas instâncias (horizontal scaling)
 * - Histórico de importações para auditoria
 */

import { db } from '@/lib/firebase/config';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { logger } from '@/lib/utils/logger';

export interface ImportProgressData {
  total: number;
  completed: number;
  failed: number;
  currentProperty?: string;
  stage: 'validating' | 'processing_media' | 'saving_properties' | 'completed' | 'failed';
  errors: ImportErrorData[];
}

export interface ImportErrorData {
  propertyIndex: number;
  propertyTitle?: string;
  field?: string;
  message: string;
  type: 'validation' | 'media' | 'database' | 'duplicate';
}

export interface ImportJobDocument {
  id: string;
  tenantId: string;
  userId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: ImportProgressData;
  createdProperties: string[];
  skippedProperties: string[];
  source?: string;
  message?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
  expiresAt: Timestamp; // Para TTL automático
}

const COLLECTION_NAME = 'import_jobs';
const JOB_TTL_HOURS = 24; // Manter jobs por 24 horas

export class ImportProgressService {
  /**
   * Criar um novo job de importação
   */
  static async createJob(
    tenantId: string,
    totalProperties: number,
    userId?: string,
    source?: string
  ): Promise<string> {
    const jobId = `import_${tenantId}_${Date.now()}`;

    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(
      now.toMillis() + JOB_TTL_HOURS * 60 * 60 * 1000
    );

    const jobDoc: Omit<ImportJobDocument, 'id'> = {
      tenantId,
      userId,
      status: 'running',
      progress: {
        total: totalProperties,
        completed: 0,
        failed: 0,
        stage: 'validating',
        errors: [],
      },
      createdProperties: [],
      skippedProperties: [],
      source,
      createdAt: now,
      updatedAt: now,
      expiresAt,
    };

    await setDoc(doc(db, COLLECTION_NAME, jobId), jobDoc);

    logger.info('Import job created', {
      jobId,
      tenantId: tenantId.substring(0, 8) + '***',
      totalProperties,
    });

    return jobId;
  }

  /**
   * Atualizar progresso de um job
   */
  static async updateProgress(
    jobId: string,
    progress: Partial<ImportProgressData>
  ): Promise<void> {
    try {
      const updates: Record<string, any> = {
        updatedAt: serverTimestamp(),
      };

      // Atualizar campos de progresso
      if (progress.completed !== undefined) {
        updates['progress.completed'] = progress.completed;
      }
      if (progress.failed !== undefined) {
        updates['progress.failed'] = progress.failed;
      }
      if (progress.currentProperty !== undefined) {
        updates['progress.currentProperty'] = progress.currentProperty;
      }
      if (progress.stage !== undefined) {
        updates['progress.stage'] = progress.stage;

        // Atualizar status geral com base no stage
        if (progress.stage === 'completed') {
          updates.status = 'completed';
          updates.completedAt = serverTimestamp();
        } else if (progress.stage === 'failed') {
          updates.status = 'failed';
          updates.completedAt = serverTimestamp();
        }
      }
      if (progress.errors !== undefined) {
        updates['progress.errors'] = progress.errors;
      }

      await updateDoc(doc(db, COLLECTION_NAME, jobId), updates);
    } catch (error) {
      logger.error('Failed to update import progress', {
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Não throw - progresso de update não deve bloquear a importação
    }
  }

  /**
   * Adicionar propriedade criada ao job
   */
  static async addCreatedProperty(
    jobId: string,
    propertyTitle: string
  ): Promise<void> {
    try {
      const jobRef = doc(db, COLLECTION_NAME, jobId);
      const jobSnap = await getDoc(jobRef);

      if (jobSnap.exists()) {
        const data = jobSnap.data() as ImportJobDocument;
        await updateDoc(jobRef, {
          createdProperties: [...data.createdProperties, propertyTitle],
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      logger.error('Failed to add created property', {
        jobId,
        propertyTitle,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Adicionar propriedade pulada ao job
   */
  static async addSkippedProperty(
    jobId: string,
    propertyInfo: string
  ): Promise<void> {
    try {
      const jobRef = doc(db, COLLECTION_NAME, jobId);
      const jobSnap = await getDoc(jobRef);

      if (jobSnap.exists()) {
        const data = jobSnap.data() as ImportJobDocument;
        await updateDoc(jobRef, {
          skippedProperties: [...data.skippedProperties, propertyInfo],
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      logger.error('Failed to add skipped property', {
        jobId,
        propertyInfo,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Adicionar erro ao job
   */
  static async addError(
    jobId: string,
    error: ImportErrorData
  ): Promise<void> {
    try {
      const jobRef = doc(db, COLLECTION_NAME, jobId);
      const jobSnap = await getDoc(jobRef);

      if (jobSnap.exists()) {
        const data = jobSnap.data() as ImportJobDocument;
        await updateDoc(jobRef, {
          'progress.errors': [...data.progress.errors, error],
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      logger.error('Failed to add import error', {
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Marcar job como concluído
   */
  static async completeJob(
    jobId: string,
    message: string,
    success: boolean
  ): Promise<void> {
    try {
      await updateDoc(doc(db, COLLECTION_NAME, jobId), {
        status: success ? 'completed' : 'failed',
        'progress.stage': success ? 'completed' : 'failed',
        'progress.currentProperty': null,
        message,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      logger.info('Import job completed', {
        jobId,
        success,
        message,
      });
    } catch (error) {
      logger.error('Failed to complete import job', {
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Obter status de um job
   */
  static async getJob(jobId: string): Promise<ImportJobDocument | null> {
    try {
      const jobSnap = await getDoc(doc(db, COLLECTION_NAME, jobId));

      if (!jobSnap.exists()) {
        return null;
      }

      return {
        id: jobSnap.id,
        ...jobSnap.data(),
      } as ImportJobDocument;
    } catch (error) {
      logger.error('Failed to get import job', {
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Obter job ativo para um tenant
   */
  static async getActiveJob(tenantId: string): Promise<ImportJobDocument | null> {
    try {
      const jobsQuery = query(
        collection(db, COLLECTION_NAME),
        where('tenantId', '==', tenantId),
        where('status', '==', 'running'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(jobsQuery);

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as ImportJobDocument;
    } catch (error) {
      logger.error('Failed to get active import job', {
        tenantId: tenantId.substring(0, 8) + '***',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Obter job mais recente de um tenant (ativo ou concluído recentemente)
   */
  static async getLatestJob(tenantId: string): Promise<ImportJobDocument | null> {
    try {
      const jobsQuery = query(
        collection(db, COLLECTION_NAME),
        where('tenantId', '==', tenantId),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(jobsQuery);

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as ImportJobDocument;
    } catch (error) {
      logger.error('Failed to get latest import job', {
        tenantId: tenantId.substring(0, 8) + '***',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Listar histórico de importações de um tenant
   */
  static async listJobs(
    tenantId: string,
    maxResults = 10
  ): Promise<ImportJobDocument[]> {
    try {
      const jobsQuery = query(
        collection(db, COLLECTION_NAME),
        where('tenantId', '==', tenantId),
        orderBy('createdAt', 'desc'),
        limit(maxResults)
      );

      const snapshot = await getDocs(jobsQuery);

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ImportJobDocument[];
    } catch (error) {
      logger.error('Failed to list import jobs', {
        tenantId: tenantId.substring(0, 8) + '***',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Deletar job antigo (usado para limpeza)
   */
  static async deleteJob(jobId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, jobId));
      logger.info('Import job deleted', { jobId });
    } catch (error) {
      logger.error('Failed to delete import job', {
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Limpar jobs expirados (chamar periodicamente)
   */
  static async cleanupExpiredJobs(): Promise<number> {
    try {
      const now = Timestamp.now();
      const expiredQuery = query(
        collection(db, COLLECTION_NAME),
        where('expiresAt', '<', now),
        limit(100) // Processar em batches
      );

      const snapshot = await getDocs(expiredQuery);
      let deletedCount = 0;

      for (const doc of snapshot.docs) {
        await deleteDoc(doc.ref);
        deletedCount++;
      }

      if (deletedCount > 0) {
        logger.info('Cleaned up expired import jobs', { deletedCount });
      }

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired import jobs', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }
}

export default ImportProgressService;
