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
    const message = encodeURIComponent(`Olá! Vim pelo site ${config.contactInfo.businessName} e gostaria de mais informações sobre os imóveis disponíveis.`);
    window.open(`https://wa.me/55${config.contactInfo.whatsappNumber}?text=${message}`, '_blank');
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
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
      color: '#ffffff',
      position: 'relative'
    }}>
      {/* Header */}
      <AppBar
        position="fixed"
        elevation={scrolled ? 4 : 0}
        sx={{
          bgcolor: scrolled ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: scrolled ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(255, 255, 255, 0.1)',
          transition: 'all 0.3s ease',
          boxShadow: scrolled ? '0 8px 24px rgba(0, 0, 0, 0.4)' : 'none',
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
                {config.contactInfo.businessLogo && (
                  <Avatar
                    src={config.contactInfo.businessLogo}
                    alt={config.contactInfo.businessName}
                    sx={{ 
                      width: 48, 
                      height: 48,
                      borderRadius: typeof config.theme.borderRadius === 'number' ? config.theme.borderRadius : 2,
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                )}
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: '#ffffff',
                      fontSize: { xs: '1.1rem', md: '1.3rem' },
                      textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
                    }}
                  >
                    {config.contactInfo.businessName}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.75rem',
                      textShadow: '0 1px 4px rgba(0, 0, 0, 0.5)',
                    }}
                  >
                    {config.contactInfo.businessDescription}
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
                        color: '#ffffff',
                        fontWeight: 500,
                        borderRadius: '12px',
                        px: 2,
                        py: 1,
                        textTransform: 'none',
                        fontSize: '0.95rem',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          background: 'rgba(255, 255, 255, 0.08)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          transform: 'translateY(-1px)',
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
                  background: 'linear-gradient(135deg, #25D366, #128C7E)',
                  color: '#ffffff',
                  fontWeight: 600,
                  borderRadius: '16px',
                  px: { xs: 2, md: 3 },
                  py: 1,
                  textTransform: 'none',
                  fontSize: '0.9rem',
                  boxShadow: '0 8px 24px rgba(37, 211, 102, 0.4)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1da851, #0d5940)',
                    boxShadow: '0 12px 32px rgba(37, 211, 102, 0.5)',
                    transform: 'translateY(-2px) scale(1.02)',
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
                  color: '#ffffff',
                  ml: 1,
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.12)',
                    transform: 'scale(1.05)',
                  },
                  transition: 'all 0.3s ease',
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
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
            backdropFilter: 'blur(20px)',
            color: '#ffffff',
            borderRadius: '20px 0 0 20px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#ffffff' }}>
              Menu
            </Typography>
            <IconButton 
              onClick={() => setMobileMenuOpen(false)}
              sx={{
                color: '#ffffff',
                background: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.12)',
                },
              }}
            >
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
                  borderRadius: '12px',
                  mb: 1,
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(10px)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                <ListItemText
                  primary={item.label}
                  sx={{
                    '& .MuiTypography-root': {
                      fontWeight: 500,
                      color: '#ffffff',
                    },
                  }}
                />
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

          <Box sx={{ textAlign: 'center' }}>
            <Button
              variant="contained"
              startIcon={<WhatsApp />}
              onClick={handleWhatsAppClick}
              fullWidth
              sx={{
                background: 'linear-gradient(135deg, #25D366, #128C7E)',
                color: '#ffffff',
                fontWeight: 600,
                borderRadius: '16px',
                py: 1.5,
                textTransform: 'none',
                fontSize: '1rem',
                boxShadow: '0 8px 24px rgba(37, 211, 102, 0.4)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1da851, #0d5940)',
                  boxShadow: '0 12px 32px rgba(37, 211, 102, 0.5)',
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              Falar no WhatsApp
            </Button>
          </Box>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ pt: { xs: 7, md: 8 } }}>
        {children}
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#ffffff',
          py: 3,
          mt: 4,
        }}
      >
        <Container maxWidth="xl">
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
          >
            <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 600 }}>
                {config.contactInfo.businessName}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                © {new Date().getFullYear()} - Todos os direitos reservados
              </Typography>
            </Box>

            <Stack direction="row" spacing={2} alignItems="center">
              {config.contactInfo.whatsappNumber && (
                <Button
                  startIcon={<WhatsApp />}
                  onClick={handleWhatsAppClick}
                  size="small"
                  sx={{
                    background: 'linear-gradient(135deg, #25D366, #128C7E)',
                    color: '#ffffff',
                    borderRadius: '12px',
                    px: 2,
                    py: 1,
                    textTransform: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #1da851, #0d5940)',
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Contato
                </Button>
              )}
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
                  borderRadius: '16px',
                  width: 56,
                  height: 56,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 16px 50px rgba(0, 0, 0, 0.4)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    boxShadow: '0 20px 60px rgba(139, 92, 246, 0.6)',
                    transform: 'scale(1.1) translateY(-2px)',
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