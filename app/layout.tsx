import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'Agente Imobiliária - Sistema de Gestão',
  description: 'Sistema completo de gestão para imobiliária com agente IA integrado ao WhatsApp',
  keywords: 'imobiliária, gestão, propriedades, WhatsApp, IA, reservas',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'rgba(15, 15, 15, 0.95)',
                color: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}