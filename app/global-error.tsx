'use client';

import { useEffect } from 'react';
import { Box, Container, Typography, Button } from '@mui/material';
import { Refresh, Home } from '@mui/icons-material';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '600px' }}>
            <h1 style={{ fontSize: '4rem', fontWeight: 'bold', marginBottom: '1rem', color: '#333' }}>
              500
            </h1>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#555' }}>
              Erro interno do servidor
            </h2>
            <p style={{ color: '#666', marginBottom: '2rem' }}>
              Ocorreu um erro inesperado no servidor. Nossa equipe foi notificada.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={reset}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  minWidth: '150px'
                }}
              >
                Tentar novamente
              </button>
              <button
                onClick={() => window.location.href = '/dashboard'}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'transparent',
                  color: '#1976d2',
                  border: '1px solid #1976d2',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  minWidth: '150px'
                }}
              >
                Ir para Dashboard
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}