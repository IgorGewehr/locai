'use client';

import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Stack,
  IconButton,
  Button,
  TextField,
  Divider,
  Link,
  Avatar,
  Chip,
  Paper,
  useTheme,
  alpha,
  InputAdornment,
  Alert,
  Rating,
  Card,
  CardContent,
  useMediaQuery,
} from '@mui/material';
import {
  WhatsApp,
  Email,
  Phone,
  LocationOn,
  Facebook,
  Instagram,
  Twitter,
  LinkedIn,
  YouTube,
  Send,
  Star,
  Verified,
  Language,
  Schedule,
  Security,
  Support,
  Info,
  ArrowUpward,
  KeyboardArrowUp,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { MiniSiteConfig } from '@/lib/types/mini-site';

interface EnhancedFooterProps {
  config: MiniSiteConfig;
  onScrollTop?: () => void;
}

interface Testimonial {
  id: string;
  name: string;
  avatar?: string;
  rating: number;
  comment: string;
  date: string;
  verified?: boolean;
}

const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Maria Silva',
    rating: 5,
    comment: 'Excelente atendimento! Encontrei a casa dos meus sonhos rapidamente.',
    date: '2024-01-15',
    verified: true,
  },
  {
    id: '2',
    name: 'João Santos',
    rating: 5,
    comment: 'Profissionais competentes e propriedades de alta qualidade.',
    date: '2024-01-10',
    verified: true,
  },
  {
    id: '3',
    name: 'Ana Costa',
    rating: 5,
    comment: 'Processo de locação muito fácil e transparente. Recomendo!',
    date: '2024-01-05',
    verified: true,
  },
];

