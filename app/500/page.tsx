'use client';

import Link from 'next/link';

export default function Custom500() {
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
        fontSize: '4rem', 
        margin: '0 0 1rem 0',
        color: '#d32f2f'
      }}>
        500
      </h1>
      <h2 style={{ 
        fontSize: '1.5rem', 
        margin: '0 0 1rem 0',
        color: '#666'
      }}>
        Erro interno do servidor
      </h2>
      <p style={{ 
        margin: '0 0 2rem 0',
        textAlign: 'center',
        color: '#888'
      }}>
        Ocorreu um erro interno no servidor.
      </p>
      <Link href="/dashboard" style={{ 
        padding: '0.75rem 1.5rem', 
        backgroundColor: '#1976d2', 
        color: 'white', 
        textDecoration: 'none',
        borderRadius: '4px',
        transition: 'background-color 0.2s'
      }}>
        Ir para Dashboard
      </Link>
    </div>
  );
}