'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Zoom,
  Tooltip,
  Badge,
  useTheme,
  alpha,
  IconButton,
  Typography,
  Stack,
  Paper,
  Collapse,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
} from '@mui/material';
import {
  WhatsApp,
  Phone,
  Email,
  Share,
  Bookmark,
  BookmarkBorder,
  KeyboardArrowUp,
  Close,
  Schedule,
  LocationOn,
  Info,
  ChatBubble,
  Calculate,
  Send,
  QuestionAnswer,
  Support,
  Visibility,
  Download,
  Print,
  Edit,
  Add,
  Remove,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { MiniSiteConfig, PublicProperty } from '@/lib/types/mini-site';
import { miniSiteClientService } from '@/lib/services/mini-site-client-service';

interface FloatingActionButtonsProps {
  config: MiniSiteConfig;
  property?: PublicProperty;
  onBookmark?: () => void;
  onShare?: () => void;
  isBookmarked?: boolean;
  showScrollTop?: boolean;
  onScrollTop?: () => void;
}

export default function FloatingActionButtons({
  config,
  property,
  onBookmark,
  onShare,
  isBookmarked = false,
  showScrollTop = false,
  onScrollTop,
}: FloatingActionButtonsProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [showFABs, setShowFABs] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });

  // Calculator state
  const [calculatorState, setCalculatorState] = useState({
    checkIn: '',
    checkOut: '',
    guests: 1,
    totalNights: 0,
    totalPrice: 0,
  });

  // Hide/show FABs on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isScrollingDown = currentScrollY > lastScrollY;
      
      if (currentScrollY > 100) {
        setShowFABs(!isScrollingDown);
      } else {
        setShowFABs(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleWhatsApp = () => {
    const message = property 
      ? `Olá! Tenho interesse na propriedade "${property.name}". Gostaria de mais informações.`
      : `Olá! Vim pelo site ${config.contactInfo.businessName} e gostaria de mais informações.`;
    
    const url = miniSiteClientService.generateWhatsAppUrl(
      config.contactInfo.whatsappNumber,
      message
    );
    window.open(url, '_blank');
  };

  const handlePhone = () => {
    if (config.contactInfo.whatsappNumber) {
      window.open(`tel:+55${config.contactInfo.whatsappNumber}`, '_blank');
    }
  };

  const handleEmail = () => {
    if (config.contactInfo.email) {
      const subject = property 
        ? `Interesse na propriedade: ${property.name}`
        : `Contato via ${config.contactInfo.businessName}`;
      
      const body = property
        ? `Olá,\n\nTenho interesse na propriedade "${property.name}" e gostaria de mais informações.\n\nAguardo retorno.`
        : `Olá,\n\nVim pelo site ${config.contactInfo.businessName} e gostaria de mais informações.\n\nAguardo retorno.`;
      
      window.open(`mailto:${config.contactInfo.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: property ? property.name : config.contactInfo.businessName,
          text: property ? property.description : config.seo.description,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
    
    if (onShare) onShare();
  };

  const calculatePrice = () => {
    if (!property || !calculatorState.checkIn || !calculatorState.checkOut) return;
    
    const checkIn = new Date(calculatorState.checkIn);
    const checkOut = new Date(calculatorState.checkOut);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const basePrice = property.pricing.basePrice * nights;
    
    setCalculatorState(prev => ({
      ...prev,
      totalNights: nights,
      totalPrice: basePrice,
    }));
  };

  const handleContactSubmit = async () => {
    // In a real app, this would send the message
    console.log('Contact form submitted:', contactForm);
    setContactDialogOpen(false);
    setContactForm({ name: '', email: '', phone: '', message: '' });
  };

  const speedDialActions = [
    {
      icon: <WhatsApp />,
      name: 'WhatsApp',
      action: handleWhatsApp,
      color: '#25D366',
    },
    {
      icon: <Phone />,
      name: 'Ligar',
      action: handlePhone,
      color: theme.palette.info.main,
    },
    {
      icon: <Email />,
      name: 'Email',
      action: handleEmail,
      color: theme.palette.secondary.main,
    },
    {
      icon: <Share />,
      name: 'Compartilhar',
      action: handleShare,
      color: theme.palette.warning.main,
    },
    {
      icon: <ChatBubble />,
      name: 'Mensagem',
      action: () => setContactDialogOpen(true),
      color: theme.palette.primary.main,
    },
  ];

  if (property) {
    speedDialActions.push(
      {
        icon: <Calculate />,
        name: 'Calcular Preço',
        action: () => setCalculatorOpen(true),
        color: theme.palette.success.main,
      },
      {
        icon: <Schedule />,
        name: 'Consultar',
        action: () => setInquiryOpen(true),
        color: theme.palette.info.main,
      }
    );
  }

  return (
    <AnimatePresence>
      {showFABs && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ duration: 0.3 }}
        >
          <Box
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {/* Scroll to Top Button */}
            <Zoom in={showScrollTop}>
              <Fab
                size="medium"
                onClick={onScrollTop}
                sx={{
                  bgcolor: alpha(theme.palette.background.paper, 0.9),
                  color: theme.palette.text.primary,
                  backdropFilter: 'blur(10px)',
                  '&:hover': {
                    bgcolor: theme.palette.background.paper,
                    transform: 'scale(1.1)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                <KeyboardArrowUp />
              </Fab>
            </Zoom>

            {/* Bookmark Button (only for property pages) */}
            {property && (
              <Zoom in={true}>
                <Fab
                  size="medium"
                  onClick={onBookmark}
                  sx={{
                    bgcolor: isBookmarked ? theme.palette.error.main : alpha(theme.palette.background.paper, 0.9),
                    color: isBookmarked ? 'white' : theme.palette.text.primary,
                    backdropFilter: 'blur(10px)',
                    '&:hover': {
                      bgcolor: isBookmarked ? theme.palette.error.dark : theme.palette.background.paper,
                      transform: 'scale(1.1)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  {isBookmarked ? <Bookmark /> : <BookmarkBorder />}
                </Fab>
              </Zoom>
            )}

            {/* Main Speed Dial */}
            <SpeedDial
              ariaLabel="Ações de contato"
              sx={{
                '& .MuiSpeedDial-fab': {
                  background: `linear-gradient(135deg, ${'#06b6d4'}, ${'#22c55e'})`,
                  color: 'white',
                  '&:hover': {
                    background: `linear-gradient(135deg, ${'#06b6d4'}, ${'#22c55e'})`,
                    transform: 'scale(1.1)',
                  },
                  transition: 'all 0.3s ease',
                  boxShadow: `0 8px 24px ${alpha('#06b6d4', 0.3)}`,
                },
              }}
              icon={<SpeedDialIcon />}
              onClose={() => setOpen(false)}
              onOpen={() => setOpen(true)}
              open={open}
              direction="up"
            >
              {speedDialActions.map((action) => (
                <SpeedDialAction
                  key={action.name}
                  icon={action.icon}
                  tooltipTitle={action.name}
                  onClick={action.action}
                  sx={{
                    '& .MuiSpeedDialAction-fab': {
                      bgcolor: action.color,
                      color: 'white',
                      '&:hover': {
                        bgcolor: action.color,
                        transform: 'scale(1.1)',
                      },
                      transition: 'all 0.3s ease',
                    },
                  }}
                />
              ))}
            </SpeedDial>
          </Box>

          {/* Contact Dialog */}
          <Dialog
            open={contactDialogOpen}
            onClose={() => setContactDialogOpen(false)}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: 3,
                background: alpha(theme.palette.background.paper, 0.95),
                backdropFilter: 'blur(20px)',
              },
            }}
          >
            <DialogTitle>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" fontWeight={700}>
                  Enviar Mensagem
                </Typography>
                <IconButton onClick={() => setContactDialogOpen(false)}>
                  <Close />
                </IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent>
              <Stack spacing={3}>
                <TextField
                  label="Nome"
                  fullWidth
                  value={contactForm.name}
                  onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                  sx={{ mt: 1 }}
                />
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  value={contactForm.email}
                  onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                />
                <TextField
                  label="Telefone"
                  fullWidth
                  value={contactForm.phone}
                  onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                />
                <TextField
                  label="Mensagem"
                  multiline
                  rows={4}
                  fullWidth
                  value={contactForm.message}
                  onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder={property ? `Gostaria de mais informações sobre "${property.name}"...` : 'Sua mensagem...'}
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button
                onClick={() => setContactDialogOpen(false)}
                variant="outlined"
                sx={{ borderRadius: 2 }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleContactSubmit}
                variant="contained"
                startIcon={<Send />}
                sx={{
                  borderRadius: 2,
                  background: `linear-gradient(135deg, ${'#06b6d4'}, ${'#22c55e'})`,
                }}
              >
                Enviar
              </Button>
            </DialogActions>
          </Dialog>

          {/* Price Calculator Dialog */}
          {property && (
            <Dialog
              open={calculatorOpen}
              onClose={() => setCalculatorOpen(false)}
              maxWidth="sm"
              fullWidth
              PaperProps={{
                sx: {
                  borderRadius: 3,
                  background: alpha(theme.palette.background.paper, 0.95),
                  backdropFilter: 'blur(20px)',
                },
              }}
            >
              <DialogTitle>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" fontWeight={700}>
                    Calculadora de Preços
                  </Typography>
                  <IconButton onClick={() => setCalculatorOpen(false)}>
                    <Close />
                  </IconButton>
                </Stack>
              </DialogTitle>
              <DialogContent>
                <Stack spacing={3}>
                  <Typography variant="body1" color="text.secondary">
                    {property.name}
                  </Typography>
                  
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Check-in"
                      type="date"
                      fullWidth
                      value={calculatorState.checkIn}
                      onChange={(e) => setCalculatorState(prev => ({ ...prev, checkIn: e.target.value }))}
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      label="Check-out"
                      type="date"
                      fullWidth
                      value={calculatorState.checkOut}
                      onChange={(e) => setCalculatorState(prev => ({ ...prev, checkOut: e.target.value }))}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Stack>

                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Typography variant="body1">Hóspedes:</Typography>
                    <IconButton
                      onClick={() => setCalculatorState(prev => ({ 
                        ...prev, 
                        guests: Math.max(1, prev.guests - 1) 
                      }))}
                    >
                      <Remove />
                    </IconButton>
                    <Typography variant="h6" sx={{ minWidth: 40, textAlign: 'center' }}>
                      {calculatorState.guests}
                    </Typography>
                    <IconButton
                      onClick={() => setCalculatorState(prev => ({ 
                        ...prev, 
                        guests: Math.min(property.maxGuests, prev.guests + 1) 
                      }))}
                    >
                      <Add />
                    </IconButton>
                  </Stack>

                  <Button
                    onClick={calculatePrice}
                    variant="contained"
                    startIcon={<Calculate />}
                    sx={{
                      borderRadius: 2,
                      background: `linear-gradient(135deg, ${'#06b6d4'}, ${'#22c55e'})`,
                    }}
                  >
                    Calcular
                  </Button>

                  {calculatorState.totalNights > 0 && (
                    <Paper
                      elevation={2}
                      sx={{
                        p: 3,
                        borderRadius: 2,
                        background: alpha('#06b6d4', 0.05),
                      }}
                    >
                      <Stack spacing={2}>
                        <Typography variant="h6" fontWeight={700}>
                          Resumo da Reserva
                        </Typography>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography>Noites:</Typography>
                          <Typography fontWeight={600}>{calculatorState.totalNights}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography>Preço por noite:</Typography>
                          <Typography fontWeight={600}>
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(property.pricing.basePrice)}
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="h6" fontWeight={700}>
                            Total:
                          </Typography>
                          <Typography variant="h6" fontWeight={700} color={'#06b6d4'}>
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(calculatorState.totalPrice)}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Paper>
                  )}
                </Stack>
              </DialogContent>
              <DialogActions sx={{ p: 3 }}>
                <Button
                  onClick={() => setCalculatorOpen(false)}
                  variant="outlined"
                  sx={{ borderRadius: 2 }}
                >
                  Fechar
                </Button>
                <Button
                  onClick={() => {
                    setCalculatorOpen(false);
                    handleWhatsApp();
                  }}
                  variant="contained"
                  startIcon={<WhatsApp />}
                  sx={{
                    borderRadius: 2,
                    bgcolor: '#25D366',
                    '&:hover': {
                      bgcolor: '#128C7E',
                    },
                  }}
                >
                  Reservar via WhatsApp
                </Button>
              </DialogActions>
            </Dialog>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}