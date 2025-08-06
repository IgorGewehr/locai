'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  useTheme, 
  alpha,
  IconButton,
  Menu,
  MenuItem,
  useMediaQuery,
  Fab,
  Zoom,
  Breadcrumbs,
  Link as MuiLink,
  Chip,
  Stack
} from '@mui/material';
import { 
  WhatsApp, 
  Phone, 
  Email, 
  Menu as MenuIcon,
  LocationOn,
  AccessTime,
  Star,
  KeyboardArrowUp,
  Home,
  Search,
  Info,
  ContactMail,
  Language,
  Share,
  Favorite,
  Instagram,
  Facebook,
  LinkedIn,
  Twitter
} from '@mui/icons-material';
import { MiniSiteConfig } from '@/lib/types/mini-site';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface MiniSiteLayoutProps {
  children: React.ReactNode;
  config: MiniSiteConfig;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  showBackToTop?: boolean;
}

const FloatingWhatsAppButton = ({ config }: { config: MiniSiteConfig }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent(
      `Olá! Encontrei seu site ${config.contactInfo.businessName} e gostaria de saber mais sobre suas propriedades. Estou interessado em fazer uma reserva.`
    );
    window.open(`https://wa.me/${config.contactInfo.whatsappNumber.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  return (
    <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            style={{ position: 'absolute', bottom: 70, right: 0 }}
          >
            <Box
              sx={{
                backgroundColor: '#fff',
                borderRadius: 2,
                p: 2,
                boxShadow: `0 8px 32px ${alpha('#000', 0.12)}`,
                border: `1px solid ${alpha(config.theme.primaryColor, 0.1)}`,
                minWidth: 200,
                maxWidth: 280,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                💬 Precisa de ajuda?
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>
                Fale conosco via WhatsApp! Estamos online e prontos para ajudar com sua reserva.
              </Typography>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
      
      <Fab
        color="primary"
        size="large"
        onClick={handleWhatsAppClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        sx={{
          background: 'linear-gradient(135deg, #25D366, #128C7E)',
          color: 'white',
          width: 64,
          height: 64,
          boxShadow: `0 8px 32px ${alpha('#25D366', 0.4)}`,
          '&:hover': {
            background: 'linear-gradient(135deg, #128C7E, #075E54)',
            transform: 'scale(1.1)',
            boxShadow: `0 12px 40px ${alpha('#25D366', 0.5)}`,
          },
          '&:active': {
            transform: 'scale(1.05)',
          },
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          animation: 'pulse 2s infinite',
          '@keyframes pulse': {
            '0%': {
              boxShadow: `0 8px 32px ${alpha('#25D366', 0.4)}`,
            },
            '50%': {
              boxShadow: `0 8px 32px ${alpha('#25D366', 0.6)}, 0 0 0 4px ${alpha('#25D366', 0.1)}`,
            },
            '100%': {
              boxShadow: `0 8px 32px ${alpha('#25D366', 0.4)}`,
            },
          },
        }}
      >
        <WhatsApp sx={{ fontSize: 32 }} />
      </Fab>
    </Box>
  );
};

const BackToTopButton = () => {
  const [showBackToTop, setShowBackToTop] = useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Zoom in={showBackToTop}>
      <Fab
        size="medium"
        onClick={scrollToTop}
        sx={{
          position: 'fixed',
          bottom: 24,
          left: 24,
          zIndex: 999,
          backgroundColor: alpha('#fff', 0.9),
          color: 'text.primary',
          backdropFilter: 'blur(10px)',
          '&:hover': {
            backgroundColor: '#fff',
            transform: 'translateY(-2px)',
          },
          transition: 'all 0.3s ease',
        }}
      >
        <KeyboardArrowUp />
      </Fab>
    </Zoom>
  );
};

export default function MiniSiteLayout({ 
  children, 
  config, 
  breadcrumbs,
  showBackToTop = true 
}: MiniSiteLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMobileMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setMobileMenuOpen(true);
  };

  const handleMobileMenuClose = () => {
    setAnchorEl(null);
    setMobileMenuOpen(false);
  };

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent(
      `Olá! Encontrei seu site ${config.contactInfo.businessName} e gostaria de saber mais sobre suas propriedades. Estou interessado em fazer uma reserva.`
    );
    window.open(`https://wa.me/${config.contactInfo.whatsappNumber.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  const headerStyle = {
    background: `linear-gradient(135deg, 
      ${alpha('#fff', 0.95)} 0%, 
      ${alpha('#fff', 0.9)} 100%
    )`,
    backdropFilter: 'blur(20px)',
    borderBottom: `1px solid ${alpha(config.theme.primaryColor, 0.08)}`,
    boxShadow: `0 4px 20px -2px ${alpha('#000', 0.05)}`,
  };

  const logoStyle = {
    background: `linear-gradient(135deg, ${config.theme.primaryColor}, ${config.theme.accentColor})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontWeight: 800,
    fontSize: isMobile ? '1.3rem' : '1.6rem',
    letterSpacing: '-0.5px',
  };

  const navigationItems = [
    { label: 'Início', href: `/site/${config.tenantId}`, icon: <Home /> },
    { label: 'Propriedades', href: `/site/${config.tenantId}`, icon: <Search /> },
    { label: 'Sobre', href: '#about', icon: <Info /> },
    { label: 'Contato', href: '#contact', icon: <ContactMail /> },
  ];

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        background: `linear-gradient(135deg, 
          ${config.theme.backgroundColor} 0%, 
          ${alpha(config.theme.primaryColor, 0.02)} 50%,
          ${alpha(config.theme.accentColor, 0.02)} 100%
        )`,
        color: config.theme.textColor,
        position: 'relative',
      }}
    >
      {/* Enhanced Header */}
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={headerStyle}
      >
        <Container maxWidth="xl">
          <Toolbar sx={{ justifyContent: 'space-between', py: 1, minHeight: '72px' }}>
            {/* Logo Section */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {config.contactInfo.businessLogo && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  <Box
                    component="img"
                    src={config.contactInfo.businessLogo}
                    alt={config.contactInfo.businessName}
                    sx={{ 
                      height: isMobile ? 36 : 44, 
                      width: 'auto',
                      borderRadius: 2,
                      filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.1))',
                    }}
                  />
                </motion.div>
              )}
              <Box>
                <Typography variant="h6" component="div" sx={logoStyle}>
                  {config.contactInfo.businessName}
                </Typography>
                {config.contactInfo.businessDescription && !isMobile && (
                  <Typography variant="caption" sx={{ 
                    color: 'text.secondary', 
                    fontSize: '0.75rem',
                    display: 'block',
                    mt: -0.5
                  }}>
                    {config.contactInfo.businessDescription.slice(0, 40)}
                    {config.contactInfo.businessDescription.length > 40 ? '...' : ''}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Desktop Navigation */}
            {!isMobile && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {navigationItems.map((item) => (
                  <Button
                    key={item.label}
                    startIcon={item.icon}
                    href={item.href}
                    sx={{
                      color: 'text.primary',
                      borderRadius: 2,
                      px: 2,
                      py: 1,
                      textTransform: 'none',
                      fontWeight: 500,
                      '&:hover': {
                        backgroundColor: alpha(config.theme.primaryColor, 0.08),
                        color: config.theme.primaryColor,
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Box>
            )}

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {!isMobile && config.contactInfo.whatsappNumber && (
                <Button
                  startIcon={<WhatsApp />}
                  onClick={handleWhatsAppClick}
                  variant="contained"
                  sx={{
                    background: `linear-gradient(135deg, #25D366, #128C7E)`,
                    color: 'white',
                    borderRadius: 2.5,
                    px: 3,
                    py: 1.2,
                    textTransform: 'none',
                    fontWeight: 600,
                    boxShadow: `0 4px 16px ${alpha('#25D366', 0.3)}`,
                    '&:hover': {
                      background: `linear-gradient(135deg, #128C7E, #075E54)`,
                      transform: 'translateY(-1px)',
                      boxShadow: `0 6px 20px ${alpha('#25D366', 0.4)}`,
                    },
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  Reservar Agora
                </Button>
              )}

              {/* Mobile Menu Button */}
              {isMobile && (
                <IconButton
                  onClick={handleMobileMenuClick}
                  sx={{
                    color: config.theme.primaryColor,
                    backgroundColor: alpha(config.theme.primaryColor, 0.08),
                    '&:hover': {
                      backgroundColor: alpha(config.theme.primaryColor, 0.12),
                    },
                  }}
                >
                  <MenuIcon />
                </IconButton>
              )}
            </Box>
          </Toolbar>

          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Box sx={{ pb: 2, pt: 1 }}>
              <Breadcrumbs
                separator="›"
                sx={{
                  '& .MuiBreadcrumbs-separator': {
                    color: alpha(config.theme.primaryColor, 0.4),
                    mx: 1,
                  },
                }}
              >
                {breadcrumbs.map((crumb, index) => (
                  crumb.href ? (
                    <MuiLink
                      key={index}
                      component={Link}
                      href={crumb.href}
                      sx={{
                        color: alpha(config.theme.primaryColor, 0.7),
                        textDecoration: 'none',
                        fontSize: '0.85rem',
                        '&:hover': {
                          color: config.theme.primaryColor,
                          textDecoration: 'underline',
                        },
                      }}
                    >
                      {crumb.label}
                    </MuiLink>
                  ) : (
                    <Typography key={index} sx={{ 
                      color: 'text.primary', 
                      fontSize: '0.85rem',
                      fontWeight: 500,
                    }}>
                      {crumb.label}
                    </Typography>
                  )
                ))}
              </Breadcrumbs>
            </Box>
          )}
        </Container>
      </AppBar>

      {/* Mobile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={mobileMenuOpen}
        onClose={handleMobileMenuClose}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: 3,
            minWidth: 200,
            boxShadow: `0 8px 40px ${alpha('#000', 0.12)}`,
            border: `1px solid ${alpha(config.theme.primaryColor, 0.1)}`,
          }
        }}
      >
        {navigationItems.map((item) => (
          <MenuItem
            key={item.label}
            onClick={handleMobileMenuClose}
            component={Link}
            href={item.href}
            sx={{
              gap: 2,
              py: 1.5,
              '&:hover': {
                backgroundColor: alpha(config.theme.primaryColor, 0.08),
                color: config.theme.primaryColor,
              },
            }}
          >
            {item.icon}
            {item.label}
          </MenuItem>
        ))}
        <Box sx={{ p: 2, borderTop: `1px solid ${alpha('#000', 0.1)}` }}>
          <Button
            startIcon={<WhatsApp />}
            onClick={() => {
              handleWhatsAppClick();
              handleMobileMenuClose();
            }}
            fullWidth
            variant="contained"
            sx={{
              background: `linear-gradient(135deg, #25D366, #128C7E)`,
              color: 'white',
              borderRadius: 2,
              py: 1.2,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Contato via WhatsApp
          </Button>
        </Box>
      </Menu>

      {/* Main Content */}
      <Box component="main" sx={{ minHeight: 'calc(100vh - 200px)' }}>
        {children}
      </Box>

      {/* Enhanced Footer */}
      <Box
        component="footer"
        sx={{
          mt: 8,
          py: 6,
          background: `linear-gradient(135deg, 
            ${alpha('#000', 0.02)} 0%, 
            ${alpha(config.theme.primaryColor, 0.03)} 100%
          )`,
          backdropFilter: 'blur(20px)',
          borderTop: `1px solid ${alpha(config.theme.primaryColor, 0.08)}`,
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            {/* Business Info */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ 
                fontWeight: 700, 
                color: config.theme.primaryColor,
                background: `linear-gradient(135deg, ${config.theme.primaryColor}, ${config.theme.accentColor})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                {config.contactInfo.businessName}
              </Typography>
              {config.contactInfo.businessDescription && (
                <Typography variant="body1" sx={{ 
                  mb: 3, 
                  color: 'text.secondary',
                  maxWidth: 500,
                  mx: 'auto',
                  lineHeight: 1.6,
                }}>
                  {config.contactInfo.businessDescription}
                </Typography>
              )}
            </Box>

            {/* Contact Info */}
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={2} 
              justifyContent="center" 
              alignItems="center"
              sx={{ mb: 4 }}
            >
              {config.contactInfo.address && (
                <Chip
                  icon={<LocationOn />}
                  label={config.contactInfo.address}
                  variant="outlined"
                  sx={{
                    borderColor: alpha(config.theme.primaryColor, 0.2),
                    color: 'text.secondary',
                  }}
                />
              )}
              {config.contactInfo.businessHours && (
                <Chip
                  icon={<AccessTime />}
                  label={config.contactInfo.businessHours}
                  variant="outlined"
                  sx={{
                    borderColor: alpha(config.theme.primaryColor, 0.2),
                    color: 'text.secondary',
                  }}
                />
              )}
              <Chip
                icon={<Star />}
                label="Propriedades Verificadas"
                color="primary"
                sx={{
                  background: `linear-gradient(135deg, ${alpha(config.theme.primaryColor, 0.1)}, ${alpha(config.theme.accentColor, 0.1)})`,
                  color: config.theme.primaryColor,
                  fontWeight: 600,
                }}
              />
            </Stack>
            
            {/* Contact Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 4, flexWrap: 'wrap' }}>
              {config.contactInfo.whatsappNumber && (
                <Button
                  startIcon={<WhatsApp />}
                  onClick={handleWhatsAppClick}
                  variant="contained"
                  size="large"
                  sx={{
                    background: `linear-gradient(135deg, #25D366, #128C7E)`,
                    color: 'white',
                    borderRadius: 2.5,
                    px: 4,
                    py: 1.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      background: `linear-gradient(135deg, #128C7E, #075E54)`,
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.3s ease',
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
                  size="large"
                  sx={{
                    borderColor: alpha(config.theme.primaryColor, 0.3),
                    color: config.theme.primaryColor,
                    borderRadius: 2.5,
                    px: 4,
                    py: 1.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      backgroundColor: alpha(config.theme.primaryColor, 0.08),
                      borderColor: config.theme.primaryColor,
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Email
                </Button>
              )}
            </Box>

            {/* Social Media Links */}
            {(config.contactInfo.socialMedia?.instagram || 
              config.contactInfo.socialMedia?.facebook || 
              config.contactInfo.socialMedia?.linkedin) && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
                  Siga-nos nas redes sociais
                </Typography>
                <Stack direction="row" spacing={1} justifyContent="center">
                  {config.contactInfo.socialMedia?.instagram && (
                    <IconButton
                      href={config.contactInfo.socialMedia.instagram}
                      target="_blank"
                      sx={{
                        color: '#E4405F',
                        backgroundColor: alpha('#E4405F', 0.1),
                        '&:hover': {
                          backgroundColor: alpha('#E4405F', 0.2),
                          transform: 'scale(1.1)',
                        },
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Instagram />
                    </IconButton>
                  )}
                  {config.contactInfo.socialMedia?.facebook && (
                    <IconButton
                      href={config.contactInfo.socialMedia.facebook}
                      target="_blank"
                      sx={{
                        color: '#1877F2',
                        backgroundColor: alpha('#1877F2', 0.1),
                        '&:hover': {
                          backgroundColor: alpha('#1877F2', 0.2),
                          transform: 'scale(1.1)',
                        },
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Facebook />
                    </IconButton>
                  )}
                  {config.contactInfo.socialMedia?.linkedin && (
                    <IconButton
                      href={config.contactInfo.socialMedia.linkedin}
                      target="_blank"
                      sx={{
                        color: '#0A66C2',
                        backgroundColor: alpha('#0A66C2', 0.1),
                        '&:hover': {
                          backgroundColor: alpha('#0A66C2', 0.2),
                          transform: 'scale(1.1)',
                        },
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <LinkedIn />
                    </IconButton>
                  )}
                </Stack>
              </Box>
            )}

            {/* Copyright */}
            <Box sx={{ 
              pt: 4, 
              borderTop: `1px solid ${alpha(config.theme.primaryColor, 0.1)}` 
            }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                © 2024 {config.contactInfo.businessName}. Todos os direitos reservados.
                <br />
                Powered by <strong>Locai</strong> - Plataforma de CRM e Maximização de Reservas
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Floating Elements */}
      {config.contactInfo.whatsappNumber && <FloatingWhatsAppButton config={config} />}
      {showBackToTop && <BackToTopButton />}
    </Box>
  );
}