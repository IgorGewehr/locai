'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { logger } from '@/lib/utils/logger';

interface ImportProgress {
  total: number;
  completed: number;
  failed: number;
  currentProperty?: string;
  stage: 'validating' | 'processing_media' | 'saving_properties' | 'completed' | 'failed';
  errors: ImportError[];
}

interface ImportError {
  propertyIndex: number;
  propertyTitle?: string;
  field?: string;
  message: string;
  type: 'validation' | 'media' | 'database' | 'duplicate';
}

interface ImportResult {
  success: boolean;
  importId: string;
  completed: boolean;
  result?: any;
  message: string;
  propertiesCount?: number;
}

interface UsePropertyImportReturn {
  importing: boolean;
  progress: ImportProgress | null;
  result: ImportResult | null;
  error: string | null;
  startImport: (file: File) => Promise<void>;
  reset: () => void;
}

export function usePropertyImport(): UsePropertyImportReturn {
  const { getFirebaseToken } = useAuth();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setImporting(false);
    setProgress(null);
    setResult(null);
    setError(null);
  }, []);


  const pollProgress = useCallback(async (): Promise<boolean> => {
    try {
      const token = await getFirebaseToken();
      if (!token) {
        logger.error('❌ [usePropertyImport] No auth token for progress polling');
        return false;
      }

      const response = await fetch('/api/properties/import/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 404) {
        // No import in progress
        return false;
      }

      if (!response.ok) {
        throw new Error('Erro ao verificar progresso');
      }

      const data = await response.json();

      if (data.progress) {
        setProgress(data.progress);

        if (data.completed) {
          setResult({
            success: data.progress.stage === 'completed',
            importId: 'completed',
            completed: true,
            result: data,
            message: data.progress.stage === 'completed'
              ? `Importação concluída: ${data.progress.completed} propriedades criadas`
              : 'Importação falhou'
          });
          setImporting(false);
          return false; // Stop polling
        }
      }

      return true; // Continue polling
    } catch (err) {
      logger.error('❌ [usePropertyImport] Progress polling failed', {
        error: err instanceof Error ? err.message : 'Unknown error'
      });
      return true; // Continue polling despite error
    }
  }, [getFirebaseToken]);

  const startProgressPolling = useCallback(() => {
    const poll = async () => {
      const shouldContinue = await pollProgress();
      if (shouldContinue) {
        setTimeout(poll, 2000); // Poll every 2 seconds
      }
    };
    poll();
  }, [pollProgress]);

  const startImport = useCallback(async (file: File) => {
    reset();
    setImporting(true);

    try {
      logger.info('🚀 [usePropertyImport] Starting import', {
        fileName: file.name,
        fileSize: file.size
      });

      // Validate file
      if (!file.name.toLowerCase().endsWith('.json')) {
        throw new Error('Por favor, selecione um arquivo JSON válido.');
      }


      // Read and parse file
      const fileContent = await file.text();
      let importData;

      try {
        importData = JSON.parse(fileContent);
      } catch {
        throw new Error('Arquivo JSON inválido');
      }

      // Get authentication token
      const token = await getFirebaseToken();
      if (!token) {
        throw new Error('Não foi possível obter token de autenticação');
      }

      // Start import
      const response = await fetch('/api/properties/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(importData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro na importação');
      }

      setResult(data);

      if (data.completed) {
        // Import completed immediately
        logger.info('✅ [usePropertyImport] Import completed immediately', {
          success: data.success,
          propertiesCount: data.propertiesCount
        });
        setImporting(false);
      } else {
        // Start polling for progress
        logger.info('🔄 [usePropertyImport] Starting progress polling', {
          importId: data.importId,
          propertiesCount: data.propertiesCount
        });
        startProgressPolling();
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      logger.error('❌ [usePropertyImport] Import failed', { error: errorMessage });

      setError(errorMessage);
      setProgress({
        total: 0,
        completed: 0,
        failed: 0,
        stage: 'failed',
        errors: [{
          propertyIndex: -1,
          message: errorMessage,
          type: 'validation'
        }]
      });
      setImporting(false);
    }
  }, [reset, startProgressPolling, getFirebaseToken]);

  return {
    importing,
    progress,
    result,
    error,
    startImport,
    reset
  };
}