'use client';

import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#f9f9f9',
      padding: '2rem'
    }}>
      <h1 style={{ 
        fontSize: '3rem', 
        margin: '0 0 1rem 0',
        color: '#d32f2f'
      }}>
        Erro Global
      </h1>
      <h2 style={{ 
        fontSize: '1.5rem', 
        margin: '0 0 1rem 0',
        color: '#666'
      }}>
        Algo deu errado!
      </h2>
      <p style={{ 
        margin: '0 0 2rem 0',
        textAlign: 'center',
        color: '#888'
      }}>
        Ocorreu um erro inesperado na aplicação.
      </p>
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
        <Link href="/dashboard" style={{ 
          padding: '0.75rem 1.5rem', 
          backgroundColor: 'transparent', 
          color: '#1976d2',
          border: '1px solid #1976d2',
          textDecoration: 'none',
          borderRadius: '4px',
          display: 'inline-block'
        }}>
          Ir para Dashboard
        </Link>
      </div>
    </div>
  );
}