// components/organisms/PropertyPricing/PropertyPricing.tsx
import React from 'react'
import {
  Box,
  Grid,
  Paper,
  useTheme,
  alpha,
  InputAdornment,
  Divider,
  Chip
} from '@mui/material'
import { FormField, SelectField } from '@/components/molecules'
import { Typography } from '@/components/atoms'
import { 
  AttachMoney, 
  TrendingUp,
  CleaningServices,
  Group,
  Schedule,
  Payment,
  Info
} from '@mui/icons-material'
import { 
  PaymentMethod, 
  PAYMENT_METHODS_LABELS 
} from '@/lib/types/property'

export const PropertyPricing: React.FC = () => {
  const theme = useTheme()

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h5" 
          component="h2" 
          gutterBottom
          sx={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: theme.palette.primary.main 
          }}
        >
          <AttachMoney />
          Preços e Políticas
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure os valores e regras de reserva do seu imóvel
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 3,
              background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.05)} 0%, ${alpha(theme.palette.success.main, 0.1)} 100%)`,
              border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TrendingUp sx={{ mr: 1, color: theme.palette.success.main }} />
              <Typography variant="h6">Preço Base</Typography>
              <Chip 
                label="Obrigatório" 
                size="small" 
                color="success" 
                sx={{ ml: 'auto' }}
              />
            </Box>
            
            <FormField
              name="basePrice"
              label="Preço por noite"
              type="number"
              required
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
              }}
              helperText="Este será o preço padrão por noite. Você pode personalizar preços específicos no calendário."
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: theme.palette.background.paper,
                  fontSize: '1.2rem',
                  fontWeight: 600,
                },
              }}
            />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 3,
              background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.05)} 0%, ${alpha(theme.palette.info.main, 0.1)} 100%)`,
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Group sx={{ mr: 1, color: theme.palette.info.main }} />
              <Typography variant="h6">Hóspede Extra</Typography>
              <Chip 
                label="Opcional" 
                size="small" 
                color="info" 
                variant="outlined"
                sx={{ ml: 'auto' }}
              />
            </Box>
            
            <FormField
              name="pricePerExtraGuest"
              label="Preço por hóspede extra/noite"
              type="number"
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
              }}
              helperText="Cobrança adicional por hóspede que exceder a capacidade base."
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: theme.palette.background.paper,
                },
              }}
            />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 3,
              background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.05)} 0%, ${alpha(theme.palette.warning.main, 0.1)} 100%)`,
              border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CleaningServices sx={{ mr: 1, color: theme.palette.warning.main }} />
              <Typography variant="h6">Taxa de Limpeza</Typography>
              <Chip 
                label="Recomendado" 
                size="small" 
                color="warning" 
                sx={{ ml: 'auto' }}
              />
            </Box>
            
            <FormField
              name="cleaningFee"
              label="Taxa única por reserva"
              type="number"
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
              }}
              helperText="Taxa cobrada uma vez por reserva para limpeza e preparação do imóvel."
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: theme.palette.background.paper,
                },
              }}
            />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 3,
              background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
              border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Schedule sx={{ mr: 1, color: theme.palette.secondary.main }} />
              <Typography variant="h6">Estadia Mínima</Typography>
              <Chip 
                label="Obrigatório" 
                size="small" 
                color="secondary" 
                sx={{ ml: 'auto' }}
              />
            </Box>
            
            <FormField
              name="minimumNights"
              label="Número mínimo de noites"
              type="number"
              required
              InputProps={{
                endAdornment: <InputAdornment position="end">noites</InputAdornment>,
              }}
              helperText="Número mínimo de noites que o hóspede deve reservar."
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: theme.palette.background.paper,
                },
              }}
            />
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 2 }}>
            <Chip 
              icon={<Payment />} 
              label="Formas de Pagamento" 
              color="primary"
            />
          </Divider>
        </Grid>

        {Object.entries(PAYMENT_METHODS_LABELS).map(([method, label]) => (
          <Grid item xs={12} sm={6} md={3} key={method}>
            <Paper 
              sx={{ 
                p: 2,
                textAlign: 'center',
                borderRadius: 2,
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: theme.shadows[4],
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                {label}
              </Typography>
              <FormField
                name={`paymentMethodSurcharges.${method}`}
                label="Acréscimo (%)"
                type="number"
                size="small"
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
                helperText="0% = sem acréscimo"
                sx={{
                  '& .MuiInputLabel-root': {
                    fontSize: '0.75rem',
                  },
                }}
              />
            </Paper>
          </Grid>
        ))}

        <Grid item xs={12}>
          <Paper 
            sx={{ 
              p: 3,
              backgroundColor: alpha(theme.palette.info.main, 0.05),
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Info sx={{ mr: 1, color: theme.palette.info.main }} />
              <Typography variant="h6" sx={{ color: theme.palette.info.main }}>
                💰 Dicas de Precificação
              </Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    Pesquise preços de imóveis similares na sua região
                  </Typography>
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    Considere ajustar preços para fins de semana e feriados
                  </Typography>
                  <Typography component="li" variant="body2">
                    Uma taxa de limpeza adequada está entre R$ 50-150
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    Estadia mínima de 2-3 noites reduz rotatividade
                  </Typography>
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    PIX normalmente tem desconto (0-5% menos)
                  </Typography>
                  <Typography component="li" variant="body2">
                    Cartão pode ter acréscimo (2-5% mais)
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}