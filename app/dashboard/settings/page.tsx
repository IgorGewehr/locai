'use client';

import { useRouter } from 'next/navigation';
import { Box, Typography, Grid } from '@mui/material';
import {
  Business as BusinessIcon,
  WhatsApp as WhatsAppIcon,
  SmartToy as SmartToyIcon,
  Person as PersonIcon,
} from '@mui/icons-material';

/**
 * SETTINGS LANDING
 *
 * Minimalist card grid linking only to the settings that still make sense for
 * AlugaZap. The AI (Sofia) only answers, qualifies, classifies leads, shows
 * properties and schedules visits — it no longer closes deals or charges
 * clients, so payment/billing/negotiation/discount settings were removed.
 */

interface SettingsCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
}

const SETTINGS_CARDS: SettingsCard[] = [
  {
    id: 'company',
    title: 'Empresa',
    description: 'Dados da imobiliária, contato e endereço.',
    icon: <BusinessIcon sx={{ fontSize: 26 }} />,
    path: '/dashboard/settings/company',
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp',
    description: 'Conexão e integração do número de atendimento.',
    icon: <WhatsAppIcon sx={{ fontSize: 26 }} />,
    path: '/dashboard/settings/whatsapp',
  },
  {
    id: 'ai-config',
    title: 'Inteligência Artificial',
    description: 'Comportamento e personalidade da Sofia.',
    icon: <SmartToyIcon sx={{ fontSize: 26 }} />,
    path: '/dashboard/settings/ai-config',
  },
  {
    id: 'profile',
    title: 'Perfil',
    description: 'Conta do usuário, senha e métodos de login.',
    icon: <PersonIcon sx={{ fontSize: 26 }} />,
    path: '/dashboard/settings/profile',
  },
];

export default function SettingsPage() {
  const router = useRouter();

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h5"
          fontWeight={700}
          sx={{ color: '#f1f5f9', mb: 0.5 }}
        >
          Configurações
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          Gerencie a conta, a empresa e o comportamento da Sofia.
        </Typography>
      </Box>

      <Grid container spacing={2.5}>
        {SETTINGS_CARDS.map((card) => (
          <Grid item xs={12} sm={6} md={4} key={card.id}>
            <Box
              role="button"
              tabIndex={0}
              onClick={() => router.push(card.path)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  router.push(card.path);
                }
              }}
              sx={{
                height: '100%',
                p: 3,
                cursor: 'pointer',
                borderRadius: '14px',
                bgcolor: '#111827',
                border: '1px solid rgba(255,255,255,0.08)',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                outline: 'none',
                '&:hover, &:focus-visible': {
                  borderColor: 'rgba(220,38,38,0.5)',
                  bgcolor: 'rgba(220,38,38,0.06)',
                  transform: 'translateY(-2px)',
                  '& .settings-card-icon': {
                    color: '#f87171',
                    borderColor: 'rgba(220,38,38,0.5)',
                  },
                },
              }}
            >
              <Box
                className="settings-card-icon"
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#dc2626',
                  border: '1px solid rgba(255,255,255,0.08)',
                  bgcolor: 'rgba(220,38,38,0.08)',
                  transition: 'all 0.2s ease',
                }}
              >
                {card.icon}
              </Box>

              <Typography
                variant="subtitle1"
                fontWeight={600}
                sx={{ color: '#f1f5f9' }}
              >
                {card.title}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}
              >
                {card.description}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
