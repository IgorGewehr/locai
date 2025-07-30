'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ fontSize: '2rem', margin: '0 0 1rem 0' }}>Algo deu errado!</h1>
      <p style={{ margin: '0 0 2rem 0' }}>Ocorreu um erro inesperado.</p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={reset}
          style={{ 
            padding: '0.75rem 1.5rem', 
            backgroundColor: '#1976d2', 
            color: 'white', 
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Tentar novamente
        </button>
        <a href="/dashboard" style={{ 
          padding: '0.75rem 1.5rem', 
          backgroundColor: 'transparent', 
          color: '#1976d2',
          border: '1px solid #1976d2',
          textDecoration: 'none',
          borderRadius: '4px',
          display: 'inline-block'
        }}>
          Ir para Dashboard
        </a>
      </div>
    </div>
  );
}