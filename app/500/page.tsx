export const dynamic = 'force-dynamic';

export default function Custom500() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ fontSize: '4rem', margin: '0 0 1rem 0' }}>500</h1>
      <h2 style={{ fontSize: '1.5rem', margin: '0 0 1rem 0' }}>Erro interno do servidor</h2>
      <p style={{ margin: '0 0 2rem 0' }}>Ocorreu um erro interno no servidor.</p>
      <a href="/dashboard" style={{ 
        padding: '0.75rem 1.5rem', 
        backgroundColor: '#1976d2', 
        color: 'white', 
        textDecoration: 'none',
        borderRadius: '4px'
      }}>
        Ir para Dashboard
      </a>
    </div>
  );
}