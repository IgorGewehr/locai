'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Container,
  Fade,
  Slide,
  useTheme,
  useMediaQuery,
  Avatar,
  Stack,
  Divider,
  Chip,
  Link,
  Paper,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  WhatsApp,
  Email,
  Phone,
  LocationOn,
  Star,
  HomeWork,
  Search,
  FilterList,
  Favorite,
  Share,
  KeyboardArrowUp,
} from '@mui/icons-material';
import { MiniSiteConfig } from '@/lib/types/mini-site';
import { motion, AnimatePresence } from 'framer-motion';

interface MiniSiteLayoutNewProps {
  config: MiniSiteConfig;
  children: React.ReactNode;
}

export default function MiniSiteLayoutNew({ config, children }: MiniSiteLayoutNewProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Use dashboard theme colors as defaults
  const themeColors = {
    primary: config?.theme?.primaryColor || theme.palette.primary.main || '#2563eb',
    secondary: config?.theme?.secondaryColor || theme.palette.secondary.main || '#64748b',
    accent: config?.theme?.accentColor || theme.palette.tertiary?.main || '#10b981',
    background: theme.palette.background.default || '#f8fafc',
    paper: theme.palette.background.paper || '#ffffff',
    text: theme.palette.text.primary || '#0f172a',
    textSecondary: theme.palette.text.secondary || '#475569',
  };

  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      setScrolled(offset > 50);
      setShowScrollTop(offset > 200);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent(`Olá! Vim pelo site ${config?.contactInfo?.businessName || 'seu site'} e gostaria de mais informações sobre os imóveis disponíveis.`);
    window.open(`https://wa.me/55${config?.contactInfo?.whatsappNumber || ''}?text=${message}`, '_blank');
  };

  const menuItems = [
    { label: 'Início', href: '#home' },
    { label: 'Propriedades', href: '#properties' },
    { label: 'Sobre', href: '#about' },
    { label: 'Contato', href: '#contact' },
  ];

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: themeColors.background,
      color: themeColors.text,
      position: 'relative',
      fontFamily: theme.typography.fontFamily, // Use Inter font
    }}>
      {/* Header */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: scrolled ? themeColors.paper : 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          borderBottom: scrolled ? `1px solid ${theme.palette.divider}` : 'none',
          boxShadow: scrolled ? theme.custom?.elevation?.low || '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
        }}
      >
        <Container maxWidth="xl">
          <Toolbar sx={{ px: 0 }}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                {config?.contactInfo?.businessLogo && (
                  <Avatar
                    src={config?.contactInfo?.businessLogo}
                    alt={config?.contactInfo?.businessName || 'Logo'}
                    sx={{ 
                      width: 48, 
                      height: 48,
                      borderRadius: typeof config?.theme?.borderRadius === 'number' ? config?.theme?.borderRadius : 2,
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                )}
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: scrolled ? themeColors.text : '#fff',
                      fontSize: { xs: '1.1rem', md: '1.25rem' },
                      letterSpacing: '-0.01em',
                      textShadow: !scrolled ? '0 2px 4px rgba(0, 0, 0, 0.3)' : 'none',
                    }}
                  >
                    {config?.contactInfo?.businessName || 'Carregando...'}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: scrolled ? themeColors.textSecondary : 'rgba(255, 255, 255, 0.8)',
                      fontSize: '0.75rem',
                      letterSpacing: '0.03em',
                      textShadow: !scrolled ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none',
                    }}
                  >
                    {config?.contactInfo?.businessDescription || ''}
                  </Typography>
                </Box>
              </Stack>
            </motion.div>

            <Box sx={{ flexGrow: 1 }} />

            {/* Desktop Menu */}
            {!isMobile && (
              <Stack direction="row" spacing={1}>
                {menuItems.map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Button
                      component={Link}
                      href={item.href}
                      sx={{
                        color: scrolled ? themeColors.text : '#fff',
                        fontWeight: 500,
                        borderRadius: theme.shape.borderRadius / 2, // 6px like dashboard
                        px: 2,
                        py: 1,
                        textTransform: 'none',
                        fontSize: '0.875rem',
                        letterSpacing: '0.01em',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          bgcolor: scrolled ? theme.palette.action.hover : 'rgba(255, 255, 255, 0.1)',
                        },
                      }}
                    >
                      {item.label}
                    </Button>
                  </motion.div>
                ))}
              </Stack>
            )}

            {/* WhatsApp Button */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            >
              <Button
                variant="contained"
                startIcon={<WhatsApp />}
                onClick={handleWhatsAppClick}
                sx={{
                  bgcolor: '#25D366',
                  color: '#fff',
                  fontWeight: 500,
                  borderRadius: theme.shape.borderRadius / 2, // 6px like dashboard
                  px: { xs: 2, md: 3 },
                  py: 1,
                  textTransform: 'none',
                  fontSize: '0.875rem',
                  letterSpacing: '0.01em',
                  boxShadow: 'none',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    bgcolor: '#1da851',
                    boxShadow: 'none',
                  },
                }}
              >
                {isMobile ? 'Falar' : 'Falar no WhatsApp'}
              </Button>
            </motion.div>

            {/* Mobile Menu Button */}
            {isMobile && (
              <IconButton
                onClick={() => setMobileMenuOpen(true)}
                sx={{
                  color: scrolled ? (config?.theme?.textColor || '#1a1a1a') : '#fff',
                  ml: 1,
                }}
              >
                <MenuIcon />
              </IconButton>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Menu Drawer */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            bgcolor: themeColors.paper,
            color: themeColors.text,
            borderRadius: `${theme.shape.borderRadius}px 0 0 ${theme.shape.borderRadius}px`,
            boxShadow: theme.custom?.elevation?.medium || '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Menu
            </Typography>
            <IconButton onClick={() => setMobileMenuOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          <List>
            {menuItems.map((item) => (
              <ListItem
                key={item.label}
                component={Link}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                sx={{
                  borderRadius: typeof config?.theme?.borderRadius === 'number' ? config?.theme?.borderRadius : 2,
                  mb: 1,
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.05)',
                  },
                }}
              >
                <ListItemText
                  primary={item.label}
                  sx={{
                    '& .MuiTypography-root': {
                      fontWeight: 500,
                    },
                  }}
                />
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ textAlign: 'center' }}>
            <Button
              variant="contained"
              startIcon={<WhatsApp />}
              onClick={handleWhatsAppClick}
              fullWidth
              sx={{
                bgcolor: '#25D366',
                color: '#fff',
                fontWeight: 600,
                borderRadius: typeof config?.theme?.borderRadius === 'number' ? config?.theme?.borderRadius : 2,
                py: 1.5,
                textTransform: 'none',
                fontSize: '1rem',
                boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)',
                '&:hover': {
                  bgcolor: '#1da851',
                  boxShadow: '0 6px 16px rgba(37, 211, 102, 0.4)',
                },
              }}
            >
              Falar no WhatsApp
            </Button>
          </Box>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ pt: { xs: 8, md: 9 } }}>
        {children}
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          bgcolor: themeColors.text,
          color: themeColors.paper,
          py: 4,
          mt: 6,
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'center', md: 'flex-start' }}
              spacing={3}
            >
              <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  {config?.contactInfo?.businessName || ''}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
                  {config?.contactInfo?.businessDescription || ''}
                </Typography>
              </Box>

              <Stack direction="row" spacing={2}>
                {config?.contactInfo?.whatsappNumber && (
                  <Tooltip title="WhatsApp">
                    <IconButton
                      onClick={handleWhatsAppClick}
                      sx={{
                        bgcolor: '#25D366',
                        color: '#fff',
                        '&:hover': {
                          bgcolor: '#1da851',
                        },
                      }}
                    >
                      <WhatsApp />
                    </IconButton>
                  </Tooltip>
                )}
                {config?.contactInfo?.email && (
                  <Tooltip title="Email">
                    <IconButton
                      component={Link}
                      href={`mailto:${config?.contactInfo?.email || ''}`}
                      sx={{
                        bgcolor: config?.theme?.primaryColor || '#1976d2',
                        color: '#fff',
                        '&:hover': {
                          bgcolor: config?.theme?.secondaryColor || '#dc004e',
                        },
                      }}
                    >
                      <Email />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            </Stack>

            <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)' }} />

            <Stack
              direction={{ xs: 'column', md: 'row' }}
              justifyContent="space-between"
              alignItems="center"
              spacing={2}
            >
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                © {new Date().getFullYear()} {config?.contactInfo?.businessName || ''}. Todos os direitos reservados.
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                Powered by AlugaZap
              </Typography>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1000,
            }}
          >
            <Tooltip title="Voltar ao topo">
              <Paper
                elevation={0}
                sx={{
                  borderRadius: '50%',
                  width: 56,
                  height: 56,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: themeColors.primary,
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  boxShadow: theme.custom?.elevation?.medium || '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
                  border: `1px solid ${theme.palette.divider}`,
                  '&:hover': {
                    bgcolor: themeColors.secondary,
                    transform: 'translateY(-2px)',
                  },
                }}
                onClick={scrollToTop}
              >
                <KeyboardArrowUp />
              </Paper>
            </Tooltip>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
}