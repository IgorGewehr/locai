import type { Metadata } from 'next';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster } from 'react-hot-toast';
import { lightTheme } from '@/theme/theme';
import { AuthProvider } from '@/contexts/AuthContext';
import '@/styles/globals.css';

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
        <AppRouterCacheProvider>
          <ThemeProvider theme={lightTheme}>
            <CssBaseline />
            <AuthProvider>
              {children}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                }}
              />
            </AuthProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}