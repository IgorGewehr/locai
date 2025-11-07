/**
 * Step 4: Mini-Site Setup Component
 * Share mini-site and complete onboarding
 */

'use client';

import React, { useState } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  Typography,
  Button,
  Stack,
  IconButton,
  Alert,
  Card,
  CardContent,
  alpha,
  useTheme,
  useMediaQuery,
  Chip,
  Divider,
} from '@mui/material';
import {
  Share,
  Close,
  WhatsApp as WhatsAppIcon,
  Facebook,
  Email,
  ContentCopy,
  CheckCircle,
  Language,
  Celebration,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';

interface Step4MiniSiteSetupProps {
  open: boolean;
  onClose: () => void;
  onComplete: (data?: any) => void;
}

export default function Step4MiniSiteSetup({
  open,
  onClose,
  onComplete,
}: Step4MiniSiteSetupProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { tenantId } = useTenant();

  const [copied, setCopied] = useState(false);

  const miniSiteUrl = `https://alugazap.com/${tenantId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(miniSiteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = `Confira minhas propriedades disponíveis: ${miniSiteUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(miniSiteUrl)}`, '_blank');
  };

  const handleShareEmail = () => {
    const subject = 'Minhas Propriedades Disponíveis';
    const body = `Confira minhas propriedades disponíveis em: ${miniSiteUrl}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleComplete = () => {
    onComplete({ shared: true });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f172a 100%)',
          borderRadius: isMobile ? 0 : '20px',
        },
      }}
    >
      <DialogContent sx={{ p: { xs: 2, md: 4 } }}>
        <Stack spacing={3}>
          {/* Header */}
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #d946ef, #a855f7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(217, 70, 239, 0.4)',
                }}
              >
                <Share sx={{ color: 'white', fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
                  Compartilhar Mini-Site
                </Typography>
                <Typography variant="body2" sx={{ color: alpha('#ffffff', 0.7) }}>
                  Seu site está pronto para receber leads!
                </Typography>
              </Box>
            </Stack>
            <IconButton onClick={onClose} sx={{ color: alpha('#ffffff', 0.6) }}>
              <Close />
            </IconButton>
          </Stack>

          {/* Success Message */}
          <Alert
            severity="success"
            icon={<Celebration />}
            sx={{
              backgroundColor: alpha('#10b981', 0.1),
              border: `2px solid ${alpha('#10b981', 0.3)}`,
              color: '#6ee7b7',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Parabéns! Seu mini-site está configurado e pronto para uso
            </Typography>
          </Alert>

          {/* Mini-Site Preview */}
          <Card
            sx={{
              backgroundColor: alpha(theme.palette.background.paper, 0.5),
              border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
            }}
          >
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Language sx={{ color: '#d946ef' }} />
                  <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600 }}>
                    Seu Mini-Site
                  </Typography>
                  <Chip
                    label="Ativo"
                    size="small"
                    sx={{
                      backgroundColor: alpha('#10b981', 0.2),
                      color: '#6ee7b7',
                      fontSize: '0.75rem',
                    }}
                  />
                </Stack>

                <Box
                  sx={{
                    p: 2,
                    backgroundColor: alpha('#000000', 0.3),
                    borderRadius: '8px',
                    border: `1px solid ${alpha('#d946ef', 0.2)}`,
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        color: '#d946ef',
                        fontSize: '0.9rem',
                        wordBreak: 'break-all',
                      }}
                    >
                      {miniSiteUrl}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={handleCopyLink}
                      sx={{ color: alpha('#ffffff', 0.7) }}
                    >
                      {copied ? (
                        <CheckCircle sx={{ fontSize: 20, color: '#10b981' }} />
                      ) : (
                        <ContentCopy sx={{ fontSize: 20 }} />
                      )}
                    </IconButton>
                  </Stack>
                </Box>

                <Typography variant="body2" sx={{ color: alpha('#ffffff', 0.7) }}>
                  Compartilhe este link nas redes sociais para começar a receber leads
                  automaticamente através do WhatsApp
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          <Divider sx={{ borderColor: alpha('#ffffff', 0.1) }} />

          {/* Share Buttons */}
          <Box>
            <Typography
              variant="subtitle2"
              sx={{ color: 'white', fontWeight: 600, mb: 2 }}
            >
              Compartilhar em:
            </Typography>
            <Stack spacing={2}>
              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={<WhatsAppIcon />}
                onClick={handleShareWhatsApp}
                sx={{
                  background: 'linear-gradient(135deg, #25D366, #128C7E)',
                  fontWeight: 600,
                }}
              >
                Compartilhar no WhatsApp
              </Button>

              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Facebook />}
                  onClick={handleShareFacebook}
                  sx={{
                    borderColor: alpha('#1877F2', 0.3),
                    color: '#1877F2',
                  }}
                >
                  Facebook
                </Button>

                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Email />}
                  onClick={handleShareEmail}
                  sx={{
                    borderColor: alpha('#EA4335', 0.3),
                    color: '#EA4335',
                  }}
                >
                  E-mail
                </Button>
              </Stack>
            </Stack>
          </Box>

          <Divider sx={{ borderColor: alpha('#ffffff', 0.1) }} />

          {/* Complete Button */}
          <Button
            variant="contained"
            size="large"
            fullWidth
            endIcon={<CheckCircle />}
            onClick={handleComplete}
            sx={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              fontWeight: 600,
              py: 1.5,
              '&:hover': {
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            Concluir Configuração
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