export default function EnhancedFooter({ config, onScrollTop }: EnhancedFooterProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setSubscribed(true);
    setEmail('');
    setLoading(false);
  };

  const socialLinks = [
    {
      name: 'WhatsApp',
      icon: <WhatsApp />,
      url: `https://wa.me/55${config.contactInfo.whatsappNumber}`,
      color: '#25D366',
    },
    {
      name: 'Instagram',
      icon: <Instagram />,
      url: '#',
      color: '#E4405F',
    },
    {
      name: 'Facebook',
      icon: <Facebook />,
      url: '#',
      color: '#1877F2',
    },
    {
      name: 'LinkedIn',
      icon: <LinkedIn />,
      url: '#',
      color: '#0A66C2',
    },
  ];

  const quickLinks = [
    { name: 'Início', href: '#home' },
    { name: 'Propriedades', href: '#properties' },
    { name: 'Sobre Nós', href: '#about' },
    { name: 'Contato', href: '#contact' },
    { name: 'Termos de Uso', href: '#terms' },
    { name: 'Política de Privacidade', href: '#privacy' },
  ];

  const services = [
    { name: 'Aluguel Residencial', icon: <LocationOn /> },
    { name: 'Aluguel Comercial', icon: <LocationOn /> },
    { name: 'Venda de Imóveis', icon: <LocationOn /> },
    { name: 'Consultoria', icon: <Support /> },
    { name: 'Avaliação', icon: <Star /> },
    { name: 'Documentação', icon: <Security /> },
  ];

  return (
    <Box
      component="footer"
      sx={{
        background: `linear-gradient(135deg, ${alpha(config.theme.primaryColor, 0.05)}, ${alpha(config.theme.accentColor, 0.02)})`,
        backdropFilter: 'blur(20px)',
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        position: 'relative',
        overflow: 'hidden',
        mt: 8,
      }}
    >
      {/* Decorative Background Elements */}
      <Box
        sx={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 200,
          height: 200,
          background: `radial-gradient(circle, ${alpha(config.theme.primaryColor, 0.1)}, transparent)`,
          borderRadius: '50%',
          filter: 'blur(40px)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -50,
          left: -50,
          width: 150,
          height: 150,
          background: `radial-gradient(circle, ${alpha(config.theme.accentColor, 0.1)}, transparent)`,
          borderRadius: '50%',
          filter: 'blur(30px)',
        }}
      />

      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Newsletter Section */}
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                mb: 2,
                background: `linear-gradient(135deg, ${config.theme.primaryColor}, ${config.theme.accentColor})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Fique por dentro das melhores oportunidades
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
              Receba notificações sobre novos imóveis e ofertas exclusivas diretamente no seu email.
            </Typography>

            {subscribed ? (
              <Alert
                severity="success"
                sx={{
                  maxWidth: 500,
                  mx: 'auto',
                  borderRadius: 3,
                  '& .MuiAlert-icon': {
                    color: config.theme.primaryColor,
                  },
                }}
              >
                <Typography variant="body2">
                  Obrigado! Você foi inscrito com sucesso em nossa newsletter.
                </Typography>
              </Alert>
            ) : (
              <Box
                component="form"
                onSubmit={handleNewsletterSubmit}
                sx={{
                  maxWidth: 500,
                  mx: 'auto',
                  display: 'flex',
                  gap: 2,
                  flexDirection: { xs: 'column', sm: 'row' },
                }}
              >
                <TextField
                  fullWidth
                  placeholder="Seu melhor email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  type="email"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email sx={{ color: config.theme.primaryColor }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                      bgcolor: alpha(theme.palette.background.paper, 0.8),
                      backdropFilter: 'blur(10px)',
                      '&:hover fieldset': {
                        borderColor: config.theme.primaryColor,
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: config.theme.primaryColor,
                      },
                    },
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                  startIcon={<Send />}
                  sx={{
                    borderRadius: 3,
                    px: 4,
                    minWidth: 140,
                    background: `linear-gradient(135deg, ${config.theme.primaryColor}, ${config.theme.accentColor})`,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${config.theme.primaryColor}, ${config.theme.accentColor})`,
                      transform: 'translateY(-2px)',
                      boxShadow: `0 8px 24px ${alpha(config.theme.primaryColor, 0.3)}`,
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  {loading ? 'Enviando...' : 'Inscrever'}
                </Button>
              </Box>
            )}
          </motion.div>
        </Box>

        {/* Testimonials */}
        <Box sx={{ py: 4 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                textAlign: 'center',
                mb: 4,
                color: config.theme.primaryColor,
              }}
            >
              O que nossos clientes dizem
            </Typography>
            <Grid container spacing={3}>
              {testimonials.map((testimonial, index) => (
                <Grid item xs={12} md={4} key={testimonial.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <Card
                      sx={{
                        height: '100%',
                        background: alpha(theme.palette.background.paper, 0.7),
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        borderRadius: 3,
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.1)}`,
                        },
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Stack spacing={2}>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Avatar
                              src={testimonial.avatar}
                              sx={{
                                width: 48,
                                height: 48,
                                bgcolor: config.theme.primaryColor,
                              }}
                            >
                              {testimonial.name.charAt(0)}
                            </Avatar>
                            <Box>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography variant="subtitle1" fontWeight={600}>
                                  {testimonial.name}
                                </Typography>
                                {testimonial.verified && (
                                  <Verified sx={{ fontSize: 16, color: config.theme.primaryColor }} />
                                )}
                              </Stack>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(testimonial.date).toLocaleDateString('pt-BR')}
                              </Typography>
                            </Box>
                          </Stack>
                          <Rating
                            value={testimonial.rating}
                            readOnly
                            size="small"
                            sx={{ color: config.theme.primaryColor }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            "{testimonial.comment}"
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </motion.div>
        </Box>

        <Divider sx={{ my: 4, borderColor: alpha(theme.palette.divider, 0.1) }} />

        {/* Main Footer Content */}
        <Box sx={{ py: 6 }}>
          <Grid container spacing={4}>
            {/* Company Info */}
            <Grid item xs={12} md={4}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <Stack spacing={3}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    {config.contactInfo.businessLogo && (
                      <Avatar
                        src={config.contactInfo.businessLogo}
                        sx={{
                          width: 60,
                          height: 60,
                          borderRadius: 2,
                        }}
                      />
                    )}
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        {config.contactInfo.businessName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {config.contactInfo.businessDescription}
                      </Typography>
                    </Box>
                  </Stack>

                  <Typography variant="body2" color="text.secondary">
                    {config.seo.description}
                  </Typography>

                  <Stack spacing={2}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <WhatsApp sx={{ color: config.theme.primaryColor }} />
                      <Typography variant="body2">
                        +55 {config.contactInfo.whatsappNumber}
                      </Typography>
                    </Stack>
                    {config.contactInfo.email && (
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Email sx={{ color: config.theme.primaryColor }} />
                        <Typography variant="body2">
                          {config.contactInfo.email}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>

                  {/* Social Links */}
                  <Stack direction="row" spacing={1}>
                    {socialLinks.map((social) => (
                      <IconButton
                        key={social.name}
                        component="a"
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          bgcolor: alpha(social.color, 0.1),
                          color: social.color,
                          '&:hover': {
                            bgcolor: social.color,
                            color: 'white',
                            transform: 'translateY(-2px)',
                          },
                          transition: 'all 0.3s ease',
                        }}
                      >
                        {social.icon}
                      </IconButton>
                    ))}
                  </Stack>
                </Stack>
              </motion.div>
            </Grid>

            {/* Quick Links */}
            <Grid item xs={12} sm={6} md={2}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
              >
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: config.theme.primaryColor }}>
                  Links Rápidos
                </Typography>
                <Stack spacing={1}>
                  {quickLinks.map((link) => (
                    <Link
                      key={link.name}
                      href={link.href}
                      underline="none"
                      sx={{
                        color: 'text.secondary',
                        '&:hover': {
                          color: config.theme.primaryColor,
                          transform: 'translateX(4px)',
                        },
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {link.name}
                    </Link>
                  ))}
                </Stack>
              </motion.div>
            </Grid>

            {/* Services */}
            <Grid item xs={12} sm={6} md={3}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: config.theme.primaryColor }}>
                  Nossos Serviços
                </Typography>
                <Stack spacing={1}>
                  {services.map((service) => (
                    <Stack key={service.name} direction="row" alignItems="center" spacing={1}>
                      <Box sx={{ color: config.theme.primaryColor, fontSize: 16 }}>
                        {service.icon}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {service.name}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </motion.div>
            </Grid>

            {/* Trust Badges */}
            <Grid item xs={12} md={3}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                viewport={{ once: true }}
              >
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: config.theme.primaryColor }}>
                  Confiança & Segurança
                </Typography>
                <Stack spacing={2}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Security sx={{ color: config.theme.primaryColor }} />
                    <Typography variant="body2">
                      Transações 100% Seguras
                    </Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Schedule sx={{ color: config.theme.primaryColor }} />
                    <Typography variant="body2">
                      Suporte 24/7
                    </Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Verified sx={{ color: config.theme.primaryColor }} />
                    <Typography variant="body2">
                      Imóveis Verificados
                    </Typography>
                  </Stack>

                  {/* Statistics */}
                  <Box sx={{ mt: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Paper
                          sx={{
                            p: 2,
                            textAlign: 'center',
                            bgcolor: alpha(config.theme.primaryColor, 0.05),
                            borderRadius: 2,
                          }}
                        >
                          <Typography variant="h6" fontWeight={700} color={config.theme.primaryColor}>
                            500+
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Clientes Satisfeitos
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6}>
                        <Paper
                          sx={{
                            p: 2,
                            textAlign: 'center',
                            bgcolor: alpha(config.theme.accentColor, 0.05),
                            borderRadius: 2,
                          }}
                        >
                          <Typography variant="h6" fontWeight={700} color={config.theme.accentColor}>
                            4.9★
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Avaliação Média
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>
                </Stack>
              </motion.div>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 4, borderColor: alpha(theme.palette.divider, 0.1) }} />

        {/* Bottom Footer */}
        <Box sx={{ py: 3 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Typography variant="body2" color="text.secondary">
                © 2024 {config.contactInfo.businessName}. Todos os direitos reservados.
              </Typography>
              <Chip
                label="Powered by LocAI"
                size="small"
                sx={{
                  bgcolor: alpha(config.theme.primaryColor, 0.1),
                  color: config.theme.primaryColor,
                  fontWeight: 600,
                }}
              />
            </Stack>

            <Stack direction="row" alignItems="center" spacing={2}>
              <Typography variant="body2" color="text.secondary">
                CRECI: 12345-SP
              </Typography>
              {onScrollTop && (
                <IconButton
                  onClick={onScrollTop}
                  sx={{
                    bgcolor: alpha(config.theme.primaryColor, 0.1),
                    color: config.theme.primaryColor,
                    '&:hover': {
                      bgcolor: config.theme.primaryColor,
                      color: 'white',
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  <KeyboardArrowUp />
                </IconButton>
              )}
            </Stack>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}