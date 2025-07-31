'use client';

import React from 'react';
import { Box, Container, AppBar, Toolbar, Typography, Button, useTheme, alpha } from '@mui/material';
import { WhatsApp, Phone, Email } from '@mui/icons-material';
import { MiniSiteConfig } from '@/lib/types/mini-site';

interface MiniSiteLayoutProps {
  children: React.ReactNode;
  config: MiniSiteConfig;
}

export default function MiniSiteLayout({ children, config }: MiniSiteLayoutProps) {
  const theme = useTheme();

  const customTheme = {
    ...theme,
    palette: {
      ...theme.palette,
      primary: {
        main: config.theme.primaryColor,
      },
      secondary: {
        main: config.theme.secondaryColor,
      },
    },
  };

  const headerStyle = {
    background: `linear-gradient(135deg, ${config.theme.primaryColor}15, ${config.theme.secondaryColor}10)`,
    backdropFilter: 'blur(20px)',
    borderBottom: `1px solid ${alpha(config.theme.primaryColor, 0.1)}`,
    boxShadow: `0 8px 32px ${alpha(config.theme.primaryColor, 0.1)}`,
  };

  const logoStyle = {
    background: `linear-gradient(135deg, ${config.theme.primaryColor}, ${config.theme.accentColor})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontWeight: 700,
    fontSize: '1.5rem',
  };

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent(`Olá! Encontrei seu site e gostaria de saber mais sobre suas propriedades. Estou interessado em fazer uma reserva.`);
    window.open(`https://wa.me/${config.contactInfo.whatsappNumber.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${config.theme.backgroundColor} 0%, ${alpha(config.theme.primaryColor, 0.03)} 100%)`,
        color: config.theme.textColor,
      }}
    >
      {/* Header */}
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={headerStyle}
      >
        <Container maxWidth="xl">
          <Toolbar sx={{ justifyContent: 'space-between', py: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {config.contactInfo.businessLogo && (
                <Box
                  component="img"
                  src={config.contactInfo.businessLogo}
                  alt={config.contactInfo.businessName}
                  sx={{ 
                    height: 40, 
                    width: 'auto',
                    borderRadius: config.theme.borderRadius === 'extra-rounded' ? 2 : config.theme.borderRadius === 'rounded' ? 1 : 0
                  }}
                />
              )}
              <Typography variant="h6" component="div" sx={logoStyle}>
                {config.contactInfo.businessName}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              {config.contactInfo.whatsappNumber && (
                <Button
                  startIcon={<WhatsApp />}
                  onClick={handleWhatsAppClick}
                  sx={{
                    background: `linear-gradient(135deg, #25D366, #128C7E)`,
                    color: '#ffffff',
                    borderRadius: config.theme.borderRadius === 'extra-rounded' ? 3 : config.theme.borderRadius === 'rounded' ? 2 : 0,
                    px: 3,
                    py: 1,
                    textTransform: 'none',
                    boxShadow: `0 4px 20px ${alpha('#25D366', 0.3)}`,
                    '&:hover': {
                      background: `linear-gradient(135deg, #128C7E, #075E54)`,
                      transform: 'translateY(-2px)',
                      boxShadow: `0 8px 30px ${alpha('#25D366', 0.4)}`,
                    },
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  Contato
                </Button>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Main Content */}
      <Box component="main">
        {children}
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          mt: 8,
          py: 6,
          background: `linear-gradient(135deg, ${alpha(config.theme.primaryColor, 0.05)}, ${alpha(config.theme.secondaryColor, 0.03)})`,
          backdropFilter: 'blur(20px)',
          borderTop: `1px solid ${alpha(config.theme.primaryColor, 0.1)}`,
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: config.theme.primaryColor }}>
              {config.contactInfo.businessName}
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, opacity: 0.8 }}>
              {config.contactInfo.businessDescription}
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
              {config.contactInfo.whatsappNumber && (
                <Button
                  startIcon={<WhatsApp />}
                  onClick={handleWhatsAppClick}
                  variant="outlined"
                  sx={{
                    borderColor: alpha(config.theme.primaryColor, 0.3),
                    color: config.theme.primaryColor,
                    borderRadius: 2,
                    '&:hover': {
                      backgroundColor: alpha(config.theme.primaryColor, 0.1),
                      borderColor: config.theme.primaryColor,
                    },
                  }}
                >
                  WhatsApp
                </Button>
              )}
              {config.contactInfo.email && (
                <Button
                  startIcon={<Email />}
                  href={`mailto:${config.contactInfo.email}`}
                  variant="outlined"
                  sx={{
                    borderColor: alpha(config.theme.primaryColor, 0.3),
                    color: config.theme.primaryColor,
                    borderRadius: 2,
                    '&:hover': {
                      backgroundColor: alpha(config.theme.primaryColor, 0.1),
                      borderColor: config.theme.primaryColor,
                    },
                  }}
                >
                  Email
                </Button>
              )}
            </Box>

            <Typography variant="caption" sx={{ opacity: 0.6 }}>
              © 2024 {config.contactInfo.businessName}. Powered by Locai - Plataforma de CRM e Maximização de Reservas
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}